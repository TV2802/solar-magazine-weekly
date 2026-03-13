import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, TrendingDown, Minus, RefreshCw, ExternalLink } from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from "recharts";

// ─────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────
interface MarketMetric {
  id: string;
  metric_name: string;
  value: number;
  unit: string;
  trend: string;
  notes: string | null;
  updated_at: string;
}

type Tab = "residential" | "commercial" | "compare";

// ─────────────────────────────────────────
// STATIC DATA — cross-validated from 4 sources
// Update quarterly when SEIA drops executive summary
// ─────────────────────────────────────────
const RESI_TREND = [
  { year: "2020", seia: 3.99, lbl: 3.85 },
  { year: "2021", seia: 3.80, lbl: 3.70 },
  { year: "2022", seia: 3.72, lbl: 3.60 },
  { year: "2023", seia: 3.55, lbl: 3.48 },
  { year: "2024", seia: 3.47, lbl: 3.38, atb: 3.54 },
  { year: "Q4 2025", seia: 3.39 },
];

const COMM_TREND = [
  { year: "2020", seia: 2.20, lbl: 2.10 },
  { year: "2021", seia: 2.10, lbl: 2.00 },
  { year: "2022", seia: 2.00, lbl: 1.92, atb: 2.05 },
  { year: "2023", seia: 1.85, lbl: 1.80 },
  { year: "2024", seia: 1.75, lbl: 1.68, atb: 1.64 },
  { year: "Q4 2025", seia: 1.71 },
];

const COMPARE_DATA = [
  { year: "2021", residential: 3.80, commercial: 2.10 },
  { year: "2022", residential: 3.72, commercial: 2.00 },
  { year: "2023", residential: 3.55, commercial: 1.85 },
  { year: "2024", residential: 3.47, commercial: 1.75 },
  { year: "Q4 2025", residential: 3.39, commercial: 1.71 },
];

const BESS_TREND = [
  { year: "2021", value: 820 },
  { year: "2022", value: 680 },
  { year: "2023", value: 590 },
  { year: "2024", value: 499 },
];

const SOURCES = [
  {
    name: "SEIA / Wood Mackenzie",
    description: "Quarterly Solar Market Insight",
    period: "Q4 2025",
    status: "manual",
    url: "https://www.seia.org/research-resources/solar-market-insight-report-2025-q4",
  },
  {
    name: "NREL ATB",
    description: "Annual Technology Baseline",
    period: "2024",
    status: "auto",
    url: "https://atb.nrel.gov/electricity/2024/index",
  },
  {
    name: "LBL Tracking the Sun",
    description: "Installed PV cost by state",
    period: "2024",
    status: "manual",
    url: "https://emp.lbl.gov/tracking-the-sun",
  },
  {
    name: "RMI / CPUC",
    description: "DG economics & SGIP rates",
    period: "As published",
    status: "manual",
    url: "https://rmi.org",
  },
];

// ─────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────
const TrendIcon = ({ trend }: { trend: string }) => {
  if (trend === "up") return <TrendingUp className="h-4 w-4 text-red-400" />;
  if (trend === "down") return <TrendingDown className="h-4 w-4 text-green-400" />;
  return <Minus className="h-4 w-4 text-zinc-500" />;
};

const SourceBadge = ({ status }: { status: string }) => (
  <span className={`inline-block rounded border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${
    status === "auto"
      ? "border-green-500/30 bg-green-500/10 text-green-400"
      : "border-amber-500/30 bg-amber-500/10 text-amber-400"
  }`}>
    {status === "auto" ? "Auto" : "Manual"}
  </span>
);

const MetricCard = ({ metric }: { metric: MarketMetric }) => (
  <div className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-4 transition-colors hover:border-amber-500/30">
    <div className="mb-2 flex items-center justify-between">
      <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">Benchmark</span>
      <TrendIcon trend={metric.trend} />
    </div>
    <p className="mb-1 text-sm font-semibold text-zinc-200">{metric.metric_name}</p>
    <p className="font-mono text-2xl font-bold tabular-nums text-amber-400">
      {metric.value}
      <span className="ml-1 text-sm font-normal text-zinc-500">{metric.unit}</span>
    </p>
    {metric.notes && (
      <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-zinc-500">{metric.notes}</p>
    )}
    <p className="mt-2 font-mono text-[10px] text-zinc-600">
      Updated {new Date(metric.updated_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
    </p>
  </div>
);

const chartTooltipStyle = {
  contentStyle: {
    background: "#18181b",
    border: "0.5px solid #3f3f46",
    borderRadius: 8,
    color: "#e4e4e7",
    fontSize: 12,
  },
};

// ─────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────
export default function BenchmarkDashboard() {
  const [tab, setTab] = useState<Tab>("residential");
  const [metrics, setMetrics] = useState<MarketMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMetrics = async () => {
    setLoading(true);
    await supabase.functions.invoke("atb-benchmarks").catch(() => {});
    const { data } = await supabase.from("market_metrics").select("*").order("metric_name");
    if (data) setMetrics(data as MarketMetric[]);
    setLoading(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchMetrics();
    setRefreshing(false);
  };

  useEffect(() => { fetchMetrics(); }, []);

  const tabs: { key: Tab; label: string }[] = [
    { key: "residential", label: "Residential" },
    { key: "commercial", label: "Commercial" },
    { key: "compare", label: "Resi vs Commercial" },
  ];

  const resiMetrics = metrics.filter(m =>
    m.metric_name.toLowerCase().includes("residential") ||
    m.metric_name.toLowerCase().includes("itc") ||
    m.metric_name.toLowerCase().includes("sgip") ||
    m.metric_name.toLowerCase().includes("module")
  );

  const commMetrics = metrics.filter(m =>
    m.metric_name.toLowerCase().includes("commercial") ||
    m.metric_name.toLowerCase().includes("itc") ||
    m.metric_name.toLowerCase().includes("bess")
  );

  return (
    <section>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-zinc-50">Cost Benchmarks</h2>
          <span className="ml-1 rounded bg-zinc-800 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-zinc-400">
            4 sources
          </span>
        </div>
        <div className="flex items-center gap-3">
          {/* Tabs */}
          <div className="flex gap-2">
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
                  tab === t.key
                    ? "border-transparent bg-amber-500/20 font-medium text-amber-400"
                    : "border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 rounded border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:border-zinc-500 hover:text-zinc-200"
          >
            <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-lg bg-zinc-800/50" />
          ))}
        </div>
      ) : (
        <>
          {/* ── RESIDENTIAL TAB ── */}
          {tab === "residential" && (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {resiMetrics.length > 0
                  ? resiMetrics.map(m => <MetricCard key={m.id} metric={m} />)
                  : metrics.slice(0, 4).map(m => <MetricCard key={m.id} metric={m} />)
                }
              </div>
              <div className="grid gap-6 lg:grid-cols-3">
                {/* Trend chart */}
                <div className="col-span-2 rounded-lg border border-zinc-800 bg-zinc-900/80 p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-sm font-semibold text-zinc-200">Residential PV installed cost ($/Wdc)</p>
                    <div className="flex gap-4 font-mono text-[10px] text-zinc-500">
                      <span className="flex items-center gap-1"><span className="inline-block h-2 w-4 rounded" style={{background:"#F59E0B"}} />SEIA/WoodMac</span>
                      <span className="flex items-center gap-1"><span className="inline-block h-2 w-4 rounded" style={{background:"#1D9E75"}} />LBL</span>
                      <span className="flex items-center gap-1"><span className="inline-block h-[2px] w-4 border-t-2 border-dashed border-zinc-400" />NREL ATB</span>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={RESI_TREND}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                      <XAxis dataKey="year" tick={{ fill: "#71717a", fontSize: 11 }} />
                      <YAxis tick={{ fill: "#71717a", fontSize: 11 }} tickFormatter={v => `$${v}`} domain={[2.8, 4.2]} />
                      <Tooltip {...chartTooltipStyle} formatter={(v: number) => [`$${v.toFixed(2)}/Wdc`]} />
                      <Line dataKey="seia" name="SEIA/WoodMac" stroke="#F59E0B" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                      <Line dataKey="lbl" name="LBL" stroke="#1D9E75" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                      <Line dataKey="atb" name="NREL ATB" stroke="#71717a" strokeWidth={1} strokeDasharray="4 3" dot={{ r: 4 }} connectNulls />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                {/* Source validation */}
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-4">
                  <p className="mb-4 text-sm font-semibold text-zinc-200">Data sources</p>
                  <div className="space-y-3">
                    {SOURCES.map((s, i) => (
                      <div key={i}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-medium text-zinc-200">{s.name}</p>
                            <p className="font-mono text-[10px] text-zinc-500">{s.description} · {s.period}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <SourceBadge status={s.status} />
                            <a href={s.url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-3 w-3 text-zinc-600 hover:text-zinc-300" />
                            </a>
                          </div>
                        </div>
                        {i < SOURCES.length - 1 && <hr className="mt-3 border-zinc-800" />}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {/* BESS trend */}
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-4">
                <p className="mb-4 text-sm font-semibold text-zinc-200">Residential BESS cost trend ($/kWh) — NREL ATB Moderate</p>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={BESS_TREND}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="year" tick={{ fill: "#71717a", fontSize: 11 }} />
                    <YAxis tick={{ fill: "#71717a", fontSize: 11 }} tickFormatter={v => `$${v}`} />
                    <Tooltip {...chartTooltipStyle} formatter={(v: number) => [`$${v}/kWh`]} />
                    <Bar dataKey="value" name="BESS cost" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ── COMMERCIAL TAB ── */}
          {tab === "commercial" && (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {commMetrics.length > 0
                  ? commMetrics.map(m => <MetricCard key={m.id} metric={m} />)
                  : metrics.slice(0, 4).map(m => <MetricCard key={m.id} metric={m} />)
                }
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-4">
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-sm font-semibold text-zinc-200">Commercial PV installed cost ($/Wdc)</p>
                  <div className="flex gap-4 font-mono text-[10px] text-zinc-500">
                    <span className="flex items-center gap-1"><span className="inline-block h-2 w-4 rounded" style={{background:"#F59E0B"}} />SEIA/WoodMac</span>
                    <span className="flex items-center gap-1"><span className="inline-block h-2 w-4 rounded" style={{background:"#1D9E75"}} />LBL</span>
                    <span className="flex items-center gap-1"><span className="inline-block h-[2px] w-4 border-t-2 border-dashed border-zinc-400" />NREL ATB</span>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={COMM_TREND}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="year" tick={{ fill: "#71717a", fontSize: 11 }} />
                    <YAxis tick={{ fill: "#71717a", fontSize: 11 }} tickFormatter={v => `$${v}`} domain={[1.2, 2.4]} />
                    <Tooltip {...chartTooltipStyle} formatter={(v: number) => [`$${v.toFixed(2)}/Wdc`]} />
                    <Line dataKey="seia" name="SEIA/WoodMac" stroke="#F59E0B" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                    <Line dataKey="lbl" name="LBL" stroke="#1D9E75" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                    <Line dataKey="atb" name="NREL ATB" stroke="#71717a" strokeWidth={1} strokeDasharray="4 3" dot={{ r: 4 }} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ── COMPARE TAB ── */}
          {tab === "compare" && (
            <div className="space-y-6">
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-4">
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-sm font-semibold text-zinc-200">Residential vs commercial installed cost ($/Wdc)</p>
                  <div className="flex gap-4 font-mono text-[10px] text-zinc-500">
                    <span className="flex items-center gap-1"><span className="inline-block h-2 w-4 rounded" style={{background:"#F59E0B"}} />Residential</span>
                    <span className="flex items-center gap-1"><span className="inline-block h-2 w-4 rounded" style={{background:"#1D9E75"}} />Commercial</span>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={COMPARE_DATA}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="year" tick={{ fill: "#71717a", fontSize: 11 }} />
                    <YAxis tick={{ fill: "#71717a", fontSize: 11 }} tickFormatter={v => `$${v}`} />
                    <Tooltip {...chartTooltipStyle} formatter={(v: number) => [`$${v.toFixed(2)}/Wdc`]} />
                    <Bar dataKey="residential" name="Residential" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="commercial" name="Commercial" fill="#1D9E75" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {/* Premium gap callout */}
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
                <p className="mb-1 text-sm font-semibold text-amber-400">Residential premium vs commercial</p>
                <p className="text-2xl font-bold text-zinc-100">
                  +${(3.39 - 1.71).toFixed(2)}/Wdc
                  <span className="ml-2 text-sm font-normal text-zinc-400">
                    ({Math.round(((3.39 - 1.71) / 1.71) * 100)}% higher) as of Q4 2025
                  </span>
                </p>
                <p className="mt-2 text-xs text-zinc-500">
                  Source: SEIA/Wood Mackenzie Solar Market Insight Q4 2025. Residential includes customer acquisition, permitting, and interconnection costs not present in commercial projects.
                </p>
              </div>
              {/* All metrics side by side */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {metrics.map(m => <MetricCard key={m.id} metric={m} />)}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
