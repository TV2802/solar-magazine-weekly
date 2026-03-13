import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, TrendingDown, Minus, Activity, DollarSign, Zap, Clock } from "lucide-react";
import { format } from "date-fns";
import ElectricityRateMap from "@/components/ElectricityRateMap";
import TrackedStatesTable from "@/components/TrackedStatesTable";
import type { StateRate, Layers, LayerKey, SolarData } from "@/components/ElectricityRateMap";

const DEFAULT_TRACKED = ["CA", "NY", "TX", "MA", "NJ", "CO"];

interface MarketMetric {
  id: string;
  metric_name: string;
  value: number;
  unit: string;
  trend: string;
  notes: string | null;
  updated_at: string;
}

interface IncentiveStatus {
  id: string;
  program_name: string;
  state: string;
  status: string;
  notes: string | null;
  updated_at: string;
}

const TrendIcon = ({ trend, className = "" }: { trend: string; className?: string }) => {
  if (trend === "up") return <TrendingUp className={`${className} text-green-400`} />;
  if (trend === "down") return <TrendingDown className={`${className} text-red-400`} />;
  return <Minus className={`${className} text-zinc-500`} />;
};

const StatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, string> = {
    Active: "bg-green-500/20 text-green-400 border-green-500/30",
    Waitlist: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    Closed: "bg-red-500/20 text-red-400 border-red-500/30",
    Pending: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  };
  return (
    <span className={`inline-block rounded border px-2 py-0.5 font-mono text-xs uppercase tracking-wider ${styles[status] || styles.Pending}`}>
      {status}
    </span>
  );
};

export default function MarketIntelligence() {
  const [stateRates, setStateRates] = useState<StateRate[]>([]);
  const [ratesFetched, setRatesFetched] = useState<string | null>(null);
  const [ratesLoading, setRatesLoading] = useState(true);
  const [ratesError, setRatesError] = useState<string | null>(null);
  const [tracked, setTracked] = useState<Set<string>>(new Set(DEFAULT_TRACKED));
  const [layers, setLayers] = useState<Layers>({ rates: true, solar: false, index: false });
  const [solarData, setSolarData] = useState<SolarData[]>([]);
  const [solarLoading, setSolarLoading] = useState(false);
  const [solarFetched, setSolarFetched] = useState(false);

  const [metrics, setMetrics] = useState<MarketMetric[]>([]);
  const [metricsLoading, setMetricsLoading] = useState(true);

  const [incentives, setIncentives] = useState<IncentiveStatus[]>([]);
  const [incentivesLoading, setIncentivesLoading] = useState(true);

  const handleToggleTracked = useCallback((abbr: string) => {
    setTracked((prev) => {
      const next = new Set(prev);
      if (next.has(abbr)) next.delete(abbr);
      else next.add(abbr);
      return next;
    });
  }, []);

  const handleToggleLayer = useCallback((key: LayerKey) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  // Fetch solar data when solar or index layer is toggled on
  useEffect(() => {
    if ((layers.solar || layers.index) && !solarFetched) {
      setSolarLoading(true);
      supabase.functions.invoke("pvwatts-states").then(({ data, error }) => {
        if (!error && data?.data) {
          setSolarData(data.data);
        }
        setSolarFetched(true);
        setSolarLoading(false);
      });
    }
  }, [layers.solar, layers.index, solarFetched]);

  useEffect(() => {
    async function fetchRates() {
      setRatesLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("eia-rates");
        if (error) throw error;
        setStateRates(data.rates || []);
        setRatesFetched(data.fetched_at);
      } catch (err: any) {
        console.error("Rates fetch error:", err);
        setStateRates([]);
        setRatesError(err.message || "Failed to fetch rates");
      } finally {
        setRatesLoading(false);
      }
    }

    async function fetchMetrics() {
      setMetricsLoading(true);
      // Trigger ATB benchmarks upsert (cached for 30 days), then read market_metrics
      await supabase.functions.invoke("atb-benchmarks").catch(() => {});
      const { data } = await supabase.from("market_metrics").select("*").order("metric_name");
      if (data) setMetrics(data as MarketMetric[]);
      setMetricsLoading(false);
    }

    async function fetchIncentives() {
      setIncentivesLoading(true);
      const { data } = await supabase.from("incentive_status").select("*").order("state").order("program_name");
      if (data) setIncentives(data as IncentiveStatus[]);
      setIncentivesLoading(false);
    }

    fetchRates();
    fetchMetrics();
    fetchIncentives();
  }, []);

  const lastUpdated = ratesFetched
    ? format(new Date(ratesFetched), "MMM d, yyyy 'at' h:mm a")
    : "—";

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Activity className="h-6 w-6 text-amber-400" />
              <h1 className="font-display text-2xl font-bold tracking-tight text-zinc-50 md:text-3xl">
                Market Intelligence
              </h1>
            </div>
            <div className="flex items-center gap-2 font-mono text-xs text-zinc-500">
              <Clock className="h-3.5 w-3.5" />
              <span>Last updated: {lastUpdated}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto space-y-12 px-4 py-10">
        {/* Section 1: US Electricity Rate Map */}
        <section>
          <div className="mb-6 flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-400" />
            <h2 className="font-display text-xl font-bold text-zinc-50">US Residential Electricity Rates</h2>
            <span className="ml-2 rounded bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-amber-400">
              Live EIA Data
            </span>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-4">
            <ElectricityRateMap
              rates={stateRates}
              loading={ratesLoading}
              tracked={tracked}
              onToggleTracked={handleToggleTracked}
              layers={layers}
              onToggleLayer={handleToggleLayer}
              solarData={solarData}
              solarLoading={solarLoading}
            />
          </div>
          {ratesError && (
            <p className="mt-2 font-mono text-xs text-red-400">Note: {ratesError}</p>
          )}
        </section>

        {/* Section 2: Selected States Comparison Table */}
        {!ratesLoading && (
          <section>
            <TrackedStatesTable
              rates={stateRates}
              tracked={tracked}
              onRemove={handleToggleTracked}
              layers={layers}
              solarData={solarData}
            />
          </section>
        )}

        {/* Section 3: Weekly Benchmarks */}
        <section>
          <div className="mb-6 flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-amber-400" />
            <h2 className="font-display text-xl font-bold text-zinc-50">Weekly Benchmarks</h2>
          </div>
          {metricsLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-28 animate-pulse rounded-lg bg-zinc-800/50" />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {metrics.map((m) => (
                <div key={m.id} className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-4 transition-colors hover:border-amber-500/30">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-mono text-xs uppercase tracking-wider text-zinc-400">Benchmark</span>
                    <TrendIcon trend={m.trend} className="h-4 w-4" />
                  </div>
                  <p className="mb-1 font-display text-sm font-semibold text-zinc-200">{m.metric_name}</p>
                  <p className="font-mono text-2xl font-bold text-amber-400 tabular-nums">
                    {m.value}
                    <span className="ml-1 text-sm font-normal text-zinc-500">{m.unit}</span>
                  </p>
                  {m.notes && <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-zinc-500">{m.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Section 4: Incentive Program Status */}
        <section>
          <div className="mb-6 flex items-center gap-2">
            <Activity className="h-5 w-5 text-amber-400" />
            <h2 className="font-display text-xl font-bold text-zinc-50">Incentive Program Status</h2>
          </div>
          {incentivesLoading ? (
            <div className="h-64 animate-pulse rounded-lg bg-zinc-800/50" />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-zinc-800">
              <table className="w-full min-w-[600px] text-left">
                <thead className="border-b border-zinc-800 bg-zinc-900/50">
                  <tr>
                    <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-zinc-500">Program</th>
                    <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-zinc-500">State</th>
                    <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-zinc-500">Status</th>
                    <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-zinc-500">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {incentives.map((inc) => (
                    <tr key={inc.id} className="bg-zinc-900/30 transition-colors hover:bg-zinc-800/30">
                      <td className="px-4 py-3 font-mono text-sm text-zinc-200">{inc.program_name}</td>
                      <td className="px-4 py-3 font-mono text-sm text-zinc-400">{inc.state}</td>
                      <td className="px-4 py-3"><StatusBadge status={inc.status} /></td>
                      <td className="max-w-xs truncate px-4 py-3 text-xs text-zinc-500">{inc.notes || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
