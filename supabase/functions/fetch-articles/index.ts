import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface FeedSource {
  url: string;
  name: string;
  topics: string[];
}

const FEEDS: FeedSource[] = [
  { url: "https://pv-magazine-usa.com/feed/", name: "PV Magazine", topics: ["policy_incentives", "technology_equipment", "market_pricing"] },
  { url: "https://www.solarpowerworldonline.com/feed/", name: "Solar Power World", topics: ["technology_equipment", "policy_incentives"] },
  { url: "https://cleantechnica.com/feed/", name: "CleanTechnica", topics: ["technology_equipment", "innovation_spotlight", "bess_storage"] },
  { url: "https://www.utilitydive.com/feeds/news/", name: "Utility Dive", topics: ["policy_incentives", "code_compliance", "market_pricing"] },
  { url: "https://electrek.co/feed/", name: "Electrek", topics: ["bess_storage", "innovation_spotlight", "technology_equipment"] },
  { url: "https://www.canarymedia.com/feed", name: "Canary Media", topics: ["policy_incentives", "innovation_spotlight", "bess_storage"] },
  { url: "https://www.energy-storage.news/feed/", name: "Energy Storage News", topics: ["bess_storage", "market_pricing", "technology_equipment"] },
  { url: "https://www.energy.gov/eere/articles.xml", name: "DOE EERE", topics: ["policy_incentives", "innovation_spotlight", "code_compliance"] },
  { url: "https://www.multifamilyexecutive.com/rss/", name: "Multifamily Executive", topics: ["multifamily_nexus", "project_wins"] },
  { url: "https://www.seia.org/feed", name: "SEIA", topics: ["policy_incentives", "market_pricing"] },
];

const TOPIC_KEYWORDS: Record<string, string[]> = {
  policy_incentives: [
    "ira", "inflation reduction act", "itc", "investment tax credit", "tax credit",
    "incentive", "sgip", "ny-sun", "smart program", "srec", "policy", "subsidy",
    "transferability", "domestic content", "low-income", "adder", "bonus",
    "interconnection policy", "net metering", "federal", "state incentive",
    "rebate", "grant", "funding program",
  ],
  technology_equipment: [
    "module", "inverter", "microinverter", "string inverter", "hybrid inverter",
    "panel", "solar panel", "efficiency", "cost per watt", "bifacial", "monocrystalline",
    "perc", "topcon", "heterojunction", "smart panel", "load management",
    "ul certification", "iec", "ev charging", "evse", "charger",
    "optimizer", "rapid shutdown",
  ],
  multifamily_nexus: [
    "multifamily", "apartment", "tenant", "landlord", "property", "real estate",
    "noi", "net operating income", "valuation", "green lease", "vnem",
    "virtual net metering", "mash", "affordable housing", "leed",
    "enterprise green communities", "fitwel", "sustainability certification",
    "property management", "hoa", "common area", "master meter",
    "utility billing", "resident",
  ],
  market_pricing: [
    "pricing", "price", "spot price", "cost per watt", "dollar per kwh",
    "ppa", "power purchase agreement", "lease rate", "community solar",
    "srec price", "rec market", "tou", "time of use", "tariff",
    "rate change", "utility rate", "benchmark", "market trend",
    "queue", "interconnection queue", "wait time",
  ],
  code_compliance: [
    "title 24", "local law 97", "building code", "building performance standard",
    "bps", "fire code", "nfpa 855", "nfpa", "ibc", "ieee 1547", "ul 9540",
    "ul 9540a", "mandate", "compliance", "carbon penalty", "emission",
    "building standard", "energy code", "reach code",
  ],
  bess_storage: [
    "battery", "bess", "energy storage", "lithium", "lfp", "sodium-ion",
    "demand charge", "demand response", "frequency regulation", "grid services",
    "dispatch", "sizing", "storage incentive", "behind-the-meter",
    "front-of-meter", "peak shaving", "load shifting", "resilience",
    "backup power", "fire safety", "thermal runaway",
  ],
  innovation_spotlight: [
    "innovation", "breakthrough", "startup", "new technology", "ai",
    "machine learning", "software platform", "financing", "pace", "c-pace",
    "green bond", "novel", "building-integrated", "bipv",
    "energy management system", "ems", "digital twin",
  ],
  project_wins: [
    "project", "commissioned", "milestone", "deal", "closed", "partnership",
    "acquisition", "funding round", "ipo", "expansion", "portfolio",
    "megawatt", "mw", "installation", "deployed", "completed",
    "case study", "success",
  ],
};

function categorize(title: string, summary: string, feedTopics: string[]): string {
  const text = `${title} ${summary}`.toLowerCase();
  let bestTopic = feedTopics[0] || "innovation_spotlight";
  let bestScore = 0;

  for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    let score = 0;
    for (const kw of keywords) {
      if (text.includes(kw)) score++;
    }
    if (feedTopics.includes(topic)) score += 0.5;
    if (score > bestScore) {
      bestScore = score;
      bestTopic = topic;
    }
  }

  return bestTopic;
}

function extractText(xml: string, tag: string): string {
  const regex = new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${tag}>`, "i");
  const match = xml.match(regex);
  return match ? match[1].trim().replace(/<[^>]+>/g, "").trim() : "";
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

async function fetchFeed(feed: FeedSource): Promise<Array<{
  title: string;
  summary: string;
  source_url: string;
  source_name: string;
  image_url: string | null;
  topic: string;
  published_at: string | null;
}>> {
  try {
    const res = await fetch(feed.url, {
      headers: { "User-Agent": "ENERGYPULSE/1.0" },
    });
    if (!res.ok) {
      console.error(`Failed to fetch ${feed.url}: ${res.status}`);
      return [];
    }
    const xml = await res.text();
    const items = xml.split(/<item[\s>]/i).slice(1);

    return items.slice(0, 10).map((itemXml) => {
      const title = extractText(itemXml, "title");
      const description = extractText(itemXml, "description");
      const link = extractText(itemXml, "link") || itemXml.match(/<link[^>]*>(.*?)<\/link>/)?.[1]?.trim() || "";
      const pubDate = extractText(itemXml, "pubDate");
      const image = extractImage(itemXml);
      const topic = categorize(title, description, feed.topics);

      return {
        title,
        summary: description.slice(0, 500),
        source_url: link,
        source_name: feed.name,
        image_url: image,
        topic,
        published_at: pubDate ? new Date(pubDate).toISOString() : null,
      };
    }).filter((a) => a.title && a.source_url);
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

    const featuredIdx = unique.findIndex((a) => a.image_url);

    const toInsert = unique.map((a, i) => ({
      ...a,
      issue_id: issue.id,
      is_featured: i === featuredIdx,
    }));

    if (toInsert.length > 0) {
      const { error: insertError } = await supabase
        .from("articles")
        .insert(toInsert);
      if (insertError) throw insertError;
    }

    // Trigger digest generation
    try {
      await fetch(`${supabaseUrl}/functions/v1/generate-digest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
        },
        body: JSON.stringify({ issue_id: issue.id }),
      });
    } catch (digestErr) {
      console.error("Digest generation failed:", digestErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        issue_number: issueNumber,
        articles_count: toInsert.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
