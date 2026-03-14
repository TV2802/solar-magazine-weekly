// ============================================================
// learn-state-keywords — v1
// Date: March 2026
//
// PURPOSE:
//   Weekly learning job. Analyzes which keywords appear
//   disproportionately in articles that users engage with
//   (open, thumbs up, save) and updates weights in the
//   state_keywords table accordingly.
//
//   Over time this makes state detection smarter — keywords
//   that consistently predict the right state get higher
//   weights, weak predictors get lower weights.
//
// SCHEDULE:
//   Run weekly — trigger via Supabase cron or manual invoke.
//   Safe to run manually at any time.
//
// SAFETY RULES (never violated):
//   1. is_locked = true rows are NEVER modified
//   2. Weight never drops more than 0.05 per run
//   3. Weight never goes below 0.20 (floor)
//   4. Weight never goes above 0.99 (ceiling)
//   5. Keywords with article_count < MIN_ARTICLES_FOR_LEARNING
//      are skipped — not enough data yet
//
// TO ADJUST LEARNING SPEED:
//   Raise LEARNING_RATE to learn faster (more volatile)
//   Lower it to learn slower (more stable)
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────
const CONFIG = {
  // Only learn from articles in this window
  LEARNING_WINDOW_DAYS: 30,

  // Skip keywords with fewer article matches than this
  // Prevents over-fitting on rare keywords
  MIN_ARTICLES_FOR_LEARNING: 5,

  // How aggressively to update weights per run
  // 0.05 = gentle, 0.10 = moderate, 0.20 = aggressive
  LEARNING_RATE: 0.05,

  // Hard floor and ceiling on weights
  WEIGHT_FLOOR: 0.20,
  WEIGHT_CEILING: 0.99,

  // Engagement signals, in order of strength
  // Views count least, thumbs up counts most
  ENGAGEMENT_WEIGHTS: {
    view: 1,
    save: 3,
    thumbs_up: 5,
  },

  // Confidence threshold — what fraction of a keyword's
  // matched articles must be from the tagged state for us
  // to consider it a reliable signal
  SIGNAL_THRESHOLD: 0.65,
};

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────
function clamp(val: number, min: number, max: number): number {
  return Math.min(Math.max(val, min), max);
}

// ─────────────────────────────────────────
// MAIN HANDLER
// ─────────────────────────────────────────
Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const runAt = new Date().toISOString();
  const updates: { keyword: string; state: string; old_weight: number; new_weight: number }[] = [];
  const skipped: string[] = [];

  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - CONFIG.LEARNING_WINDOW_DAYS);

    // ── 1. Load all unlocked keywords ────────────────────────
    const { data: keywords, error: kwError } = await supabase
      .from("state_keywords")
      .select("id, keyword, state, weight, article_count, is_locked")
      .eq("is_locked", false)
      .gte("article_count", CONFIG.MIN_ARTICLES_FOR_LEARNING);

    if (kwError) throw kwError;
    if (!keywords || keywords.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No learnable keywords yet", updates: [] }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // ── 2. Load recent engaged articles ──────────────────────
    // Get articles with any engagement signal in learning window
    const { data: engagedArticles } = await supabase
      .from("articles")
      .select("id, title, summary, states")
      .gte("created_at", cutoff.toISOString())
      .not("states", "eq", "{}");

    if (!engagedArticles || engagedArticles.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No engaged articles in window yet", updates: [] }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // ── 3. Load engagement signals ────────────────────────────
    const articleIds = engagedArticles.map((a: any) => a.id);

    const { data: feedback } = await supabase
      .from("article_feedback")
      .select("article_id, vote")
      .in("article_id", articleIds);

    const { data: saves } = await supabase
      .from("saved_articles")
      .select("article_id")
      .in("article_id", articleIds);

    // Build engagement score per article
    const engagementScores: Record<string, number> = {};

    for (const f of feedback || []) {
      if (f.vote === "up") {
        engagementScores[f.article_id] = (engagementScores[f.article_id] || 0) + CONFIG.ENGAGEMENT_WEIGHTS.thumbs_up;
      }
    }
    for (const s of saves || []) {
      engagementScores[s.article_id] = (engagementScores[s.article_id] || 0) + CONFIG.ENGAGEMENT_WEIGHTS.save;
    }
    // All articles with states get at least view weight
    for (const a of engagedArticles) {
      if (!engagementScores[a.id]) {
        engagementScores[a.id] = CONFIG.ENGAGEMENT_WEIGHTS.view;
      }
    }

    // ── 4. Analyze keyword signal strength ───────────────────
    // For each keyword, look at all articles it matches.
    // If keyword reliably predicts the right state in engaged
    // articles, increase weight. If not, decrease slightly.

    for (const kw of keywords) {
      const kwLower = kw.keyword.toLowerCase();

      // Find all engaged articles this keyword appears in
      const matchedArticles = engagedArticles.filter((a: any) => {
        const text = `${a.title} ${a.summary}`.toLowerCase();
        return text.includes(kwLower);
      });

      if (matchedArticles.length < CONFIG.MIN_ARTICLES_FOR_LEARNING) {
        skipped.push(`${kw.keyword} (${kw.state}) — only ${matchedArticles.length} matches`);
        continue;
      }

      // Of matched articles, how many are tagged with this state?
      const correctlyTagged = matchedArticles.filter((a: any) =>
        Array.isArray(a.states) && a.states.includes(kw.state)
      );

      const signalStrength = correctlyTagged.length / matchedArticles.length;

      // Weight engagement — correct state matches with high
      // engagement should boost the keyword more
      const engagedCorrect = correctlyTagged.reduce((sum: number, a: any) =>
        sum + (engagementScores[a.id] || 1), 0
      );
      const engagedTotal = matchedArticles.reduce((sum: number, a: any) =>
        sum + (engagementScores[a.id] || 1), 0
      );
      const engagedSignal = engagedTotal > 0 ? engagedCorrect / engagedTotal : 0;

      // Blend raw signal with engagement-weighted signal
      const blendedSignal = (signalStrength * 0.4) + (engagedSignal * 0.6);

      let newWeight = kw.weight;

      if (blendedSignal >= CONFIG.SIGNAL_THRESHOLD) {
        // Keyword is a reliable predictor — nudge weight up
        newWeight = clamp(
          kw.weight + CONFIG.LEARNING_RATE * blendedSignal,
          CONFIG.WEIGHT_FLOOR,
          CONFIG.WEIGHT_CEILING
        );
      } else {
        // Keyword is noisy — nudge weight down gently
        newWeight = clamp(
          kw.weight - CONFIG.LEARNING_RATE * (1 - blendedSignal),
          CONFIG.WEIGHT_FLOOR,
          CONFIG.WEIGHT_CEILING
        );
      }

      // Only update if weight actually changed meaningfully
      if (Math.abs(newWeight - kw.weight) >= 0.005) {
        await supabase
          .from("state_keywords")
          .update({ weight: newWeight })
          .eq("id", kw.id);

        updates.push({
          keyword: kw.keyword,
          state: kw.state,
          old_weight: kw.weight,
          new_weight: Number(newWeight.toFixed(3)),
        });
      }
    }

    // ── 5. Log the learning run ───────────────────────────────
    // Store results so you can see what the system learned
    // over time. Check this table monthly to see which
    // keywords are trending up or down.
    await supabase.from("fetch_logs").insert({
      run_at: runAt,
      articles_fetched: engagedArticles.length,
      articles_published: 0,
      articles_rejected: 0,
      status: "learning_run",
      errors: skipped.length > 0 ? skipped : null,
    });

    return new Response(
      JSON.stringify({
        success: true,
        keywords_analyzed: keywords.length,
        keywords_updated: updates.length,
        keywords_skipped: skipped.length,
        articles_in_window: engagedArticles.length,
        updates,
      }),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
