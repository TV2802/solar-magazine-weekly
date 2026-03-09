import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STATE_COORDS: Record<string, { name: string; lat: number; lon: number }> = {
  CA: { name: "California", lat: 34.05, lon: -118.25 },
  NY: { name: "New York", lat: 40.71, lon: -74.01 },
  TX: { name: "Texas", lat: 29.76, lon: -95.37 },
  MA: { name: "Massachusetts", lat: 42.36, lon: -71.06 },
  NJ: { name: "New Jersey", lat: 40.74, lon: -74.17 },
  CO: { name: "Colorado", lat: 39.74, lon: -104.98 },
  FL: { name: "Florida", lat: 25.77, lon: -80.19 },
  AZ: { name: "Arizona", lat: 33.45, lon: -112.07 },
  NV: { name: "Nevada", lat: 36.17, lon: -115.14 },
  WA: { name: "Washington", lat: 47.61, lon: -122.33 },
  OR: { name: "Oregon", lat: 45.52, lon: -122.68 },
  UT: { name: "Utah", lat: 40.76, lon: -111.89 },
  NM: { name: "New Mexico", lat: 35.08, lon: -106.65 },
  ID: { name: "Idaho", lat: 43.61, lon: -116.20 },
  MT: { name: "Montana", lat: 46.60, lon: -112.03 },
  WY: { name: "Wyoming", lat: 41.14, lon: -104.82 },
  ND: { name: "North Dakota", lat: 46.81, lon: -100.78 },
  SD: { name: "South Dakota", lat: 44.37, lon: -100.35 },
  NE: { name: "Nebraska", lat: 41.26, lon: -96.05 },
  KS: { name: "Kansas", lat: 37.69, lon: -97.34 },
  MN: { name: "Minnesota", lat: 44.98, lon: -93.27 },
  IA: { name: "Iowa", lat: 41.60, lon: -93.61 },
  MO: { name: "Missouri", lat: 38.63, lon: -90.20 },
  WI: { name: "Wisconsin", lat: 43.07, lon: -89.40 },
  IL: { name: "Illinois", lat: 41.85, lon: -87.65 },
  MI: { name: "Michigan", lat: 42.33, lon: -83.05 },
  IN: { name: "Indiana", lat: 39.77, lon: -86.16 },
  OH: { name: "Ohio", lat: 39.96, lon: -82.99 },
  KY: { name: "Kentucky", lat: 38.25, lon: -85.76 },
  TN: { name: "Tennessee", lat: 36.17, lon: -86.78 },
  AL: { name: "Alabama", lat: 33.52, lon: -86.81 },
  MS: { name: "Mississippi", lat: 32.30, lon: -90.18 },
  AR: { name: "Arkansas", lat: 34.75, lon: -92.29 },
  LA: { name: "Louisiana", lat: 29.95, lon: -90.07 },
  OK: { name: "Oklahoma", lat: 35.47, lon: -97.52 },
  GA: { name: "Georgia", lat: 33.75, lon: -84.39 },
  SC: { name: "South Carolina", lat: 34.00, lon: -81.03 },
  NC: { name: "North Carolina", lat: 35.23, lon: -80.84 },
  VA: { name: "Virginia", lat: 37.54, lon: -77.43 },
  WV: { name: "West Virginia", lat: 38.35, lon: -81.63 },
  MD: { name: "Maryland", lat: 39.29, lon: -76.61 },
  DE: { name: "Delaware", lat: 39.74, lon: -75.54 },
  PA: { name: "Pennsylvania", lat: 39.95, lon: -75.17 },
  CT: { name: "Connecticut", lat: 41.76, lon: -72.68 },
  RI: { name: "Rhode Island", lat: 41.82, lon: -71.42 },
  VT: { name: "Vermont", lat: 44.26, lon: -72.58 },
  NH: { name: "New Hampshire", lat: 43.21, lon: -71.54 },
  ME: { name: "Maine", lat: 43.66, lon: -70.26 },
  AK: { name: "Alaska", lat: 61.22, lon: -149.90 },
  HI: { name: "Hawaii", lat: 21.31, lon: -157.86 },
};

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const nrelApiKey = Deno.env.get("NREL_API_KEY");
    if (!nrelApiKey) throw new Error("NREL_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check cache
    const { data: cached } = await supabase
      .from("pvwatts_cache")
      .select("*")
      .order("state_id");

    const now = Date.now();
    const freshCutoff = now - THIRTY_DAYS_MS;

    // If we have all 50 states cached and all are fresh, return immediately
    if (cached && cached.length >= 50) {
      const allFresh = cached.every(
        (row: any) => new Date(row.fetched_at).getTime() > freshCutoff
      );
      if (allFresh) {
        const results = cached.map((row: any) => ({
          state_id: row.state_id,
          state_name: row.state_name,
          ac_annual: row.ac_annual,
          capacity_factor: row.capacity_factor,
        }));
        return new Response(
          JSON.stringify({ data: results, source: "cache", fetched_at: cached[0]?.fetched_at }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Build set of stale/missing states
    const cachedMap: Record<string, any> = {};
    if (cached) {
      for (const row of cached) {
        cachedMap[row.state_id] = row;
      }
    }

    const statesToFetch: string[] = [];
    for (const stateId of Object.keys(STATE_COORDS)) {
      const c = cachedMap[stateId];
      if (!c || new Date(c.fetched_at).getTime() <= freshCutoff) {
        statesToFetch.push(stateId);
      }
    }

    // Fetch from NREL in parallel (batch of 10 to avoid rate limits)
    const fetchResults: Record<string, { ac_annual: number; capacity_factor: number }> = {};

    const batchSize = 10;
    for (let i = 0; i < statesToFetch.length; i += batchSize) {
      const batch = statesToFetch.slice(i, i + batchSize);
      const promises = batch.map(async (stateId) => {
        const { lat, lon } = STATE_COORDS[stateId];
        const url = `https://developer.nrel.gov/api/pvwatts/v8.json?api_key=${nrelApiKey}&lat=${lat}&lon=${lon}&system_capacity=10&azimuth=180&tilt=20&array_type=1&module_type=0&losses=14`;

        try {
          const res = await fetch(url);
          if (!res.ok) {
            const txt = await res.text();
            console.error(`NREL error for ${stateId}: ${res.status} ${txt}`);
            return;
          }
          const json = await res.json();
          const outputs = json.outputs;
          if (outputs) {
            fetchResults[stateId] = {
              ac_annual: outputs.ac_annual,
              capacity_factor: outputs.capacity_factor,
            };
          }
        } catch (err) {
          console.error(`NREL fetch failed for ${stateId}:`, err);
        }
      });
      await Promise.all(promises);
    }

    // Upsert fetched results into cache
    if (Object.keys(fetchResults).length > 0) {
      const upsertRows = Object.entries(fetchResults).map(([stateId, data]) => ({
        state_id: stateId,
        state_name: STATE_COORDS[stateId].name,
        ac_annual: data.ac_annual,
        capacity_factor: data.capacity_factor,
        fetched_at: new Date().toISOString(),
      }));

      const { error: upsertError } = await supabase
        .from("pvwatts_cache")
        .upsert(upsertRows, { onConflict: "state_id" });

      if (upsertError) {
        console.error("Upsert error:", upsertError);
      }
    }

    // Build final response from cache + fresh fetches
    const finalResults = Object.entries(STATE_COORDS).map(([stateId, info]) => {
      const fresh = fetchResults[stateId];
      const c = cachedMap[stateId];
      return {
        state_id: stateId,
        state_name: info.name,
        ac_annual: fresh?.ac_annual ?? c?.ac_annual ?? null,
        capacity_factor: fresh?.capacity_factor ?? c?.capacity_factor ?? null,
      };
    });

    finalResults.sort((a, b) => a.state_name.localeCompare(b.state_name));

    return new Response(
      JSON.stringify({ data: finalResults, source: "api", fetched_at: new Date().toISOString() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("PVWatts edge function error:", error);
    return new Response(
      JSON.stringify({ data: [], error: error.message }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
