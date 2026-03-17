// ============================================================
// fetch-articles — v5
// Date: March 2026
//
// CHANGELOG v5:
//   - Replaced single `topic` field with `tags` text[] array
//   - Tags assigned via keyword matching (Solar, BESS, Policy, etc.)
//   - State tags (California, New York, etc.) also added to tags
//   - Topic field still set for backward compat but tags is primary
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { DOMParser } from "https://deno.land/x/deno_dom/deno-dom-wasm.ts";

const CONFIG = {
  TRACKED_STATES: ["CA", "NY", "TX", "MA", "NJ", "CO"],
  STATE_CONFIDENCE_THRESHOLD: 0.60,
  MAX_ARTICLES: 80,
  MIN_RELEVANCE_SCORE: 30,
  DEDUP_WINDOW_DAYS: 14,

  SOURCES: [
    { url: "https://www.pv-magazine-usa.com/feed/",          name: "PV Magazine USA" },
    { url: "https://www.solarpowerworldonline.com/feed/",    name: "Solar Power World" },
    { url: "https://www.energystoragenews.com/feed/",        name: "Energy Storage News" },
    { url: "https://canary.media/feed/",                     name: "Canary Media" },
    { url: "https://www.utilitydive.com/feeds/news/",        name: "Utility Dive" },
  ],

  RELEVANCE_REQUIRED: [
    "solar","storage","battery","bess","der","distributed",
    "rooftop","multifamily","residential","behind-the-meter",
    "microgrid","vpp","itc","net metering","interconnection",
    "photovoltaic","pv system","clean energy","renewable",
  ],

  BLOCKLIST_TITLE: [
    "electric vehicle","electric car","ev charging","ev battery",
    " ev ","tesla model","rivian","lucid motors","ford f-150",
    "volkswagen","toyota","honda","gm electric","chevy bolt",
    "wind turbine offshore","offshore wind farm",
  ],

  GEO_BLOCKLIST: [
    "australia","canada","united kingdom"," uk ","germany","china",
    "india","brazil","europe","romania","france","japan","south korea",
    "mexico","netherlands","spain","italy","poland","denmark","sweden",
  ],

  BOOST_KEYWORDS: [
    "multifamily","rooftop","behind-the-meter","vpp","sgip",
    "nem","net metering","interconnection","distributed generation",
    "community solar","virtual net metering","low-income solar",
    "affordable housing solar","bess","residential solar","c&i solar",
  ],

  // Tag detection rules: keyword -> tag name
  TAG_RULES: [
    { keywords: ["solar","photovoltaic","pv system","pv module","rooftop solar","community solar","residential solar","c&i solar"], tag: "Solar" },
    { keywords: ["bess","battery","energy storage","storage system","lithium"], tag: "BESS" },
    { keywords: ["policy","regulation","mandate","legislature","bill","law","ruling"], tag: "Policy" },
    { keywords: ["incentive","rebate","tax credit","credit program","grant","subsidy"], tag: "Incentives" },
    { keywords: ["interconnection","queue","grid connection","utility connection"], tag: "Interconnection" },
    { keywords: ["nem","net metering","net energy metering","virtual net metering"], tag: "NEM" },
    { keywords: ["sgip","self-generation"], tag: "SGIP" },
    { keywords: ["itc","investment tax credit","production tax credit","ptc","45x","48e"], tag: "ITC" },
    { keywords: ["multifamily","apartment","affordable housing","low-income","tenant"], tag: "Multifamily" },
    { keywords: ["vpp","virtual power plant","demand response","flexibility"], tag: "VPP" },
    { keywords: ["utility","utilities","sce","pg&e","pge","sdge","conedison","duke energy","dominion","xcel"], tag: "Utilities" },
    { keywords: ["financing","finance","loan","ppa","lease","tax equity","capital"], tag: "Financing" },
    { keywords: ["grid","transmission","distribution","microgrid","islanding"], tag: "Grid" },
    { keywords: ["federal","doe","department of energy","ferc","epa","ira","inflation reduction act","white house","congress"], tag: "Federal" },
    { keywords: ["inverter","module","panel","racking","tracker","optimizer"], tag: "Equipment" },
    { keywords: ["cpuc","california","cal "], tag: "California" },
    { keywords: ["new york","nyserda","ny-sun","conedison"], tag: "New York" },
    { keywords: ["texas","ercot"], tag: "Texas" },
    { keywords: ["massachusetts","masssave","mass cec"], tag: "Massachusetts" },
    { keywords: ["colorado","xcel energy","colo "], tag: "Colorado" },
    { keywords: ["new jersey","njbpu","trec","srec"], tag: "New Jersey" },
  ] as { keywords: string[]; tag: string }[],
};

// State keyword detection (from DB)
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
  const scores: Record<string, number> = {};
  for (const kw of keywords) {
    if (text.includes(kw.keyword.toLowerCase())) {
      scores[kw.state] = (scores[kw.state] || 0) + kw.weight;
    }
  }
  return Object.entries(scores)
    .filter(([_, score]) => score >= threshold)
    .map(([state]) => state);
}

// Tag detection from text
function detectTags(title: string, summary: string): string[] {
  const text = `${title} ${summary}`.toLowerCase();
  const tags: string[] = [];
  for (const rule of CONFIG.TAG_RULES) {
    if (rule.keywords.some(kw => text.includes(kw))) {
      tags.push(rule.tag);
    }
  }
  return [...new Set(tags)];
}

// Derive a single topic for backward compat
function deriveTopic(tags: string[]): string {
  const tagSet = new Set(tags);
  if (tagSet.has("BESS")) return "bess_storage";
  if (tagSet.has("Policy") || tagSet.has("Federal")) return "policy_incentives";
  if (tagSet.has("Multifamily")) return "multifamily_nexus";
  if (tagSet.has("Incentives") || tagSet.has("ITC") || tagSet.has("SGIP")) return "policy_incentives";
  if (tagSet.has("Interconnection") || tagSet.has("Grid")) return "technology_equipment";
  if (tagSet.has("NEM") || tagSet.has("Utilities")) return "market_pricing";
  if (tagSet.has("Financing")) return "market_pricing";
  if (tagSet.has("Equipment")) return "technology_equipment";
  if (tagSet.has("VPP")) return "innovation_spotlight";
  if (tagSet.has("Solar")) return "project_wins";
  return "project_wins";
}

function scoreArticle(title: string, summary: string): number {
  const text = `${title} ${summary}`.toLowerCase();
  let score = 50;
  for (const kw of CONFIG.BOOST_KEYWORDS) {
    if (text.includes(kw)) score += 20;
  }
  if (text.includes("opinion:")) score -= 10;
  if (text.includes("podcast")) score -= 15;
  if (text.includes("webinar")) score -= 10;
  return Math.min(score, 100);
}

function isRelevant(title: string, summary: string): boolean {
  const text = `${title} ${summary}`.toLowerCase();
  const hasRelevance = CONFIG.RELEVANCE_REQUIRED.some(kw => text.includes(kw));
  if (!hasRelevance) return false;
  const titleLower = title.toLowerCase();
  if (CONFIG.BLOCKLIST_TITLE.some(kw => titleLower.includes(kw))) return false;
  if (CONFIG.GEO_BLOCKLIST.some(kw => text.includes(kw))) return false;
  return true;
}

function stripHtml(raw: string): string {
  return raw
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/<[^>]*>/gs, "")
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
    .replace(/&#\d+;/g, " ")
    .replace(/&[a-zA-Z]+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

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
    // 1. Load state keywords
    const { data: stateKeywords, error: kwError } = await supabase
      .from("state_keywords")
      .select("keyword, state, weight")
      .order("weight", { ascending: false });

    if (kwError) errors.push(`state_keywords load failed: ${kwError.message}`);
    const keywords: StateKeyword[] = stateKeywords || [];

    // 2. Get or create current issue
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

    // 3. Load recent URLs + titles for dedup
    const dedupCutoff = new Date();
    dedupCutoff.setDate(dedupCutoff.getDate() - CONFIG.DEDUP_WINDOW_DAYS);

    const { data: recentArticles } = await supabase
      .from("articles")
      .select("source_url")
      .gte("created_at", dedupCutoff.toISOString());
    const existingUrls = new Set((recentArticles || []).map((a: any) => a.source_url));

    const { data: issueTitles } = await supabase
      .from("articles")
      .select("title")
      .eq("issue_id", issue.id);
    const existingTitles = new Set((issueTitles || []).map((a: any) => a.title.toLowerCase().trim()));

    // 4. Fetch all feeds
    const allArticles: any[] = [];
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

    // 5. Filter, score, tag, dedup
    const toInsert = [];
    const seenTitles = new Set(existingTitles);

    for (const article of allArticles) {
      if (existingUrls.has(article.source_url)) continue;

      const titleKey = article.title.toLowerCase().trim();
      if (seenTitles.has(titleKey)) { rejected++; continue; }

      if (!isRelevant(article.title, article.summary)) { rejected++; continue; }

      const relevance_score = scoreArticle(article.title, article.summary);
      if (relevance_score < CONFIG.MIN_RELEVANCE_SCORE) { rejected++; continue; }

      // Detect states (DB keywords)
      const states = keywords.length > 0
        ? detectStates(article.title, article.summary, keywords, CONFIG.STATE_CONFIDENCE_THRESHOLD)
        : [];

      // Detect tags (keyword rules)
      const tags = detectTags(article.title, article.summary);

      // Derive backward-compat topic from tags
      const topic = deriveTopic(tags);

      toInsert.push({
        issue_id: issue.id,
        title: article.title,
        summary: article.summary,
        source_url: article.source_url,
        source_name: article.source_name,
        image_url: article.image_url,
        topic,
        tags,
        published_at: article.published_at,
        relevance_score,
        states,
        is_featured: relevance_score >= 80,
      });

      existingUrls.add(article.source_url);
      seenTitles.add(titleKey);
    }

    toInsert.sort((a, b) => b.relevance_score - a.relevance_score);
    const finalArticles = toInsert.slice(0, CONFIG.MAX_ARTICLES);

    // 6. Insert articles
    if (finalArticles.length > 0) {
      const { error: insertError } = await supabase
        .from("articles")
        .upsert(finalArticles, { onConflict: "source_url" });
      if (insertError) throw insertError;
      published = finalArticles.length;
    }

    // 7. Update keyword article_count
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

    // 8. Log
    await supabase.from("fetch_logs").insert({
      run_at: runAt,
      articles_fetched: fetched,
      articles_published: published,
      articles_rejected: rejected,
      status: errors.length === 0 ? "success" : "partial",
      errors: errors.length > 0 ? errors : null,
    });

    // 9. Trigger digest
    if (published > 0) {
      supabase.functions.invoke("generate-digest", {
        body: { issue_id: issue.id },
      }).catch(() => {});
    }

    // Build tag counts
    const tagCounts: Record<string, number> = {};
    for (const a of finalArticles) {
      for (const t of a.tags) {
        tagCounts[t] = (tagCounts[t] || 0) + 1;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        issue_number: issue.issue_number,
        fetched,
        published,
        rejected,
        tag_counts: tagCounts,
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
