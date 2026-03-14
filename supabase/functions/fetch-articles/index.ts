// ============================================================
// fetch-articles — v4
// Date: March 2026
//
// CHANGELOG v4:
//   - Added state detection using state_keywords table
//   - Keywords loaded once per invocation (not per article)
//   - Articles tagged with states[] array
//   - All config at top of file for easy editing
//
// TO ADD A NEW STATE:
//   1. Add seed keywords to state_keywords table via SQL
//   2. Add state abbr to TRACKED_STATES array below
//   That's it — detection is automatic from the DB
//
// TO ADJUST DETECTION SENSITIVITY:
//   - Raise STATE_CONFIDENCE_THRESHOLD to require stronger signal
//   - Lower it to tag more articles (more false positives)
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { DOMParser } from "https://deno.land/x/deno_dom/deno-dom-wasm.ts";

// ─────────────────────────────────────────
// CONFIG — edit this section freely
// ─────────────────────────────────────────
const CONFIG = {
  // States we track. Add new state abbr here when expanding.
  TRACKED_STATES: ["CA", "NY", "TX", "MA", "NJ", "CO"],

  // Minimum weighted score for a state to be tagged on an article.
  // 0.60 = at least one strong keyword OR two moderate ones.
  // Raise to 0.75 to be more conservative.
  STATE_CONFIDENCE_THRESHOLD: 0.60,

  // Maximum articles to keep per issue
  MAX_ARTICLES: 80,

  // Minimum relevance score to publish an article
  MIN_RELEVANCE_SCORE: 30,

  // How many days back to check for duplicates
  DEDUP_WINDOW_DAYS: 14,

  // Sources — add/remove feeds here
  SOURCES: [
    { url: "https://www.pv-magazine-usa.com/feed/",          name: "PV Magazine USA" },
    { url: "https://www.solarpowerworldonline.com/feed/",    name: "Solar Power World" },
    { url: "https://www.energystoragenews.com/feed/",        name: "Energy Storage News" },
    { url: "https://canary.media/feed/",                     name: "Canary Media" },
    { url: "https://www.utilitydive.com/feeds/news/",        name: "Utility Dive" },
  ],

  // Must contain at least one of these to pass relevance gate
  RELEVANCE_REQUIRED: [
    "solar","storage","battery","bess","der","distributed",
    "rooftop","multifamily","residential","behind-the-meter",
    "microgrid","vpp","itc","net metering","interconnection",
    "photovoltaic","pv system","clean energy","renewable",
  ],

  // Reject if title contains any of these
  BLOCKLIST_TITLE: [
    "electric vehicle","electric car","ev charging","ev battery",
    " ev ","tesla model","rivian","lucid motors","ford f-150",
    "volkswagen","toyota","honda","gm electric","chevy bolt",
    "wind turbine offshore","offshore wind farm",
  ],

  // Reject if article mentions a non-US geography in title/summary
  GEO_BLOCKLIST: [
    "australia","canada","united kingdom"," uk ","germany","china",
    "india","brazil","europe","romania","france","japan","south korea",
    "mexico","netherlands","spain","italy","poland","denmark","sweden",
  ],

  // +20 score boost for multifamily/DG-specific keywords
  BOOST_KEYWORDS: [
    "multifamily","rooftop","behind-the-meter","vpp","sgip",
    "nem","net metering","interconnection","distributed generation",
    "community solar","virtual net metering","low-income solar",
    "affordable housing solar","bess","residential solar","c&i solar",
  ],
};

// ─────────────────────────────────────────
// STATE DETECTION
// Loaded from DB once, used for all articles
// ─────────────────────────────────────────
interface StateKeyword {
  keyword: string;
  state: string;
  weight: number;
}

function detectStates(
  title: string,
  summary: string,
  keywords: StateKeyword[],
  threshold: number
): string[] {
  const text = `${title} ${summary}`.toLowerCase();

  // Accumulate weighted score per state
  const scores: Record<string, number> = {};

  for (const kw of keywords) {
    if (text.includes(kw.keyword.toLowerCase())) {
      scores[kw.state] = (scores[kw.state] || 0) + kw.weight;
    }
  }

  // Return states that cross the confidence threshold
  return Object.entries(scores)
    .filter(([_, score]) => score >= threshold)
    .map(([state]) => state);
}

// ─────────────────────────────────────────
// RELEVANCE SCORING
// ─────────────────────────────────────────
function scoreArticle(title: string, summary: string): number {
  const text = `${title} ${summary}`.toLowerCase();
  let score = 50; // base score

  // Boost for DG-specific keywords
  for (const kw of CONFIG.BOOST_KEYWORDS) {
    if (text.includes(kw)) score += 20;
  }

  // Penalize vague/generic content
  if (text.includes("opinion:")) score -= 10;
  if (text.includes("podcast")) score -= 15;
  if (text.includes("webinar")) score -= 10;

  return Math.min(score, 100);
}

function isRelevant(title: string, summary: string): boolean {
  const text = `${title} ${summary}`.toLowerCase();

  // Must contain at least one relevance keyword
  const hasRelevance = CONFIG.RELEVANCE_REQUIRED.some(kw => text.includes(kw));
  if (!hasRelevance) return false;

  // Reject blocklisted title keywords
  const titleLower = title.toLowerCase();
  if (CONFIG.BLOCKLIST_TITLE.some(kw => titleLower.includes(kw))) return false;

  // Reject non-US geography
  if (CONFIG.GEO_BLOCKLIST.some(kw => text.includes(kw))) return false;

  return true;
}

// ─────────────────────────────────────────
// HTML STRIPPING — robust multi-pass
// ─────────────────────────────────────────
function stripHtml(raw: string): string {
  return raw
    // Remove CDATA wrappers
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    // Remove all HTML tags (including self-closing, multi-line)
    .replace(/<[^>]*>/gs, "")
    // Decode common HTML entities
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#8217;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#8211;/g, "–")
    .replace(/&#8212;/g, "—")
    // Catch remaining numeric/named entities
    .replace(/&#\d+;/g, " ")
    .replace(/&[a-zA-Z]+;/g, " ")
    // Collapse whitespace
    .replace(/\s+/g, " ")
    .trim();
}

// ─────────────────────────────────────────
// RSS PARSING
// ─────────────────────────────────────────
async function fetchFeed(url: string, sourceName: string) {
  const res = await fetch(url, {
    headers: { "User-Agent": "EnergyPulse/1.0 RSS Reader" },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);

  const xml = await res.text();
  const doc = new DOMParser().parseFromString(xml, "text/html");
  if (!doc) throw new Error(`Failed to parse XML from ${url}`);

  const items = doc.querySelectorAll("item");
  const articles = [];

  for (const item of items) {
    const title   = stripHtml(item.querySelector("title")?.textContent?.trim() || "");
    const link    = item.querySelector("link")?.textContent?.trim() || "";
    const rawDesc = item.querySelector("description")?.textContent || "";
    const summary = stripHtml(rawDesc);
    const pubDate = item.querySelector("pubDate")?.textContent?.trim() || "";
    const image   = item.querySelector("enclosure")?.getAttribute("url") ||
                    item.querySelector("image url")?.textContent?.trim() || null;

    if (!title || !link) continue;

    articles.push({
      title,
      source_url: link,
      summary: summary.slice(0, 500),
      source_name: sourceName,
      image_url: image,
      published_at: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
    });
  }

  return articles;
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
  let fetched = 0, published = 0, rejected = 0;
  const errors: string[] = [];

  try {
    // ── 1. Load state keywords from DB once ──────────────────
    // This is loaded ONCE per function run, not per article.
    // All 79 keywords loaded in a single query.
    const { data: stateKeywords, error: kwError } = await supabase
      .from("state_keywords")
      .select("keyword, state, weight")
      .order("weight", { ascending: false });

    if (kwError) {
      errors.push(`state_keywords load failed: ${kwError.message}`);
    }

    const keywords: StateKeyword[] = stateKeywords || [];

    // ── 2. Get or create current issue ───────────────────────
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    let { data: issue } = await supabase
      .from("issues")
      .select("id, issue_number")
      .gte("week_start", weekStart.toISOString())
      .single();

    if (!issue) {
      const { data: lastIssue } = await supabase
        .from("issues")
        .select("issue_number")
        .order("issue_number", { ascending: false })
        .limit(1)
        .single();

      const nextNumber = (lastIssue?.issue_number || 0) + 1;

      const { data: newIssue } = await supabase
        .from("issues")
        .insert({
          issue_number: nextNumber,
          week_start: weekStart.toISOString(),
          week_end: weekEnd.toISOString(),
        })
        .select("id, issue_number")
        .single();

      issue = newIssue;
    }

    if (!issue) throw new Error("Could not create or find issue");

    // ── 3. Load recent URLs for deduplication ─────────────────
    const dedupCutoff = new Date();
    dedupCutoff.setDate(dedupCutoff.getDate() - CONFIG.DEDUP_WINDOW_DAYS);

    const { data: recentArticles } = await supabase
      .from("articles")
      .select("source_url")
      .gte("created_at", dedupCutoff.toISOString());

    const existingUrls = new Set((recentArticles || []).map((a: any) => a.source_url));

    // Also load recent titles for same-issue title dedup
    const { data: issueTitles } = await supabase
      .from("articles")
      .select("title")
      .eq("issue_id", issue.id);
    const existingTitles = new Set((issueTitles || []).map((a: any) => a.title.toLowerCase().trim()));

    // ── 4. Fetch all feeds ────────────────────────────────────
    const allArticles = [];

    const feedResults = await Promise.allSettled(
      CONFIG.SOURCES.map(source => fetchFeed(source.url, source.name))
    );

    for (let i = 0; i < feedResults.length; i++) {
      const result = feedResults[i];
      if (result.status === "fulfilled") {
        allArticles.push(...result.value);
        fetched += result.value.length;
      } else {
        errors.push(`Error fetching ${CONFIG.SOURCES[i].url}: ${result.reason}`);
      }
    }

    // ── 5. Filter, score, detect states, dedup by title ──────
    const toInsert = [];
    const seenTitles = new Set(existingTitles);

    for (const article of allArticles) {
      // Skip duplicates
      if (existingUrls.has(article.source_url)) continue;

      // Relevance gate
      if (!isRelevant(article.title, article.summary)) {
        rejected++;
        continue;
      }

      // Score
      const relevance_score = scoreArticle(article.title, article.summary);
      if (relevance_score < CONFIG.MIN_RELEVANCE_SCORE) {
        rejected++;
        continue;
      }

      // Detect states — the smart part
      const states = keywords.length > 0
        ? detectStates(
            article.title,
            article.summary,
            keywords,
            CONFIG.STATE_CONFIDENCE_THRESHOLD
          )
        : [];

      // Derive topic from source + keywords
      const text = `${article.title} ${article.summary}`.toLowerCase();
      let topic = "Industry News";
      if (text.includes("storage") || text.includes("bess") || text.includes("battery")) topic = "Energy Storage";
      else if (text.includes("policy") || text.includes("regulation") || text.includes("cpuc") || text.includes("ferc")) topic = "Policy & Regulation";
      else if (text.includes("finance") || text.includes("funding") || text.includes("investment") || text.includes("itc")) topic = "Finance & Incentives";
      else if (text.includes("solar")) topic = "Solar";
      else if (text.includes("grid") || text.includes("utility") || text.includes("interconnection")) topic = "Grid & Utilities";

      toInsert.push({
        issue_id: issue.id,
        title: article.title,
        summary: article.summary,
        source_url: article.source_url,
        source_name: article.source_name,
        image_url: article.image_url,
        topic,
        published_at: article.published_at,
        relevance_score,
        states,           // ← new field: string[]
        is_featured: relevance_score >= 80,
      });

      existingUrls.add(article.source_url);
    }

    // Sort by relevance, cap at MAX_ARTICLES
    toInsert.sort((a, b) => b.relevance_score - a.relevance_score);
    const finalArticles = toInsert.slice(0, CONFIG.MAX_ARTICLES);

    // ── 6. Insert articles ────────────────────────────────────
    if (finalArticles.length > 0) {
      const { error: insertError } = await supabase
        .from("articles")
        .upsert(finalArticles, { onConflict: "source_url" });

      if (insertError) throw insertError;
      published = finalArticles.length;
    }

    // ── 7. Update keyword article_count ──────────────────────
    // Increment count for every keyword that matched at least one article.
    // The learn function uses this to avoid over-fitting low-volume keywords.
    const matchedKeywords = new Set<string>();
    for (const article of finalArticles) {
      const text = `${article.title} ${article.summary}`.toLowerCase();
      for (const kw of keywords) {
        if (text.includes(kw.keyword.toLowerCase())) {
          matchedKeywords.add(`${kw.keyword}||${kw.state}`);
        }
      }
    }

    for (const key of matchedKeywords) {
      const [keyword, state] = key.split("||");
      await supabase
        .from("state_keywords")
        .update({ article_count: supabase.rpc("increment", { x: 1 }) })
        .eq("keyword", keyword)
        .eq("state", state);
    }

    // ── 8. Log the run ────────────────────────────────────────
    await supabase.from("fetch_logs").insert({
      run_at: runAt,
      articles_fetched: fetched,
      articles_published: published,
      articles_rejected: rejected,
      status: errors.length === 0 ? "success" : "partial",
      errors: errors.length > 0 ? errors : null,
    });

    // ── 9. Trigger digest generation ─────────────────────────
    if (published > 0) {
      supabase.functions.invoke("generate-digest", {
        body: { issue_id: issue.id },
      }).catch(() => {});
    }

    return new Response(
      JSON.stringify({
        success: true,
        issue_number: issue.issue_number,
        fetched,
        published,
        rejected,
        states_detected: finalArticles.filter(a => a.states.length > 0).length,
        errors,
      }),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    await supabase.from("fetch_logs").insert({
      run_at: runAt,
      articles_fetched: fetched,
      articles_published: 0,
      articles_rejected: rejected,
      status: "error",
      errors: [err.message],
    }).catch(() => {});

    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
