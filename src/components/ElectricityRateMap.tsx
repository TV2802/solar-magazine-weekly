import { useState, useMemo, useCallback } from "react";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";

const GEO_URL = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";

const DEFAULT_TRACKED = ["CA", "NY", "TX", "MA", "NJ", "CO"];

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

const ABBR_TO_NAME: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", DC: "District of Columbia",
  FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois",
  IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana",
  ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan", MN: "Minnesota",
  MS: "Mississippi", MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada",
  NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico", NY: "New York",
  NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma",
  OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
  SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont",
  VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
};

// ISO/RTO region definitions
interface ISORegion {
  name: string;
  hue: number;
  states: string[];
}

const ISO_REGIONS: ISORegion[] = [
  { name: "CAISO",     hue: 0,   states: ["CA"] },
  { name: "ERCOT",     hue: 220, states: ["TX"] },
  { name: "NYISO",     hue: 270, states: ["NY"] },
  { name: "ISO-NE",    hue: 30,  states: ["MA", "CT", "RI", "VT", "NH", "ME"] },
  { name: "PJM",       hue: 140, states: ["NJ", "PA", "MD", "DE", "OH", "IN", "IL", "MI", "WV", "VA", "DC"] },
  { name: "MISO",      hue: 175, states: ["MN", "IA", "WI", "ND", "SD", "MO", "AR", "MS", "LA"] },
  { name: "SPP",       hue: 50,  states: ["KS", "OK", "NE", "WY"] },
  { name: "WECC",      hue: 330, states: ["CO", "NV", "UT", "AZ", "OR", "WA", "ID", "NM", "MT"] },
  { name: "Southeast", hue: 190, states: ["FL", "GA", "AL", "SC", "NC", "TN", "KY"] },
  { name: "Other",     hue: 260, states: ["AK", "HI"] },
];

// Build state → ISO lookup
const STATE_TO_ISO: Record<string, ISORegion> = {};
for (const region of ISO_REGIONS) {
  for (const st of region.states) {
    STATE_TO_ISO[st] = region;
  }
}

// Build ISO region → set of FIPS codes for border detection
const ISO_FIPS_SETS: Map<string, Set<string>> = new Map();
const ABBR_TO_FIPS: Record<string, string> = {};
for (const [fips, abbr] of Object.entries(FIPS_TO_ABBR)) {
  ABBR_TO_FIPS[abbr] = fips;
}
for (const region of ISO_REGIONS) {
  const fipsSet = new Set<string>();
  for (const st of region.states) {
    const f = ABBR_TO_FIPS[st];
    if (f) fipsSet.add(f);
  }
  ISO_FIPS_SETS.set(region.name, fipsSet);
}

function getISOColor(abbr: string, price: number | null, minPrice: number, maxPrice: number): string {
  const region = STATE_TO_ISO[abbr];
  if (!region) return "#27272a";
  const hue = region.hue;
  if (price == null) return `hsl(${hue}, 15%, 18%)`;
  
  const range = maxPrice - minPrice || 1;
  const t = (price - minPrice) / range; // 0 = lowest, 1 = highest
  // Higher rate → brighter/more saturated; lower → muted/darker
  const saturation = 30 + t * 50; // 30% to 80%
  const lightness = 20 + t * 30;  // 20% to 50%
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

function getISOLegendColor(hue: number): string {
  return `hsl(${hue}, 65%, 45%)`;
}

interface StateRate {
  stateId: string;
  stateName: string;
  price: number | null;
  period: string;
  trend: "up" | "down" | "neutral";
}

interface TooltipData {
  x: number;
  y: number;
  name: string;
  iso: string;
  price: number | null;
  trend: string;
  period: string;
}

interface Props {
  rates: StateRate[];
  loading: boolean;
}

function TrendArrow({ trend }: { trend: string }) {
  if (trend === "up") return <span className="text-green-400">▲</span>;
  if (trend === "down") return <span className="text-red-400">▼</span>;
  return <span className="text-zinc-500">—</span>;
}

export default function ElectricityRateMap({ rates, loading }: Props) {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [tracked, setTracked] = useState<Set<string>>(new Set(DEFAULT_TRACKED));

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

  const handleClick = useCallback((abbr: string) => {
    setTracked((prev) => {
      const next = new Set(prev);
      if (next.has(abbr)) next.delete(abbr);
      else next.add(abbr);
      return next;
    });
  }, []);

  if (loading) {
    return (
      <div className="flex h-[500px] items-center justify-center rounded-lg bg-zinc-800/50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="relative" onMouseLeave={() => setTooltip(null)}>
        <ComposableMap
          projection="geoAlbersUsa"
          projectionConfig={{ scale: 1000 }}
          width={800}
          height={500}
          style={{ width: "100%", height: "auto" }}
        >
          <Geographies geography={GEO_URL}>
            {({ geographies }) => {
              // First pass: build FIPS→ISO map for border detection
              const fipsToISO: Record<string, string> = {};
              for (const geo of geographies) {
                const abbr = FIPS_TO_ABBR[geo.id];
                if (abbr) {
                  const region = STATE_TO_ISO[abbr];
                  fipsToISO[geo.id] = region?.name || "Other";
                }
              }

              return geographies.map((geo) => {
                const fips = geo.id;
                const abbr = FIPS_TO_ABBR[fips];
                if (!abbr) return null;
                const rate = rateMap[abbr];
                const price = rate?.price != null ? parseFloat(String(rate.price)) : null;
                const fillColor = getISOColor(abbr, price, min, max);
                const isTracked = tracked.has(abbr);
                const stateName = rate?.stateName || ABBR_TO_NAME[abbr] || abbr;
                const isoRegion = STATE_TO_ISO[abbr];

                // Determine stroke: tracked states get amber, otherwise use white for ISO borders
                let strokeColor = "#27272a"; // default dark border
                let strokeW = 0.5;

                if (isTracked) {
                  strokeColor = "#f59e0b";
                  strokeW = 2;
                } else {
                  // Use a lighter stroke to show ISO region boundaries
                  strokeColor = "#52525b"; // zinc-600 for visible region borders
                  strokeW = 0.75;
                }

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={fillColor}
                    stroke={strokeColor}
                    strokeWidth={strokeW}
                    style={{
                      default: { outline: "none" },
                      hover: {
                        outline: "none",
                        fill: fillColor,
                        filter: "brightness(1.4)",
                        cursor: "pointer",
                      },
                      pressed: { outline: "none" },
                    }}
                    onMouseEnter={(evt) => {
                      setTooltip({
                        x: evt.clientX,
                        y: evt.clientY,
                        name: stateName,
                        iso: isoRegion?.name || "N/A",
                        price,
                        trend: rate?.trend || "neutral",
                        period: rate?.period || "No data",
                      });
                    }}
                    onMouseMove={(evt) => {
                      setTooltip((prev) =>
                        prev ? { ...prev, x: evt.clientX, y: evt.clientY } : null
                      );
                    }}
                    onMouseLeave={() => setTooltip(null)}
                    onClick={() => handleClick(abbr)}
                  />
                );
              });
            }}
          </Geographies>
        </ComposableMap>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="pointer-events-none fixed z-50 rounded-lg border border-zinc-700 bg-zinc-900/95 px-3 py-2 shadow-xl backdrop-blur-sm"
          style={{ left: tooltip.x + 14, top: tooltip.y - 12 }}
        >
          <div className="flex items-center gap-2">
            <p className="font-display text-sm font-bold text-zinc-100">{tooltip.name}</p>
            <span
              className="rounded px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider"
              style={{
                backgroundColor: getISOLegendColor(STATE_TO_ISO[
                  Object.entries(ABBR_TO_NAME).find(([, n]) => n === tooltip.name)?.[0] || ""
                ]?.hue ?? 0) + "33",
                color: getISOLegendColor(STATE_TO_ISO[
                  Object.entries(ABBR_TO_NAME).find(([, n]) => n === tooltip.name)?.[0] || ""
                ]?.hue ?? 0),
              }}
            >
              {tooltip.iso}
            </span>
          </div>
          <p className="font-mono text-lg font-bold text-amber-400">
            {tooltip.price != null ? `${tooltip.price.toFixed(2)} ¢/kWh` : "No data"}
          </p>
          {tooltip.price != null && (
            <p className="flex items-center gap-1 font-mono text-xs text-zinc-400">
              vs prev month: <TrendArrow trend={tooltip.trend} />
              <span
                className={
                  tooltip.trend === "up"
                    ? "text-green-400"
                    : tooltip.trend === "down"
                    ? "text-red-400"
                    : "text-zinc-500"
                }
              >
                {tooltip.trend === "up" ? "Higher" : tooltip.trend === "down" ? "Lower" : "Stable"}
              </span>
            </p>
          )}
          <p className="mt-1 font-mono text-[10px] text-zinc-600">{tooltip.period}</p>
        </div>
      )}

      {/* ISO Region Legend */}
      <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
        {ISO_REGIONS.filter((r) => r.name !== "Other").map((region) => (
          <span key={region.name} className="flex items-center gap-1.5 font-mono text-[10px] text-zinc-400">
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: getISOLegendColor(region.hue) }}
            />
            {region.name}
          </span>
        ))}
        <span className="flex items-center gap-1.5 font-mono text-[10px] text-zinc-500">
          <span className="inline-block h-2.5 w-2.5 rounded-sm border-2 border-amber-500 bg-zinc-800" />
          Tracked
        </span>
      </div>
      <p className="mt-1 text-center font-mono text-[9px] text-zinc-600">
        Brightness = rate intensity · Click any state to track/untrack
      </p>
    </div>
  );
}
