import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EIARecord {
  period: string;
  stateid: string;
  stateDescription: string;
  sectorName: string;
  price: number;
}

interface EIAResponse {
  response: {
    data: EIARecord[];
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("EIA_API_KEY");
    if (!apiKey) {
      throw new Error("EIA_API_KEY not configured");
    }

    // Fetch all states — no state filters, length=200 to cover 2 months × ~52 entries
    const url = `https://api.eia.gov/v2/electricity/retail-sales/data?api_key=${apiKey}&data[]=price&facets[sectorid][]=RES&frequency=monthly&sort[0][column]=period&sort[0][direction]=desc&length=200`;

    const res = await fetch(url);
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`EIA API error: ${res.status} - ${errorText}`);
    }

    const json: EIAResponse = await res.json();
    const data = json.response?.data ?? [];

    // Group by state and get latest 2 periods per state for trend calculation
    const byState: Record<string, EIARecord[]> = {};
    for (const record of data) {
      if (!record.stateid || record.stateid === "US") continue;
      if (!byState[record.stateid]) {
        byState[record.stateid] = [];
      }
      if (byState[record.stateid].length < 2) {
        byState[record.stateid].push(record);
      }
    }

    const stateRates = Object.entries(byState).map(([stateId, records]) => {
      const current = records[0];
      const previous = records[1];
      let trend: "up" | "down" | "neutral" = "neutral";
      if (current && previous && current.price != null && previous.price != null) {
        const curPrice = parseFloat(String(current.price));
        const prevPrice = parseFloat(String(previous.price));
        if (curPrice > prevPrice) trend = "up";
        else if (curPrice < prevPrice) trend = "down";
      }
      return {
        stateId,
        stateName: current?.stateDescription || stateId,
        price: current?.price != null ? parseFloat(String(current.price)) : null,
        period: current?.period ?? "Data unavailable",
        trend,
      };
    });

    stateRates.sort((a, b) => a.stateName.localeCompare(b.stateName));

    return new Response(JSON.stringify({ rates: stateRates, fetched_at: new Date().toISOString() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("EIA fetch error:", error);
    return new Response(JSON.stringify({ rates: [], fetched_at: null, error: error.message }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
