import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { issue_id } = await req.json();
    if (!issue_id) throw new Error("issue_id is required");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch articles for this issue
    const { data: articles, error: artErr } = await supabase
      .from("articles")
      .select("title, topic, source_name, summary")
      .eq("issue_id", issue_id)
      .order("published_at", { ascending: false });

    if (artErr) throw artErr;
    if (!articles || articles.length === 0) {
      return new Response(
        JSON.stringify({ digest: "No articles available for digest generation." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build headlines summary for AI
    const headlines = articles
      .slice(0, 30)
      .map((a) => `[${a.topic}] ${a.title} (${a.source_name}): ${a.summary?.slice(0, 150) || ""}`)
      .join("\n");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are a sharp energy industry analyst writing a weekly digest for a team that develops, owns, and operates Distributed Energy Resources (DER) — specifically solar PV and battery energy storage systems (BESS) on multifamily residential properties. Write exactly 4-5 sentences summarizing the most important developments from the headlines below. Focus on what matters most for DER deployment on multifamily housing: policy changes, technology shifts, market dynamics, and competitive moves. Be direct, analytical, and opinionated — not generic. Write like a senior analyst, not a chatbot.`,
          },
          {
            role: "user",
            content: `Here are this week's headlines:\n\n${headlines}\n\nWrite the weekly digest summary.`,
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const digestText = aiData.choices?.[0]?.message?.content?.trim() || "Digest generation failed.";

    // Store digest on the issue
    const { error: updateErr } = await supabase
      .from("issues")
      .update({ digest_text: digestText })
      .eq("id", issue_id);

    if (updateErr) throw updateErr;

    return new Response(
      JSON.stringify({ digest: digestText }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Digest error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
