import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FeedSource {
  url: string;
  name: string;
  topics: string[];
  weight: number;
}

// ─────────────────────────────────────────
// CURATED SOURCES — 5 high-signal feeds only
// ─────────────────────────────────────────
const FEEDS: FeedSource[] = [
  {
    url: "https://www.pv-magazine-usa.com/feed/",
    name: "PV Magazine USA",
    topics: ["technology_equipment", "market_pricing", "policy_incentives"],
    weight: 3,
  },
  {
    url: "https://www.solarpowerworldonline.com/feed/",
    name: "Solar Power World",
    topics: ["technology_equipment", "project_wins", "policy_incentives"],
    weight: 3,
  },
  {
    url: "https://www.energystoragenews.com/feed/",
    name: "Energy Storage News",
    topics: ["bess_storage", "market_pricing", "technology_equipment"],
    weight: 3,
  },
  {
    url: "https://canary.media/feed/",
    name: "Canary Media",
    topics: ["policy_incentives", "innovation_spotlight", "bess_storage"],
    weight: 3,
  },
  {
    url: "https://www.utilitydive.com/feeds/news/",
    name: "Utility Dive",
    topics: ["policy_incentives", "market_pricing", "code_compliance"],
    weight: 3,
  },
];

// ─────────────────────────────────────────
// HARD BLOCKLIST — reject any article matching these
// ─────────────────────────────────────────
const BLOCKLIST = [
  // EV / Car content
  "electric vehicle", "electric car", "electric suv", "electric truck",
  "electric bus", "electric bike", "e-bike", "ebike",
  " ev ", "ev charger", "ev sales", "ev registrations",
  "honda", "toyota", "ford f-", "chevy", "chevrolet",
  "volkswagen", "bmw", "mercedes", "audi", "rivian",
  "lucid motors", "fisker", "tesla model", "cybertruck",
  "automobile", "car sales",
  // Non-US geographies
  "australia", "australian", "europe", "european",
  "germany", "german", "france", "french",
  "china", "chinese", "india", "indian",
  "canada", "canadian", "ontario", "alberta",
  "kenya", "africa", "japan", "japanese",
  "brazil", "brazilian", "romania",
  "uk energy", "united kingdom", "britain", "scotland", "ireland",
  "sweden", "norway", "nsw", "queensland", "victoria",
  "au$", "gbp", "act government",
  // Utility scale / not DG
  "gigawatt-scale", "nuclear plant", "coal plant", "gas peaker",
  "lng terminal", "offshore wind farm", "onshore wind farm",
];

// ─────────────────────────────────────────
// RELEVANCE GATE — must mention at least one
// ─────────────────────────────────────────
const RELEVANCE_GATE_KEYWORDS = [
  "solar", "storage", "battery", "bess", "der",
  "distributed", "rooftop", "multifamily", "residential",
  "behind-the-meter", "microgrid", "vpp",
  "itc", "net metering", "interconnection",
];

// ─────────────────────────────────────────
// DG / MULTIFAMILY PRIORITY KEYWORDS — +20 boost
// ─────────────────────────────────────────
const BOOST_KEYWORDS = [
  "multifamily", "residential solar", "rooftop",
  "behind-the-meter", "bess", "vpp",
  "sgip", "nem", "net metering",
  "interconnection", "distributed generation",
];

// ─────────────────────────────────────────
// TOPIC KEYWORDS — weighted toward Multifamily + Policy + BESS
// ─────────────────────────────────────────
const TOPIC_KEYWORDS: Record<string, string[]> = {
  policy_incentives: [
    "ira", "inflation reduction act", "itc", "investment tax credit",
    "tax credit", "sgip", "ny-sun", "smart program", "srec",
    "policy", "incentive", "subsidy", "transferability",
    "domestic content", "low-income", "adder", "bonus credit",
    "interconnection policy", "net metering", "nem", "vnem",
    "virtual net metering", "federal funding", "state incentive",
    "rebate", "grant", "doe loan", "clean energy standard", "rps",
    "community benefit", "lihtc", "new market tax credit",
    "community solar program", "low income housing",
  ],
  technology_equipment: [
    "module", "inverter", "microinverter", "string inverter",
    "hybrid inverter", "solar panel", "efficiency record",
    "cost per watt", "bifacial", "topcon", "heterojunction",
    "smart panel", "load management", "ul certification", "evse",
    "optimizer", "rapid shutdown", "racking", "mounting",
    "metering", "smart meter", "monitoring system", "commissioning",
    "enphase", "sma", "solaredge", "fronius", "schneider electric",
  ],
  multifamily_nexus: [
    "multifamily", "apartment", "tenant", "landlord", "property owner",
    "real estate", "noi", "net operating income", "cap rate", "valuation",
    "green lease", "vnem", "virtual net metering", "mash",
    "affordable housing", "leed", "enterprise green communities", "fitwel",
    "property management", "common area", "master meter", "utility billing",
    "resident", "renter", "housing developer", "mixed-use",
    "multifamily solar", "multifamily storage", "community solar",
    "shared solar", "bill credit", "low income", "workforce housing",
    "section 8", "hud", "lihtc", "energy burden", "green building",
    "decarbonize building",
  ],
  market_pricing: [
    "pricing", "spot price", "cost per watt", "dollar per kwh",
    "$/w", "$/kwh", "ppa rate", "power purchase agreement",
    "lease rate", "srec price", "rec market", "tou",
    "time of use tariff", "rate change", "utility rate", "market trend",
    "interconnection queue", "module cost", "battery cost",
    "installation cost", "lcoe", "levelized cost", "financing rate",
    "yield", "m&a", "acquisition price", "valuation", "deal size",
  ],
  code_compliance: [
    "title 24", "local law 97", "ll97", "building code",
    "building performance standard", "bps", "fire code", "nfpa 855",
    "ibc", "ieee 1547", "ul 9540", "mandate", "compliance deadline",
    "carbon penalty", "emission limit", "reach code", "stretch code",
    "energy benchmarking", "building rating", "nyc climate",
    "boston climate", "la building", "sf building", "state mandate",
    "electrification mandate", "gas ban", "epa",
  ],
  bess_storage: [
    "battery storage", "bess", "energy storage system",
    "lithium iron phosphate", "lfp battery", "sodium-ion",
    "demand charge reduction", "demand response", "frequency regulation",
    "grid services", "dispatch strategy", "storage sizing",
    "storage incentive", "behind-the-meter", "btm storage",
    "peak shaving", "load shifting", "resilience", "backup power",
    "fire safety battery", "thermal runaway", "nfpa battery",
    "stacked incentives", "storage plus solar", "co-located",
    "residential storage", "home battery", "virtual power plant", "vpp",
  ],
  innovation_spotlight: [
    "innovation", "breakthrough", "startup funding",
    "series a", "series b", "venture capital", "clean tech",
    "new platform", "software launch", "financing structure",
    "pace financing", "c-pace", "green bond", "novel approach",
    "building-integrated", "bipv", "energy management system", "ems",
    "virtual power plant", "vpp", "ai energy", "machine learning grid",
    "digital twin", "distributed solar software", "solar software",
  ],
  project_wins: [
    "commissioned", "milestone", "deal closed", "partnership announced",
    "acquisition", "funding round", "portfolio expansion",
    "megawatt installed", "mw ac", "mw dc", "gwh deployed",
    "project complete", "case study", "success story", "groundbreaking",
    "ribbon cutting", "energized", "online", "long-term agreement",
    "offtake", "ppa signed", "raises", "secures", "closes",
    "announces", "launches",
  ],
};

const SECTION_BOOST: Record<string, number> = {
  multifamily_nexus: 2.5,
  policy_incentives: 2.0,
  bess_storage: 2.0,
  code_compliance: 1.5,
  market_pricing: 1.3,
  project_wins: 1.2,
  technology_equipment: 1.0,
  innovation_spotlight: 1.0,
};

function isBlocked(title: string, summary: string): boolean {
  const text = `${title} ${summary}`.toLowerCase();
  return BLOCKLIST.some((term) => text.includes(term));
}

function passesRelevanceGate(title: string, summary: string): boolean {
  const text = `${title} ${summary}`.toLowerCase();
  return RELEVANCE_GATE_KEYWORDS.some((kw) => text.includes(kw));
}

function getBoostScore(title: string, summary: string): number {
  const text = `${title} ${summary}`.toLowerCase();
  return BOOST_KEYWORDS.some((kw) => text.includes(kw)) ? 20 : 0;
}

function categorize(title: string, summary: string, feedTopics: string[]): { topic: string; score: number } {
  const text = `${title} ${summary}`.toLowerCase();
  let bestTopic = feedTopics[0] || "innovation_spotlight";
  let bestScore = 0;

  for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    let score = 0;
    for (const kw of keywords) {
      if (text.includes(kw)) score += kw.split(" ").length;
    }
    if (feedTopics.includes(topic)) score += 1;
    score *= SECTION_BOOST[topic] || 1.0;
    if (score > bestScore) {
      bestScore = score;
      bestTopic = topic;
    }
  }

  // Apply +20 boost for high-value DG/multifamily keywords
  bestScore += getBoostScore(title, summary);

  return { topic: bestTopic, score: bestScore };
}

function stripHtml(html: string): string {
  if (!html) return "";
  let text = html.replace(/<[^>]*>/g, "");
  const entities: Record<string, string> = {
    "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"',
    "&#39;": "'", "&apos;": "'", "&nbsp;": " ",
    "&rsquo;": "\u2019", "&lsquo;": "\u2018",
    "&rdquo;": "\u201D", "&ldquo;": "\u201C",
    "&mdash;": "\u2014", "&ndash;": "\u2013",
    "&hellip;": "\u2026", "&bull;": "\u2022",
    "&copy;": "\u00A9", "&reg;": "\u00AE",
    "&trade;": "\u2122", "&deg;": "\u00B0",
  };
  for (const [entity, char] of Object.entries(entities)) {
    text = text.replaceAll(entity, char);
  }
  text = text.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
  text = text.replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
  return text.replace(/\s+/g, " ").trim();
}

function extractText(xml: string, tag: string): string {
  const regex = new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${tag}>`, "i");
  const match = xml.match(regex);
  return match
    ? match[1].trim().replace(/<[^>]+>/g, "").trim()
    : "";
}

function extractImage(itemXml: string): string | null {
  const mediaMatch = itemXml.match(/url=\"(https?:\/\/[^\"]+\.(jpg|jpeg|png|webp)[^\"]*)\"/i);
  if (mediaMatch) return mediaMatch[1];
  const encMatch = itemXml.match(/<enclosure[^>]+url=\"(https?:\/\/[^\"]+)\"/i);
  if (encMatch) return encMatch[1];
  const imgMatch = itemXml.match(/<img[^>]+src=\"(https?:\/\/[^\"]+)\"/i);
  if (imgMatch) return imgMatch[1];
  return null;
}

async function fetchFeed(feed: FeedSource): Promise<
  Array<{
    title: string;
    summary: string;
    source_url: string;
    source_name: string;
    image_url: string | null;
    topic: string;
    relevance_score: number;
    published_at: string | null;
  }>
> {
  try {
    const res = await fetch(feed.url, {
      headers: { "User-Agent": "EnergyPulse/1.0" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];

    const xml = await res.text();
    const items = xml.split(/<item[\s>]/i).slice(1);

    const results = [];
    for (const itemXml of items.slice(0, 25)) {
      const title = extractText(itemXml, "title");
      const description = extractText(itemXml, "description");
      const link = extractText(itemXml, "link") || itemXml.match(/<link[^>]*>(.*?)<\/link>/)?.[1]?.trim() || "";
      const pubDate = extractText(itemXml, "pubDate");
      const image = extractImage(itemXml);

      if (!title || !link) continue;
      // FILTER 1: Block EV, non-US, utility-scale
      if (isBlocked(title, description)) continue;
      // FILTER 2: Must mention at least one relevant DER keyword
      if (!passesRelevanceGate(title, description)) continue;

      const { topic, score } = categorize(title, description, feed.topics);

      results.push({
        title,
        summary: stripHtml(description).slice(0, 500),
        source_url: link,
        source_name: feed.name,
        image_url: image,
        topic,
        relevance_score: Math.round(score * 10),
        published_at: pubDate ? new Date(pubDate).toISOString() : null,
      });
    }

    return results.sort((a, b) => b.relevance_score - a.relevance_score).slice(0, 10);
  } catch (e) {
    console.error(`Error fetching ${feed.url}:`, e);
    return [];
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: lastIssue } = await supabase
      .from("issues")
      .select("issue_number")
      .order("issue_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    const issueNumber = (lastIssue?.issue_number ?? 0) + 1;
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const { data: issue, error: issueError } = await supabase
      .from("issues")
      .insert({
        issue_number: issueNumber,
        week_start: weekStart.toISOString().split("T")[0],
        week_end: weekEnd.toISOString().split("T")[0],
      })
      .select()
      .single();

    if (issueError) throw issueError;

    const allArticles = (await Promise.all(FEEDS.map(fetchFeed))).flat();

    const seen = new Set<string>();
    const unique = allArticles.filter((a) => {
      if (seen.has(a.source_url)) return false;
      seen.add(a.source_url);
      return true;
    });

    unique.sort((a, b) => b.relevance_score - a.relevance_score);
    const featuredIdx = unique.findIndex((a) => a.image_url);

    const toInsert = unique.map((a, i) => ({
      ...a,
      issue_id: issue.id,
      is_featured: i === featuredIdx,
    }));

    if (toInsert.length > 0) {
      const { error: insertError } = await supabase.from("articles").insert(toInsert);
      if (insertError) throw insertError;
    }

    try {
      await fetch(`${supabaseUrl}/functions/v1/generate-digest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
        },
        body: JSON.stringify({ issue_id: issue.id }),
      });
    } catch (digestErr) {
      console.error("Digest generation failed:", digestErr);
    }

    const sectionCounts: Record<string, number> = {};
    toInsert.forEach((a) => {
      sectionCounts[a.topic] = (sectionCounts[a.topic] || 0) + 1;
    });

    return new Response(
      JSON.stringify({
        success: true,
        issue_number: issueNumber,
        articles_count: toInsert.length,
        sections: sectionCounts,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
