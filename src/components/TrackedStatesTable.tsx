import { useMemo, useState, useCallback } from "react";
import { TrendingUp, TrendingDown, Minus, X, ArrowUpDown, Download } from "lucide-react";
import { STATE_TO_ISO } from "./ElectricityRateMap";
import type { StateRate, Layers, SolarData } from "./ElectricityRateMap";

interface Props {
  rates: StateRate[];
  tracked: Set<string>;
  onRemove: (abbr: string) => void;
  layers: Layers;
  solarData: SolarData[];
}

type SortKey = "state" | "iso" | "rate" | "diff" | "trend" | "period" | "solar" | "opportunity";
type SortDir = "asc" | "desc";

const TrendIcon = ({ trend }: { trend: string }) => {
  if (trend === "up") return <TrendingUp className="inline h-3.5 w-3.5 text-green-400" />;
  if (trend === "down") return <TrendingDown className="inline h-3.5 w-3.5 text-red-400" />;
  return <Minus className="inline h-3.5 w-3.5 text-zinc-500" />;
};

function OpportunityBar({ score }: { score: number }) {
  const color = score >= 66 ? "bg-green-500" : score >= 33 ? "bg-yellow-500" : "bg-red-500";
  const textColor = score >= 66 ? "text-green-400" : score >= 33 ? "text-yellow-400" : "text-red-400";
  return (
    <div className="flex items-center gap-2">
      <span className={`font-mono text-sm font-bold tabular-nums ${textColor}`}>{score}</span>
      <div className="h-2 w-16 overflow-hidden rounded-full bg-zinc-800">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

export default function TrackedStatesTable({ rates, tracked, onRemove, layers, solarData }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("rate");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const rateMap = useMemo(() => {
    const m: Record<string, StateRate> = {};
    for (const r of rates) m[r.stateId] = r;
    return m;
  }, [rates]);

  const solarMap = useMemo(() => {
    const m: Record<string, SolarData> = {};
    for (const s of solarData) m[s.state_id] = s;
    return m;
  }, [solarData]);

  const usAvg = useMemo(() => {
    const prices = rates.filter((r) => r.price != null).map((r) => r.price as number);
    if (!prices.length) return null;
    return prices.reduce((a, b) => a + b, 0) / prices.length;
  }, [rates]);

  // Compute opportunity scores (0-100)
  const opportunityScores = useMemo(() => {
    const prices = rates.filter((r) => r.price != null).map((r) => r.price as number);
    const solars = solarData.filter((s) => s.ac_annual != null).map((s) => (s.ac_annual as number) / 10);
    if (!prices.length || !solars.length) return {};

    const minP = Math.min(...prices), maxP = Math.max(...prices);
    const minS = Math.min(...solars), maxS = Math.max(...solars);
    const rangeP = maxP - minP || 1;
    const rangeS = maxS - minS || 1;

    const m: Record<string, number> = {};
    for (const abbr of Object.keys(rateMap)) {
      const rate = rateMap[abbr];
      const solar = solarMap[abbr];
      if (rate?.price != null && solar?.ac_annual != null) {
        const normR = (rate.price - minP) / rangeP;
        const normS = (solar.ac_annual / 10 - minS) / rangeS;
        m[abbr] = Math.round(normR * normS * 100);
      }
    }
    return m;
  }, [rates, solarData, rateMap, solarMap]);

  const rows = useMemo(() => {
    const trackedArr = Array.from(tracked);
    return trackedArr.map((abbr) => {
      const rate = rateMap[abbr];
      const price = rate?.price != null ? parseFloat(String(rate.price)) : null;
      const iso = STATE_TO_ISO[abbr];
      const diff = price != null && usAvg != null ? price - usAvg : null;
      const solar = solarMap[abbr];
      return {
        abbr,
        state: rate?.stateName || abbr,
        iso: iso?.name || "N/A",
        isoColor: iso?.tracked ?? "#666",
        rate: price,
        diff,
        trend: rate?.trend || "neutral",
        period: rate?.period || "N/A",
        solarKwh: solar?.ac_annual != null ? solar.ac_annual / 10 : null,
        opportunity: opportunityScores[abbr] ?? null,
      };
    });
  }, [tracked, rateMap, usAvg, solarMap, opportunityScores]);

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "state": cmp = a.state.localeCompare(b.state); break;
        case "iso": cmp = a.iso.localeCompare(b.iso); break;
        case "rate": cmp = (a.rate ?? -1) - (b.rate ?? -1); break;
        case "diff": cmp = (a.diff ?? -999) - (b.diff ?? -999); break;
        case "trend": cmp = a.trend.localeCompare(b.trend); break;
        case "period": cmp = a.period.localeCompare(b.period); break;
        case "solar": cmp = (a.solarKwh ?? -1) - (b.solarKwh ?? -1); break;
        case "opportunity": cmp = (a.opportunity ?? -1) - (b.opportunity ?? -1); break;
      }
      return sortDir === "desc" ? -cmp : cmp;
    });
    return copy;
  }, [rows, sortKey, sortDir]);

  const toggleSort = useCallback((key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }, [sortKey]);

  const exportCSV = useCallback(() => {
    const cols = ["State", "ISO Region", "Rate (¢/kWh)", "vs US Avg", "Trend", "Last Updated"];
    if (layers.solar) cols.push("Avg Yield (kWh/yr)");
    if (layers.index) cols.push("Opportunity Index");
    const header = cols.join(",");
    const csvRows = sorted.map((r) => {
      const rateStr = r.rate != null ? r.rate.toFixed(2) : "N/A";
      const diffStr = r.diff != null ? (r.diff >= 0 ? `+${r.diff.toFixed(2)}` : r.diff.toFixed(2)) : "N/A";
      const parts = [`"${r.state}"`, `"${r.iso}"`, rateStr, diffStr, r.trend, r.period];
      if (layers.solar) parts.push(r.solarKwh != null ? Math.round(r.solarKwh).toString() : "N/A");
      if (layers.index) parts.push(r.opportunity != null ? r.opportunity.toString() : "N/A");
      return parts.join(",");
    });
    const csv = [header, ...csvRows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "electricity-rates-comparison.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, [sorted, layers]);

  const SortHeader = ({ label, k, className = "" }: { label: string; k: SortKey; className?: string }) => (
    <th
      className={`cursor-pointer select-none px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-zinc-500 transition-colors hover:text-amber-400 ${className}`}
      onClick={() => toggleSort(k)}
    >
      <span className="flex items-center gap-1">
        {label}
        <ArrowUpDown className={`h-2.5 w-2.5 ${sortKey === k ? "text-amber-400" : "text-zinc-700"}`} />
      </span>
    </th>
  );

  if (tracked.size === 0) return null;

  const colTransition = "transition-all duration-300 ease-in-out";

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-800">
      <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900/50 px-4 py-3">
        <div className="flex items-center gap-2">
          <h3 className="font-display text-sm font-bold text-zinc-200">Selected States Comparison</h3>
          <span className="rounded bg-amber-500/10 px-1.5 py-0.5 font-mono text-[10px] text-amber-400">
            {tracked.size} states
          </span>
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-1.5 rounded border border-zinc-700 bg-zinc-800 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-zinc-300 transition-colors hover:border-amber-500/50 hover:text-amber-400"
        >
          <Download className="h-3 w-3" />
          Export CSV
        </button>
      </div>
      <table className="w-full min-w-[700px] text-left">
        <thead className="border-b border-zinc-800 bg-zinc-900/30">
          <tr>
            <SortHeader label="State" k="state" />
            <SortHeader label="ISO Region" k="iso" />
            <SortHeader label="Rate (¢/kWh)" k="rate" />
            <SortHeader label="vs US Avg" k="diff" />
            <SortHeader label="Trend" k="trend" />
            {layers.solar && (
              <SortHeader label="Avg Yield (kWh/yr)" k="solar" className={colTransition} />
            )}
            {layers.index && (
              <SortHeader label="Opportunity Index" k="opportunity" className={colTransition} />
            )}
            <SortHeader label="Last Updated" k="period" />
            <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-zinc-500" />
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/50">
          {sorted.map((r) => (
            <tr key={r.abbr} className="bg-zinc-900/30 transition-colors hover:bg-zinc-800/30">
              <td className="px-4 py-3">
                <span className="font-mono text-sm font-semibold text-zinc-200">{r.state}</span>
                <span className="ml-1.5 font-mono text-[10px] text-zinc-600">{r.abbr}</span>
              </td>
              <td className="px-4 py-3">
                <span
                  className="inline-flex items-center gap-1.5 rounded px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider"
                  style={{
                    backgroundColor: r.isoColor + "22",
                    color: r.isoColor,
                  }}
                >
                  <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: r.isoColor }} />
                  {r.iso}
                </span>
              </td>
              <td className="px-4 py-3 font-mono text-sm font-bold tabular-nums text-amber-400">
                {r.rate != null ? r.rate.toFixed(2) : "—"}
              </td>
              <td className="px-4 py-3">
                {r.diff != null ? (
                  <span className={`font-mono text-sm font-semibold tabular-nums ${r.diff >= 0 ? "text-red-400" : "text-green-400"}`}>
                    {r.diff >= 0 ? "+" : ""}{r.diff.toFixed(2)}
                  </span>
                ) : (
                  <span className="font-mono text-sm text-zinc-600">—</span>
                )}
              </td>
              <td className="px-4 py-3">
                <TrendIcon trend={r.trend} />
              </td>
              {layers.solar && (
                <td className={`px-4 py-3 ${colTransition}`}>
                  <span className="font-mono text-sm font-semibold tabular-nums text-yellow-300">
                    {r.solarKwh != null ? Math.round(r.solarKwh).toLocaleString() : "—"}
                  </span>
                </td>
              )}
              {layers.index && (
                <td className={`px-4 py-3 ${colTransition}`}>
                  {r.opportunity != null ? (
                    <OpportunityBar score={r.opportunity} />
                  ) : (
                    <span className="font-mono text-sm text-zinc-600">—</span>
                  )}
                </td>
              )}
              <td className="px-4 py-3 font-mono text-xs text-zinc-500">{r.period}</td>
              <td className="px-4 py-3">
                <button
                  onClick={() => onRemove(r.abbr)}
                  className="rounded p-1 text-zinc-600 transition-colors hover:bg-zinc-800 hover:text-red-400"
                  title={`Remove ${r.state}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {usAvg != null && (
        <div className="border-t border-zinc-800 bg-zinc-900/20 px-4 py-2 font-mono text-[10px] text-zinc-600">
          US Average: {usAvg.toFixed(2)} ¢/kWh (across {rates.filter((r) => r.price != null).length} states)
        </div>
      )}
    </div>
  );
}
