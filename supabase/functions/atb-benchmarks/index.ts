import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/*
 * NREL 2024 Annual Technology Baseline — Moderate Scenario, Base Year values.
 * Source: https://atb.nrel.gov/electricity/2024/data
 * The full CSV (ATBe.csv) is ~94 MB, too large for edge-function parsing.
 * These values are extracted from the ATB workbook / published tables.
 * They are static reference data (published once per year).
 */
const ATB_2024_MODERATE: {
  displayName: string;
  value: number;
  unit: string;
}[] = [
  { displayName: "Residential PV CAPEX", value: 2680, unit: "$/kWDC" },
  { displayName: "Residential Battery CAPEX (power)", value: 1598, unit: "$/kWDC" },
  { displayName: "Residential Battery CAPEX (energy)", value: 499, unit: "$/kWh" },
  { displayName: "Commercial PV CAPEX", value: 1640, unit: "$/kWDC" },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, supabaseKey);

    // Check cache freshness — skip refresh if data is < 30 days old
    const { data: cached } = await sb
      .from("atb_cache")
      .select("*")
      .eq("atb_year", 2024)
      .eq("scenario", "Moderate")
      .limit(1);

    const now = Date.now();
    const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

    if (cached && cached.length > 0) {
      const age = now - new Date(cached[0].fetched_at).getTime();
      if (age < THIRTY_DAYS) {
        const { data: allCached } = await sb
          .from("atb_cache")
          .select("*")
          .eq("atb_year", 2024)
          .eq("scenario", "Moderate");

        const metrics = (allCached ?? []).map((r: any) => ({
          metric_name: r.metric_name,
          value: r.value,
          unit: r.unit,
          scenario: r.scenario,
          atb_year: r.atb_year,
          fetched_at: r.fetched_at,
        }));

        return new Response(
          JSON.stringify({ metrics, source: "cache", fetched_at: cached[0].fetched_at }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const fetchedAt = new Date().toISOString();

    // Upsert into atb_cache
    for (const m of ATB_2024_MODERATE) {
      await sb.from("atb_cache").upsert(
        {
          metric_name: m.displayName,
          value: m.value,
          unit: m.unit,
          scenario: "Moderate",
          atb_year: 2024,
          fetched_at: fetchedAt,
        },
        { onConflict: "metric_name,scenario,atb_year" }
      );
    }

    // Upsert into market_metrics so they appear in Weekly Benchmarks
    for (const m of ATB_2024_MODERATE) {
      await sb.from("market_metrics").upsert(
        {
          metric_name: m.displayName,
          value: m.value,
          unit: m.unit,
          trend: "neutral",
          notes: "NREL ATB 2024",
          updated_at: fetchedAt,
        },
        { onConflict: "metric_name" }
      );
    }

    const metrics = ATB_2024_MODERATE.map((m) => ({
      metric_name: m.displayName,
      value: m.value,
      unit: m.unit,
      scenario: "Moderate",
      atb_year: 2024,
      fetched_at: fetchedAt,
    }));

    return new Response(
      JSON.stringify({ metrics, source: "fresh", fetched_at: fetchedAt }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("ATB benchmark error:", error);
    return new Response(
      JSON.stringify({ metrics: [], error: error.message }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
