// ============================================================
// StatePreviewPanel.tsx
// The dramatic slide-in panel on first map click.
// Shows headline numbers + recent articles + CTA to full hub.
//
// Props:
//   abbr        — two-letter state abbreviation
//   onClose     — called when panel is dismissed
//   onTrack     — called to toggle tracking for this state
//   isTracked   — whether state is currently tracked
//   rates       — full rates array from EIA
//   solarData   — full solar data array
// ============================================================

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, ArrowRight, Bookmark, BookmarkCheck, ExternalLink, Zap, Sun, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { STATE_TO_ISO, ABBR_TO_NAME } from "@/components/ElectricityRateMap";
import type { StateRate, SolarData } from "@/components/ElectricityRateMap";

// ── State-specific headline data ──────────────────────────────
// Add new states here as you expand beyond CA
const STATE_HEADLINES: Record<string, {
  nem: string;
  nem_status: "strong" | "reduced" | "caution";
  key_incentive: string;
  incentive_status: "active" | "waitlist" | "closed";
  watch: string;
  utility_count: number;
}> = {
  CA: {
    nem: "NEM 3.0 / Net Billing — ~$0.05/kWh export",
    nem_status: "reduced",
    key_incentive: "SGIP — Equity Resiliency open",
    incentive_status: "active",
    watch: "CPUC Multifamily Solar proceeding active",
    utility_count: 4,
  },
  NY: {
    nem: "VDER / CDG — value stack credits",
    nem_status: "strong",
    key_incentive: "NY-Sun — Con Ed territory active",
    incentive_status: "active",
    watch: "Consolidated Edison NEM successor rule pending",
    utility_count: 3,
  },
  TX: {
    nem: "No statewide NEM — utility-by-utility",
    nem_status: "caution",
    key_incentive: "Federal ITC only — no state incentive",
    incentive_status: "active",
    watch: "ERCOT interconnection queue reform ongoing",
    utility_count: 5,
  },
  MA: {
    nem: "SMART program — fixed $/kWh adder",
    nem_status: "strong",
    key_incentive: "SMART — Block 5 active in some utilities",
    incentive_status: "waitlist",
    watch: "Eversource SMART capacity nearly full",
    utility_count: 3,
  },
  NJ: {
    nem: "Net metering — full retail rate",
    nem_status: "strong",
    key_incentive: "TREC — $152/TREC active",
    incentive_status: "active",
    watch: "Successor solar incentive program in development",
    utility_count: 3,
  },
  CO: {
    nem: "Net metering — full retail rate",
    nem_status: "strong",
    key_incentive: "Xcel REC program + Federal ITC",
    incentive_status: "active",
    watch: "Xcel Energy clean energy plan filing 2026",
    utility_count: 2,
  },
};

// ── Sub-components ────────────────────────────────────────────
const NEMBadge = ({ status }: { status: "strong" | "reduced" | "caution" }) => {
  const map = {
    strong:  "bg-green-500/15 text-green-400 border-green-500/30",
    reduced: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    caution: "bg-red-500/15 text-red-400 border-red-500/30",
  };
  const label = { strong: "Strong", reduced: "Reduced", caution: "Limited" };
  return (
    <span className={`inline-block rounded border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${map[status]}`}>
      {label[status]}
    </span>
  );
};

const IncentiveBadge = ({ status }: { status: "active" | "waitlist" | "closed" }) => {
  const map = {
    active:  "bg-green-500/15 text-green-400 border-green-500/30",
    waitlist:"bg-amber-500/15 text-amber-400 border-amber-500/30",
    closed:  "bg-red-500/15 text-red-400 border-red-500/30",
  };
  return (
    <span className={`inline-block rounded border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${map[status]}`}>
      {status}
    </span>
  );
};

const TrendIcon = ({ trend }: { trend: string }) => {
  if (trend === "up") return <TrendingUp className="h-3.5 w-3.5 text-red-400" />;
  if (trend === "down") return <TrendingDown className="h-3.5 w-3.5 text-green-400" />;
  return <Minus className="h-3.5 w-3.5 text-zinc-500" />;
};

// ── Props ─────────────────────────────────────────────────────
interface Props {
  abbr: string;
  onClose: () => void;
  onTrack: (abbr: string) => void;
  isTracked: boolean;
  rates: StateRate[];
  solarData: SolarData[];
}

interface Article {
  id: string;
  title: string;
  summary: string;
  source_url: string;
  source_name: string;
  published_at: string;
  topic: string;
}

// ── Main component ────────────────────────────────────────────
export default function StatePreviewPanel({
  abbr, onClose, onTrack, isTracked, rates, solarData
}: Props) {
  const navigate = useNavigate();
  const [articles, setArticles] = useState<Article[]>([]);
  const [articlesLoading, setArticlesLoading] = useState(true);
  const [visible, setVisible] = useState(false);

  const stateName = ABBR_TO_NAME[abbr] || abbr;
  const iso = STATE_TO_ISO[abbr];
  const rate = rates.find(r => r.stateId === abbr);
  const solar = solarData.find(s => s.state_id === abbr);
  const headline = STATE_HEADLINES[abbr];

  // Animate in on mount
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 20);
    return () => clearTimeout(t);
  }, []);

  // Fetch latest articles tagged to this state
  useEffect(() => {
    async function fetchArticles() {
      setArticlesLoading(true);
      const { data } = await supabase
        .from("articles")
        .select("id, title, summary, source_url, source_name, published_at, topic")
        .contains("states", [abbr])
        .order("published_at", { ascending: false })
        .limit(3);
      setArticles(data || []);
      setArticlesLoading(false);
    }
    fetchArticles();
  }, [abbr]);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 300);
  };

  const handleEnter = () => {
    // Only CA has a full hub page right now
    if (abbr === "CA") {
      navigate("/market/CA");
    }
  };

  const hasFullHub = abbr === "CA"; // expand as more state pages are built

  return (
    <>
      {/* Backdrop — dims the rest of the page */}
      <div
        className={`fixed inset-0 z-40 bg-black transition-opacity duration-300 ${
          visible ? "opacity-40" : "opacity-0"
        }`}
        onClick={handleClose}
      />

      {/* Panel */}
      <div
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-lg flex-col border-l border-zinc-800 bg-zinc-950 shadow-2xl transition-transform duration-300 ease-out ${
          visible ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* ── Header ── */}
        <div className="flex items-start justify-between border-b border-zinc-800 p-6">
          <div>
            <div className="flex items-center gap-3">
              <div>
                <p className="font-mono text-xs uppercase tracking-widest text-zinc-500">
                  {iso?.name || "ISO N/A"} · State Market Guide
                </p>
                <h2 className="mt-0.5 text-3xl font-bold tracking-tight text-zinc-50">
                  {stateName}
                </h2>
              </div>
              <span
                className="rounded-lg px-2.5 py-1 font-mono text-sm font-bold"
                style={{
                  backgroundColor: (iso?.tracked || "#f59e0b") + "22",
                  color: iso?.tracked || "#f59e0b",
                  border: `1px solid ${(iso?.tracked || "#f59e0b")}44`,
                }}
              >
                {abbr}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onTrack(abbr)}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                isTracked
                  ? "border-amber-500/50 bg-amber-500/10 text-amber-400"
                  : "border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
              }`}
            >
              {isTracked
                ? <><BookmarkCheck className="h-3.5 w-3.5" /> Tracked</>
                : <><Bookmark className="h-3.5 w-3.5" /> Track</>
              }
            </button>
            <button
              onClick={handleClose}
              className="rounded-lg border border-zinc-800 p-1.5 text-zinc-500 transition-colors hover:border-zinc-600 hover:text-zinc-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto">

          {/* Live numbers */}
          <div className="grid grid-cols-2 gap-3 p-6 pb-0">
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Zap className="h-3.5 w-3.5 text-amber-400" />
                <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">Avg Rate</p>
              </div>
              <div className="flex items-center gap-2">
                <p className="font-mono text-xl font-bold text-amber-400">
                  {rate?.price != null ? `${parseFloat(String(rate.price)).toFixed(1)}¢` : "—"}
                </p>
                {rate?.trend && <TrendIcon trend={rate.trend} />}
              </div>
              <p className="font-mono text-[10px] text-zinc-600 mt-0.5">/kWh residential</p>
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Sun className="h-3.5 w-3.5 text-yellow-400" />
                <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">Avg Yield</p>
              </div>
              <p className="font-mono text-xl font-bold text-yellow-400">
                {solar?.ac_annual != null
                  ? `${Math.round(solar.ac_annual / 10).toLocaleString()}`
                  : "—"}
              </p>
              <p className="font-mono text-[10px] text-zinc-600 mt-0.5">kWh/yr per kW</p>
            </div>
          </div>

          {/* Policy snapshot */}
          {headline && (
            <div className="space-y-3 p-6 pb-0">
              <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">Policy Snapshot</p>

              <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-600 mb-0.5">Net Metering</p>
                    <p className="text-sm text-zinc-300">{headline.nem}</p>
                  </div>
                  <NEMBadge status={headline.nem_status} />
                </div>
              </div>

              <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-600 mb-0.5">Key Incentive</p>
                    <p className="text-sm text-zinc-300">{headline.key_incentive}</p>
                  </div>
                  <IncentiveBadge status={headline.incentive_status} />
                </div>
              </div>

              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                <p className="font-mono text-[10px] uppercase tracking-wider text-amber-500/70 mb-0.5">Watch</p>
                <p className="text-sm text-zinc-300">{headline.watch}</p>
              </div>
            </div>
          )}

          {/* Latest articles */}
          <div className="p-6 pb-0">
            <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-500 mb-3">
              Latest {stateName} News
            </p>

            {articlesLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 animate-pulse rounded-lg bg-zinc-800/50" />
                ))}
              </div>
            ) : articles.length === 0 ? (
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 px-4 py-6 text-center">
                <p className="text-xs text-zinc-500">No {stateName} articles yet.</p>
                <p className="mt-1 text-[10px] text-zinc-600">Check back after the next issue drops.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {articles.map(a => (
                  <a
                    key={a.id}
                    href={a.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-start gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 transition-colors hover:border-amber-500/30 hover:bg-zinc-800/50"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-200 group-hover:text-amber-400 transition-colors line-clamp-2">
                        {a.title}
                      </p>
                      <p className="mt-1 font-mono text-[10px] text-zinc-600">
                        {a.source_name} · {new Date(a.published_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </p>
                    </div>
                    <ExternalLink className="h-3.5 w-3.5 flex-shrink-0 text-zinc-700 group-hover:text-amber-400 transition-colors mt-0.5" />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Spacer */}
          <div className="h-6" />
        </div>

        {/* ── Footer CTA ── */}
        <div className="border-t border-zinc-800 p-6">
          {hasFullHub ? (
            <button
              onClick={handleEnter}
              className="group flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 px-6 py-3 font-semibold text-zinc-950 transition-all hover:bg-amber-400 active:scale-[0.98]"
            >
              Open {stateName} Hub
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
          ) : (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-center">
              <p className="text-xs text-zinc-500">Full hub coming soon for {stateName}.</p>
              <p className="mt-0.5 text-[10px] text-zinc-600">California is the current exemplar market.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
