import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FeedSource {
  url: string;
  name: string;
  topics: string[];
  weight: number; // Higher = more articles kept from this source
}

// ─────────────────────────────────────────
// CURATED SOURCES — US-focused DER + Multifamily
// Weight 3 = priority source (keep up to 10 articles)
// Weight 2 = standard source (keep up to 6 articles)
// Weight 1 = supplementary source (keep up to 3 articles)
// ─────────────────────────────────────────
const FEEDS: FeedSource[] = [
  // TIER 1 — Trusted + High Relevance
  {
    url: "https://pv-magazine-usa.com/feed/",
    name: "PV Magazine USA",
    topics: ["technology_equipment", "market_pricing", "policy_incentives"],
    weight: 3,
  },
  {
    url: "https://www.canarymedia.com/feed",
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
  {
    url: "https://www.energy-storage.news/feed/",
    name: "Energy Storage News",
    topics: ["bess_storage", "market_pricing", "technology_equipment"],
    weight: 3,
  },
  {
    url: "https://www.solarpowerworldonline.com/feed/",
    name: "Solar Power World",
    topics: ["technology_equipment", "project_wins", "policy_incentives"],
    weight: 3,
  },

  // TIER 2 — High Value Additions
  {
    url: "https://www.multifamilydive.com/feeds/news/",
    name: "Multifamily Dive",
    topics: ["multifamily_nexus", "project_wins", "code_compliance"],
    weight: 3,
  },
  {
    url: "https://www.multihousingnews.com/feed/",
    name: "Multi-Housing News",
    topics: ["multifamily_nexus", "project_wins", "market_pricing"],
    weight: 2,
  },
  {
    url: "https://www.multifamilyexecutive.com/rss/",
    name: "Multifamily Executive",
    topics: ["multifamily_nexus", "project_wins", "policy_incentives"],
    weight: 2,
  },
  {
    url: "https://rmi.org/feed/",
    name: "RMI",
    topics: ["policy_incentives", "innovation_spotlight", "multifamily_nexus"],
    weight: 3,
  },
  {
    url: "https://www.nrel.gov/news/rss/news.xml",
    name: "NREL",
    topics: ["technology_equipment", "innovation_spotlight", "bess_storage"],
    weight: 2,
  },
  {
    url: "https://www.seia.org/rss.xml",
    name: "SEIA",
    topics: ["policy_incentives", "market_pricing", "project_wins"],
    weight: 2,
  },

  // TIER 3 — Supplementary
  {
    url: "https://www.affordablehousingfinance.com/rss/",
    name: "Affordable Housing Finance",
    topics: ["multifamily_nexus", "policy_incentives"],
    weight: 2,
  },
  {
    url: "https://electrek.co/feed/",
    name: "Electrek",
    topics: ["bess_storage", "technology_equipment", "innovation_spotlight"],
    weight: 1,
  },
  {
    url: "https://www.energy.gov/eere/articles.xml",
    name: "DOE EERE",
    topics: ["policy_incentives", "innovation_spotlight"],
    weight: 2,
  },

  // PR Newswire — Press releases for project wins, funding, and real estate energy deals
  {
    url: "https://www.prnewswire.com/rss/news-releases-list.rss?category=ENI",
    name: "PR Newswire Energy",
    topics: ["project_wins", "policy_incentives", "bess_storage"],
    weight: 2,
  },
  {
    url: "https://www.prnewswire.com/rss/news-releases-list.rss?category=RLE",
    name: "PR Newswire Real Estate",
    topics: ["multifamily_nexus", "project_wins", "market_pricing"],
    weight: 2,
  },
];

// ─────────────────────────────────────────
// US GEOGRAPHY FILTER
// Reject articles that are clearly non-US
// ─────────────────────────────────────────
const NON_US_TERMS = [
  "australia",
  "australian",
  "europe",
  "european",
  "uk ",
  "united kingdom",
  "germany",
  "german",
  "france",
  "french",
  "china",
  "chinese",
  "india",
  "indian",
  "canada",
  "canadian",
  "ontario",
  "alberta",
  "kenya",
  "africa",
  "japan",
  "japanese",
  "nsw",
  "act government",
  "queensland",
  "victoria",
  "au$",
  "gbp",
  "eur ",
  "ofgem",
  "ofcom",
  "ontario energy",
  "british columbia",
];

function isUSContent(title: string, summary: string): boolean {
  const text = `${title} ${summary}`.toLowerCase();
  return !NON_US_TERMS.some((term) => text.includes(term));
}

// ─────────────────────────────────────────
// TOPIC KEYWORDS — weighted toward Multifamily + Policy + BESS
// ─────────────────────────────────────────
const TOPIC_KEYWORDS: Record<string, string[]> = {
  policy_incentives: [
    "ira",
    "inflation reduction act",
    "itc",
    "investment tax credit",
    "tax credit",
    "sgip",
    "ny-sun",
    "smart program",
    "srec",
    "policy",
    "incentive",
    "subsidy",
    "transferability",
    "domestic content",
    "low-income",
    "adder",
    "bonus credit",
    "interconnection policy",
    "net metering",
    "nem",
    "vnem",
    "virtual net metering",
    "federal funding",
    "state incentive",
    "rebate",
    "grant",
    "doe loan",
    "clean energy standard",
    "renewable portfolio",
    "rps",
    "community benefit",
    "low income housing tax credit",
    "lihtc",
    "new market tax credit",
  ],
  technology_equipment: [
    "module",
    "inverter",
    "microinverter",
    "string inverter",
    "hybrid inverter",
    "solar panel",
    "efficiency record",
    "cost per watt",
    "bifacial",
    "topcon",
    "heterojunction",
    "smart panel",
    "load management",
    "ul certification",
    "ev charging",
    "evse",
    "optimizer",
    "rapid shutdown",
    "racking",
    "mounting",
    "metering",
    "smart meter",
    "monitoring system",
    "commissioning",
  ],
  multifamily_nexus: [
    "multifamily",
    "apartment",
    "tenant",
    "landlord",
    "property owner",
    "real estate",
    "noi",
    "net operating income",
    "cap rate",
    "valuation",
    "green lease",
    "vnem",
    "virtual net metering",
    "mash",
    "affordable housing",
    "leed",
    "enterprise green communities",
    "fitwel",
    "sustainability certification",
    "property management",
    "common area",
    "master meter",
    "utility billing",
    "resident",
    "renter",
    "housing developer",
    "mixed-use",
    "multifamily solar",
    "multifamily storage",
    "community solar",
    "shared solar",
    "bill credit",
    "low income",
    "workforce housing",
    "section 8",
    "hud",
    "lihtc",
    "energy burden",
    "green building",
    "decarbonize building",
  ],
  market_pricing: [
    "pricing",
    "spot price",
    "cost per watt",
    "dollar per kwh",
    "$/w",
    "$/kwh",
    "ppa rate",
    "power purchase agreement",
    "lease rate",
    "srec price",
    "rec market",
    "tou",
    "time of use tariff",
    "rate change",
    "utility rate",
    "market trend",
    "interconnection queue",
    "wait time",
    "backlog",
    "module cost",
    "battery cost",
    "installation cost",
    "lcoe",
    "levelized cost",
    "financing rate",
    "interest rate",
    "yield",
  ],
  code_compliance: [
    "title 24",
    "local law 97",
    "ll97",
    "building code",
    "building performance standard",
    "bps",
    "fire code",
    "nfpa 855",
    "ibc",
    "ieee 1547",
    "ul 9540",
    "mandate",
    "compliance deadline",
    "carbon penalty",
    "emission limit",
    "reach code",
    "stretch code",
    "energy benchmarking",
    "building rating",
    "nyc climate",
    "boston climate",
    "la building",
    "sf building",
    "state mandate",
    "electrification mandate",
    "gas ban",
  ],
  bess_storage: [
    "battery storage",
    "bess",
    "energy storage system",
    "lithium iron phosphate",
    "lfp battery",
    "sodium-ion",
    "demand charge reduction",
    "demand response",
    "frequency regulation",
    "grid services",
    "dispatch strategy",
    "storage sizing",
    "storage incentive",
    "behind-the-meter",
    "btm storage",
    "peak shaving",
    "load shifting",
    "resilience",
    "backup power",
    "fire safety battery",
    "thermal runaway",
    "nfpa battery",
    "stacked incentives",
    "storage plus solar",
    "co-located",
    "megapack",
    "powerwall",
    "powerpack",
    "fluence",
    "powin",
  ],
  innovation_spotlight: [
    "innovation",
    "breakthrough",
    "startup funding",
    "series a",
    "series b",
    "venture capital",
    "clean tech",
    "new platform",
    "software launch",
    "financing structure",
    "pace financing",
    "c-pace",
    "green bond",
    "novel approach",
    "building-integrated",
    "bipv",
    "agrivoltaic",
    "energy management system",
    "ems",
    "virtual power plant",
    "vpp",
    "ai energy",
    "machine learning grid",
    "digital twin",
  ],
  project_wins: [
    "commissioned",
    "milestone",
    "deal closed",
    "partnership announced",
    "acquisition",
    "funding round",
    "portfolio expansion",
    "megawatt installed",
    "mw ac",
    "mw dc",
    "gwh deployed",
    "project complete",
    "case study",
    "success story",
    "groundbreaking",
    "ribbon cutting",
    "energized",
    "online",
    "long-term agreement",
    "offtake",
    "ppa signed",
  ],
};

// ─────────────────────────────────────────
// SECTION WEIGHTS — boost Multifamily, Policy, BESS
// ─────────────────────────────────────────
const SECTION_BOOST: Record<string, number> = {
  multifamily_nexus: 2.0,
  policy_incentives: 1.8,
  bess_storage: 1.8,
  code_compliance: 1.5,
  market_pricing: 1.3,
  project_wins: 1.2,
  technology_equipment: 1.0,
  innovation_spotlight: 1.0,
};

function categorize(title: string, summary: string, feedTopics: string[]): { topic: string; score: number } {
  const text = `${title} ${summary}`.toLowerCase();
  let bestTopic = feedTopics[0] || "innovation_spotlight";
  let bestScore = 0;

  for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    let score = 0;
    for (const kw of keywords) {
      if (text.includes(kw)) score += kw.split(" ").length; // Multi-word matches score higher
    }
    if (feedTopics.includes(topic)) score += 1;
    score *= SECTION_BOOST[topic] || 1.0;
    if (score > bestScore) {
      bestScore = score;
      bestTopic = topic;
    }
  }

  return { topic: bestTopic, score: bestScore };
}

// ─────────────────────────────────────────
// XML HELPERS
// ─────────────────────────────────────────
function extractText(xml: string, tag: string): string {
  const regex = new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${tag}>`, "i");
  const match = xml.match(regex);
  return match
    ? match[1]
        .trim()
        .replace(/<[^>]+>/g, "")
        .trim()
    : "";
}

function extractImage(itemXml: string): string | null {
  const mediaMatch = itemXml.match(/url="(https?:\/\/[^"]+\.(jpg|jpeg|png|webp)[^"]*)"/i);
  if (mediaMatch) return mediaMatch[1];
  const encMatch = itemXml.match(/<enclosure[^>]+url="(https?:\/\/[^"]+)"/i);
  if (encMatch) return encMatch[1];
  const imgMatch = itemXml.match(/<img[^>]+src="(https?:\/\/[^"]+)"/i);
  if (imgMatch) return imgMatch[1];
  return null;
}

// ─────────────────────────────────────────
// FETCH SINGLE RSS FEED
// ─────────────────────────────────────────
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
      headers: { "User-Agent": "SolarMagazineWeekly/1.0" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      console.error(`Failed ${feed.url}: ${res.status}`);
      return [];
    }

    const xml = await res.text();
    const items = xml.split(/<item[\s>]/i).slice(1);
    const maxArticles = feed.weight === 3 ? 10 : feed.weight === 2 ? 6 : 3;

    const results = [];
    for (const itemXml of items.slice(0, 20)) {
      const title = extractText(itemXml, "title");
      const description = extractText(itemXml, "description");
      const link = extractText(itemXml, "link") || itemXml.match(/<link[^>]*>(.*?)<\/link>/)?.[1]?.trim() || "";
      const pubDate = extractText(itemXml, "pubDate");
      const image = extractImage(itemXml);

      if (!title || !link) continue;

      // US geography filter
      if (!isUSContent(title, description)) continue;

      const { topic, score } = categorize(title, description, feed.topics);

      results.push({
        title,
        summary: description.slice(0, 500),
        source_url: link,
        source_name: feed.name,
        image_url: image,
        topic,
        relevance_score: Math.round(score * 10),
        published_at: pubDate ? new Date(pubDate).toISOString() : null,
      });
    }

    // Sort by relevance score and take top articles based on weight
    return results.sort((a, b) => b.relevance_score - a.relevance_score).slice(0, maxArticles);
  } catch (e) {
    console.error(`Error fetching ${feed.url}:`, e);
    return [];
  }
}

// ─────────────────────────────────────────
// MAIN HANDLER
// ─────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get next issue number
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

    // Create new issue
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

    // Fetch all feeds in parallel
    const allArticles = (await Promise.all(FEEDS.map(fetchFeed))).flat();

    // Deduplicate by URL
    const seen = new Set<string>();
    const unique = allArticles.filter((a) => {
      if (seen.has(a.source_url)) return false;
      seen.add(a.source_url);
      return true;
    });

    // Sort all articles by relevance score
    unique.sort((a, b) => b.relevance_score - a.relevance_score);

    // Mark featured as highest scored article with an image
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

    // Trigger digest generation
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

    // Summary by section
    const sectionCounts: Record<string, number> = {};
    toInsert.forEach((a) => {
      sectionCounts[a.topic] = (sectionCounts[a.topic] || 0) + 1;
    });

    return new Response(
      JSON.stringify({
        success: true,
        issue_number: issueNumber,
        articles_count: toInsert.length,
        us_filtered: allArticles.length - unique.length,
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
