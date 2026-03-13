import { useState, useMemo, useCallback, useEffect } from "react";
import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";
import { geoCentroid } from "d3-geo";
import { supabase } from "@/integrations/supabase/client";

const GEO_URL = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";

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

export const ABBR_TO_NAME: Record<string, string> = {
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

interface ISORegionDef {
  name: string;
  base: string;
  tracked: string;
  states: string[];
  fontSize: number;
}

export const ISO_REGIONS: ISORegionDef[] = [
  { name: "CAISO",     base: "#4a1520", tracked: "#c0392b", states: ["CA"], fontSize: 9 },
  { name: "ERCOT",     base: "#0d2137", tracked: "#1a6fa8", states: ["TX"], fontSize: 10 },
  { name: "NYISO",     base: "#1e1040", tracked: "#6c3dbf", states: ["NY"], fontSize: 8 },
  { name: "ISO-NE",    base: "#0d2e2e", tracked: "#17a589", states: ["MA", "CT", "RI", "VT", "NH", "ME"], fontSize: 8 },
  { name: "PJM",       base: "#0d2b1a", tracked: "#1e8449", states: ["NJ", "PA", "MD", "DE", "OH", "IN", "IL", "MI", "WV", "VA", "DC"], fontSize: 11 },
  { name: "MISO",      base: "#1a2535", tracked: "#2e86c1", states: ["MN", "IA", "WI", "ND", "SD", "MO", "AR", "MS", "LA"], fontSize: 11 },
  { name: "SPP",       base: "#1e2010", tracked: "#7d8c2a", states: ["KS", "OK", "NE", "WY"], fontSize: 9 },
  { name: "WECC",      base: "#2a1020", tracked: "#8e44ad", states: ["CO", "NV", "UT", "AZ", "OR", "WA", "ID", "NM", "MT"], fontSize: 12 },
  { name: "Southeast", base: "#1e1508", tracked: "#ca6f1e", states: ["FL", "GA", "AL", "SC", "NC", "TN", "KY"], fontSize: 10 },
  { name: "Other",     base: "#1a1a2a", tracked: "#666688", states: ["AK", "HI"], fontSize: 7 },
];

export const STATE_TO_ISO: Record<string, ISORegionDef> = {};
for (const region of ISO_REGIONS) {
  for (const st of region.states) {
    STATE_TO_ISO[st] = region;
  }
}

const STATE_BASE_OVERRIDE: Record<string, string> = { AK: "#351428", HI: "#5a1d28" };
const STATE_TRACKED_OVERRIDE: Record<string, string> = { AK: "#8e44ad", HI: "#c0392b" };

const ISO_CENTROIDS: Record<string, [number, number]> = {
  CAISO: [-119.5, 37.5], ERCOT: [-99.5, 31.5], NYISO: [-75.5, 43.0],
  "ISO-NE": [-71.5, 44.0], PJM: [-80.5, 40.0], MISO: [-92.0, 42.0],
  SPP: [-99.0, 38.5], WECC: [-113.0, 42.5], Southeast: [-84.5, 33.5],
};

const STATE_CENTROID_OFFSETS: Record<string, [number, number]> = {
  DC: [2, 0], DE: [1, 0], CT: [1, 0], RI: [1.5, 0],
  NH: [1, 0], VT: [0, 0], MA: [2, 0], NJ: [1, 0], MD: [0, -1],
};

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return `#${clamp(r).toString(16).padStart(2, "0")}${clamp(g).toString(16).padStart(2, "0")}${clamp(b).toString(16).padStart(2, "0")}`;
}

function adjustBrightness(hex: string, factor: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r * factor, g * factor, b * factor);
}

function lerpColor(hex1: string, hex2: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(hex1);
  const [r2, g2, b2] = hexToRgb(hex2);
  return rgbToHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}

export function getISOLegendColor(region: ISORegionDef): string {
  return region.tracked;
}

export interface StateRate {
  stateId: string;
  stateName: string;
  price: number | null;
  period: string;
  trend: "up" | "down" | "neutral";
}

export interface SolarData {
  state_id: string;
  state_name: string;
  ac_annual: number | null;
  capacity_factor: number | null;
}

export type LayerKey = "rates" | "solar" | "index";

export interface Layers {
  rates: boolean;
  solar: boolean;
  index: boolean;
}

interface TooltipData {
  x: number;
  y: number;
  name: string;
  iso: string;
  price: number | null;
  trend: string;
  period: string;
  acAnnual: number | null;
  opportunityIndex: number | null;
}

interface Props {
  rates: StateRate[];
  loading: boolean;
  tracked: Set<string>;
  onToggleTracked: (abbr: string) => void;
}

function TrendArrow({ trend }: { trend: string }) {
  if (trend === "up") return <span className="text-green-400">▲</span>;
  if (trend === "down") return <span className="text-red-400">▼</span>;
  return <span className="text-zinc-500">—</span>;
}

const LAYER_PILLS: { key: LayerKey; label: string }[] = [
  { key: "rates", label: "⚡ Electricity Rates" },
  { key: "solar", label: "☀️ Solar Production" },
  { key: "index", label: "📊 Rate × Solar Index" },
];

const SUBTITLES: Record<LayerKey, string> = {
  rates: "Brightness = rate intensity · Click any state to track/untrack",
  solar: "Brightness = annual solar production (kWh) · Click any state to track/untrack",
  index: "Green = highest opportunity (high rate × high solar) · Click any state to track/untrack",
};

export default function ElectricityRateMap({ rates, loading, tracked, onToggleTracked }: Props) {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [layers, setLayers] = useState<Layers>({ rates: true, solar: false, index: false });
  const [solarData, setSolarData] = useState<SolarData[]>([]);
  const [solarLoading, setSolarLoading] = useState(false);
  const [solarFetched, setSolarFetched] = useState(false);

  const toggleLayer = useCallback((key: LayerKey) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  // Determine active coloring mode by priority: index > solar > rates
  const activeColorMode: LayerKey = layers.index ? "index" : layers.solar ? "solar" : "rates";

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

  const { min: minPrice, max: maxPrice } = useMemo(() => {
    const prices = rates.filter((r) => r.price != null).map((r) => r.price as number);
    if (!prices.length) return { min: 0, max: 30 };
    return { min: Math.min(...prices), max: Math.max(...prices) };
  }, [rates]);

  const { minSolar, maxSolar } = useMemo(() => {
    const vals = solarData.filter((s) => s.ac_annual != null).map((s) => s.ac_annual as number);
    if (!vals.length) return { minSolar: 0, maxSolar: 20000 };
    return { minSolar: Math.min(...vals), maxSolar: Math.max(...vals) };
  }, [solarData]);

  // Compute opportunity index for all states
  const opportunityMap = useMemo(() => {
    const m: Record<string, number> = {};
    const priceRange = maxPrice - minPrice || 1;
    const solarRange = maxSolar - minSolar || 1;
    for (const abbr of Object.keys(ABBR_TO_NAME)) {
      const rate = rateMap[abbr];
      const solar = solarMap[abbr];
      if (rate?.price != null && solar?.ac_annual != null) {
        const normRate = (rate.price - minPrice) / priceRange;
        const normSolar = (solar.ac_annual - minSolar) / solarRange;
        m[abbr] = normRate * normSolar;
      }
    }
    return m;
  }, [rateMap, solarMap, minPrice, maxPrice, minSolar, maxSolar]);

  // Coloring function based on active color mode priority
  const getColor = useCallback(
    (abbr: string, isTracked: boolean): string => {
      if (isTracked) return STATE_TRACKED_OVERRIDE[abbr] || STATE_TO_ISO[abbr]?.tracked || "#f59e0b";

      const region = STATE_TO_ISO[abbr];
      if (!region) return "#18181b";
      const baseColor = STATE_BASE_OVERRIDE[abbr] || region.base;

      if (activeColorMode === "index") {
        const score = opportunityMap[abbr];
        if (score == null) return "#1a1a1a";
        return lerpColor("#7a6c00", "#16a34a", score);
      }

      if (activeColorMode === "solar") {
        const ac = solarMap[abbr]?.ac_annual;
        if (ac == null) return adjustBrightness(baseColor, 0.6);
        const range = maxSolar - minSolar || 1;
        const t = (ac - minSolar) / range;
        return adjustBrightness(baseColor, 0.7 + t * 0.6);
      }

      // rates (default)
      const price = rateMap[abbr]?.price;
      if (price == null) return adjustBrightness(baseColor, 0.85);
      const range = maxPrice - minPrice || 1;
      const t = (price - minPrice) / range;
      return adjustBrightness(baseColor, 0.85 + t * 0.30);
    },
    [activeColorMode, rateMap, solarMap, opportunityMap, minPrice, maxPrice, minSolar, maxSolar]
  );

  const { isoLabelsToShow } = useMemo(() => {
    const isoLabels: { name: string; coords: [number, number]; fontSize: number }[] = [];
    for (const region of ISO_REGIONS) {
      if (region.name === "Other") continue;
      const trackedInRegion = region.states.filter((s) => tracked.has(s));
      const allTracked = trackedInRegion.length === region.states.length;
      if (!allTracked) {
        const centroid = ISO_CENTROIDS[region.name];
        if (centroid) isoLabels.push({ name: region.name, coords: centroid, fontSize: region.fontSize });
      }
    }
    return { isoLabelsToShow: isoLabels };
  }, [tracked]);

  const isLoading = loading || ((layers.solar || layers.index) && solarLoading);

  if (isLoading) {
    return (
      <div className="flex h-[500px] items-center justify-center rounded-lg bg-zinc-800/50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Layer toggle pills */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {LAYER_PILLS.map((pill) => (
          <button
            key={pill.key}
            onClick={() => toggleLayer(pill.key)}
            className={`rounded-full border px-3 py-1.5 font-mono text-xs font-semibold transition-all ${
              layers[pill.key]
                ? "border-amber-500 bg-amber-500/20 text-amber-300"
                : "border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300"
            }`}
          >
            {pill.label}
          </button>
        ))}
      </div>

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
              const stateCentroids: Record<string, [number, number]> = {};
              for (const geo of geographies) {
                const abbr = FIPS_TO_ABBR[geo.id];
                if (abbr && tracked.has(abbr)) {
                  const centroid = geoCentroid(geo);
                  const offset = STATE_CENTROID_OFFSETS[abbr] || [0, 0];
                  stateCentroids[abbr] = [centroid[0] + offset[0], centroid[1] + offset[1]];
                }
              }

              return (
                <>
                  {geographies.map((geo) => {
                    const fips = geo.id;
                    const abbr = FIPS_TO_ABBR[fips];
                    if (!abbr) return null;
                    const rate = rateMap[abbr];
                    const isTracked = tracked.has(abbr);
                    const fillColor = getColor(abbr, isTracked);
                    const stateName = rate?.stateName || ABBR_TO_NAME[abbr] || abbr;
                    const isoRegion = STATE_TO_ISO[abbr];
                    const price = rate?.price != null ? parseFloat(String(rate.price)) : null;
                    const solar = solarMap[abbr];
                    const opp = opportunityMap[abbr] ?? null;

                    const strokeColor = isTracked ? "#f59e0b" : "#ffffff30";
                    const strokeW = isTracked ? 2 : 2;

                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        fill={fillColor}
                        stroke={strokeColor}
                        strokeWidth={strokeW}
                        style={{
                          default: { outline: "none" },
                          hover: { outline: "none", fill: fillColor, filter: "brightness(1.3)", cursor: "pointer" },
                          pressed: { outline: "none" },
                        }}
                        onMouseEnter={(evt) => {
                          setTooltip({
                            x: evt.clientX, y: evt.clientY,
                            name: stateName, iso: isoRegion?.name || "N/A",
                            price, trend: rate?.trend || "neutral", period: rate?.period || "No data",
                            acAnnual: solar?.ac_annual ?? null,
                            opportunityIndex: opp,
                          });
                        }}
                        onMouseMove={(evt) => {
                          setTooltip((prev) => prev ? { ...prev, x: evt.clientX, y: evt.clientY } : null);
                        }}
                        onMouseLeave={() => setTooltip(null)}
                        onClick={() => onToggleTracked(abbr)}
                      />
                    );
                  })}

                  {/* Intra-ISO borders */}
                  {geographies.map((geo) => {
                    const abbr = FIPS_TO_ABBR[geo.id];
                    if (!abbr || tracked.has(abbr)) return null;
                    const region = STATE_TO_ISO[abbr];
                    if (!region || region.states.length <= 1) return null;
                    return (
                      <Geography
                        key={`border-${geo.rsmKey}`}
                        geography={geo}
                        fill="transparent"
                        stroke="#ffffff10"
                        strokeWidth={0.5}
                        style={{
                          default: { outline: "none", pointerEvents: "none" },
                          hover: { outline: "none", pointerEvents: "none" },
                          pressed: { outline: "none", pointerEvents: "none" },
                        }}
                      />
                    );
                  })}

                  {/* ISO region labels */}
                  {isoLabelsToShow.map((label) => (
                    <Marker key={`iso-${label.name}`} coordinates={label.coords}>
                      <text
                        textAnchor="middle"
                        dominantBaseline="central"
                        style={{
                          fontFamily: "ui-monospace, monospace",
                          fontSize: label.fontSize,
                          fontWeight: 700,
                          fill: "#ffffff90",
                          pointerEvents: "none",
                          userSelect: "none",
                          textShadow: "0 1px 3px rgba(0,0,0,0.8)",
                        }}
                      >
                        {label.name}
                      </text>
                    </Marker>
                  ))}

                  {/* Tracked state labels */}
                  {Array.from(tracked).map((abbr) => {
                    const coords = stateCentroids[abbr];
                    if (!coords || (coords[0] === 0 && coords[1] === 0)) return null;
                    return (
                      <Marker key={`state-${abbr}`} coordinates={coords}>
                        <text
                          textAnchor="middle"
                          dominantBaseline="central"
                          style={{
                            fontFamily: "ui-monospace, monospace",
                            fontSize: 7,
                            fontWeight: 700,
                            fill: "#F59E0B",
                            pointerEvents: "none",
                            userSelect: "none",
                            textShadow: "0 1px 2px rgba(0,0,0,0.9)",
                          }}
                        >
                          {abbr}
                        </text>
                      </Marker>
                    );
                  })}
                </>
              );
            }}
          </Geographies>
        </ComposableMap>
      </div>

      {/* Tooltip — only show data for active layers */}
      {tooltip && (
        <div
          className="pointer-events-none fixed z-50 rounded-lg border border-zinc-700 bg-zinc-900/95 px-3 py-2 shadow-xl backdrop-blur-sm"
          style={{ left: tooltip.x + 14, top: tooltip.y - 12 }}
        >
          <div className="flex items-center gap-2">
            <p className="font-display text-sm font-bold text-zinc-100">{tooltip.name}</p>
            <span className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider text-zinc-400">
              {tooltip.iso}
            </span>
          </div>
          <div className="mt-1 space-y-0.5">
            {layers.rates && (
              <p className="font-mono text-xs text-zinc-300">
                ⚡ Rate:{" "}
                <span className="font-bold text-amber-400">
                  {tooltip.price != null ? `${tooltip.price.toFixed(2)} ¢/kWh` : "N/A"}
                </span>
                {tooltip.price != null && (
                  <span className="ml-1.5">
                    <TrendArrow trend={tooltip.trend} />
                  </span>
                )}
              </p>
            )}
            {layers.solar && (
              <p className="font-mono text-xs text-zinc-300">
                ☀️ Solar:{" "}
                <span className="font-bold text-yellow-300">
                  {tooltip.acAnnual != null ? `${Math.round(tooltip.acAnnual).toLocaleString()} kWh/yr` : "N/A"}
                </span>
              </p>
            )}
            {layers.index && (
              <p className="font-mono text-xs text-zinc-300">
                📊 Index:{" "}
                <span className="font-bold text-green-400">
                  {tooltip.opportunityIndex != null ? tooltip.opportunityIndex.toFixed(3) : "N/A"}
                </span>
              </p>
            )}
          </div>
          {layers.rates && <p className="mt-1 font-mono text-[10px] text-zinc-600">{tooltip.period}</p>}
        </div>
      )}

      {/* Legend — matches active color mode */}
      {activeColorMode === "rates" && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
          {ISO_REGIONS.filter((r) => r.name !== "Other").map((region) => (
            <span key={region.name} className="flex items-center gap-1.5 font-mono text-[10px] text-zinc-400">
              <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: region.tracked }} />
              {region.name}
            </span>
          ))}
          <span className="flex items-center gap-1.5 font-mono text-[10px] text-zinc-500">
            <span className="inline-block h-2.5 w-2.5 rounded-sm border-2 border-amber-500 bg-zinc-800" />
            Tracked
          </span>
        </div>
      )}

      {activeColorMode === "solar" && (
        <div className="mt-5 flex items-center justify-center gap-3">
          <span className="font-mono text-[10px] text-zinc-500">{Math.round(minSolar).toLocaleString()} kWh</span>
          <div className="flex h-3 w-40 overflow-hidden rounded-full">
            {Array.from({ length: 20 }).map((_, i) => {
              const t = i / 19;
              const baseRegion = ISO_REGIONS[Math.floor(t * (ISO_REGIONS.length - 2))];
              const base = baseRegion?.base || "#1a1a2a";
              return (
                <div
                  key={i}
                  className="h-full flex-1"
                  style={{ backgroundColor: adjustBrightness(base, 0.7 + t * 0.6) }}
                />
              );
            })}
          </div>
          <span className="font-mono text-[10px] text-zinc-500">{Math.round(maxSolar).toLocaleString()} kWh</span>
        </div>
      )}

      {activeColorMode === "index" && (
        <div className="mt-5 flex items-center justify-center gap-3">
          <span className="font-mono text-[10px] text-zinc-500">Low opportunity</span>
          <div className="flex h-3 w-40 overflow-hidden rounded-full">
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                className="h-full flex-1"
                style={{ backgroundColor: lerpColor("#7a6c00", "#16a34a", i / 19) }}
              />
            ))}
          </div>
          <span className="font-mono text-[10px] text-zinc-500">High opportunity</span>
        </div>
      )}

      <p className="mt-1 text-center font-mono text-[9px] text-zinc-600">
        {SUBTITLES[activeColorMode]}
      </p>
    </div>
  );
}
