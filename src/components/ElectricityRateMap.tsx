import { useState, useMemo } from "react";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";

const GEO_URL = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";

const HIGHLIGHTED_STATES = ["CA", "NY", "TX", "MA", "NJ", "CO"];

// FIPS → state abbreviation mapping
const FIPS_TO_ABBR: Record<string, string> = {
  "01": "AL", "02": "AK", "04": "AZ", "05": "AR", "06": "CA",
  "08": "CO", "09": "CT", "10": "DE", "11": "DC", "12": "FL",
  "13": "GA", "15": "HI", "16": "ID", "17": "IL", "18": "IN",
  "19": "IA", "20": "KS", "21": "KY", "22": "LA", "23": "ME",
  "24": "MD", "25": "MA", "26": "MI", "27": "MN", "28": "MS",
  "29": "MO", "30": "MT", "31": "NE", "32": "NV", "33": "NH",
  "34": "NJ", "35": "NM", "36": "NY", "37": "NC", "38": "ND",
  "39": "OH", "40": "OK", "41": "OR", "42": "PA", "44": "RI",
  "45": "SC", "46": "SD", "47": "TN", "48": "TX", "49": "UT",
  "50": "VT", "51": "VA", "53": "WA", "54": "WV", "55": "WI",
  "56": "WY",
};

interface StateRate {
  stateId: string;
  stateName: string;
  price: number | null;
  period: string;
  trend: "up" | "down" | "neutral";
}

interface Props {
  rates: StateRate[];
  loading: boolean;
}

function getColor(price: number | null, min: number, max: number): string {
  if (price == null) return "#27272a"; // zinc-800
  const range = max - min || 1;
  const t = (price - min) / range; // 0 = cheapest, 1 = most expensive
  // dark blue → amber → red
  if (t < 0.33) {
    // dark blue to teal
    const s = t / 0.33;
    return `hsl(${210 - s * 30}, ${60 + s * 10}%, ${25 + s * 15}%)`;
  } else if (t < 0.66) {
    // teal to amber
    const s = (t - 0.33) / 0.33;
    return `hsl(${180 - s * 140}, ${70 + s * 10}%, ${35 + s * 15}%)`;
  } else {
    // amber to red
    const s = (t - 0.66) / 0.34;
    return `hsl(${40 - s * 40}, ${80 + s * 10}%, ${45 + s * 5}%)`;
  }
}

function TrendArrow({ trend }: { trend: string }) {
  if (trend === "up") return <span className="text-green-400">▲</span>;
  if (trend === "down") return <span className="text-red-400">▼</span>;
  return <span className="text-zinc-500">—</span>;
}

export default function ElectricityRateMap({ rates, loading }: Props) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; rate: StateRate } | null>(null);

  const rateMap = useMemo(() => {
    const m: Record<string, StateRate> = {};
    for (const r of rates) m[r.stateId] = r;
    return m;
  }, [rates]);

  const { min, max } = useMemo(() => {
    const prices = rates.filter((r) => r.price != null).map((r) => r.price as number);
    if (!prices.length) return { min: 0, max: 30 };
    return { min: Math.min(...prices), max: Math.max(...prices) };
  }, [rates]);

  if (loading) {
    return (
      <div className="flex h-[500px] items-center justify-center rounded-lg bg-zinc-800/50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
      </div>
    );
  }

  const legendSteps = 6;
  const legendColors = Array.from({ length: legendSteps }, (_, i) => {
    const price = min + (i / (legendSteps - 1)) * (max - min);
    return { price, color: getColor(price, min, max) };
  });

  return (
    <div className="relative">
      {/* Map */}
      <div
        className="relative"
        onMouseLeave={() => setTooltip(null)}
      >
        <ComposableMap
          projection="geoAlbersUsa"
          projectionConfig={{ scale: 1000 }}
          width={800}
          height={500}
          style={{ width: "100%", height: "auto" }}
        >
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const fips = geo.id;
                const abbr = FIPS_TO_ABBR[fips];
                const rate = abbr ? rateMap[abbr] : undefined;
                const isHighlighted = abbr && HIGHLIGHTED_STATES.includes(abbr);
                const fillColor = rate ? getColor(rate.price, min, max) : "#27272a";

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={fillColor}
                    stroke={isHighlighted ? "#f59e0b" : "#18181b"}
                    strokeWidth={isHighlighted ? 1.5 : 0.5}
                    style={{
                      default: { outline: "none" },
                      hover: { outline: "none", fill: "#fbbf24", cursor: "pointer" },
                      pressed: { outline: "none" },
                    }}
                    onMouseEnter={(evt) => {
                      if (rate) {
                        setTooltip({ x: evt.clientX, y: evt.clientY, rate });
                      }
                    }}
                    onMouseMove={(evt) => {
                      if (rate) {
                        setTooltip({ x: evt.clientX, y: evt.clientY, rate });
                      }
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  />
                );
              })
            }
          </Geographies>
        </ComposableMap>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="pointer-events-none fixed z-50 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 shadow-xl"
          style={{ left: tooltip.x + 12, top: tooltip.y - 10 }}
        >
          <p className="font-display text-sm font-bold text-zinc-100">{tooltip.rate.stateName}</p>
          <p className="font-mono text-lg font-bold text-amber-400">
            {tooltip.rate.price != null
              ? `${parseFloat(String(tooltip.rate.price)).toFixed(2)} ¢/kWh`
              : "No data"}
          </p>
          <p className="flex items-center gap-1 font-mono text-xs text-zinc-400">
            vs prev month: <TrendArrow trend={tooltip.rate.trend} />
            <span className={
              tooltip.rate.trend === "up" ? "text-green-400" :
              tooltip.rate.trend === "down" ? "text-red-400" : "text-zinc-500"
            }>
              {tooltip.rate.trend === "up" ? "Higher" : tooltip.rate.trend === "down" ? "Lower" : "Stable"}
            </span>
          </p>
          <p className="mt-1 font-mono text-[10px] text-zinc-600">{tooltip.rate.period}</p>
        </div>
      )}

      {/* Legend */}
      <div className="mt-4 flex items-center justify-center gap-2">
        <span className="font-mono text-[10px] text-zinc-500">{min.toFixed(1)}¢</span>
        <div className="flex h-3 overflow-hidden rounded">
          {legendColors.map((l, i) => (
            <div key={i} className="w-8" style={{ backgroundColor: l.color }} />
          ))}
        </div>
        <span className="font-mono text-[10px] text-zinc-500">{max.toFixed(1)}¢</span>
        <span className="ml-2 font-mono text-[10px] text-zinc-600">¢/kWh</span>
      </div>
      <div className="mt-1 flex items-center justify-center gap-3 font-mono text-[10px] text-zinc-500">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full border border-amber-500 bg-zinc-800" />
          Tracked states
        </span>
      </div>
    </div>
  );
}
