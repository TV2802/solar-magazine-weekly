// ============================================================
// pages/market/CA.tsx — California Hub
// The exemplar state page. Structure is reusable for all
// future states — only the data constants change.
//
// TABS:
//   Dashboard  — live rates, solar yield, utility breakdown
//   Policy     — NEM 3.0, CPUC proceedings, interconnection
//   Incentives — SGIP, ITC, utility programs
//   News       — CA-tagged articles from the live feed
//
// TO REPLICATE FOR ANOTHER STATE:
//   1. Copy this file to pages/market/NY.tsx etc.
//   2. Replace STATE_DATA and all data constants at top
//   3. Add route in App.tsx
//   4. Add state to StatePreviewPanel hasFullHub list
// ============================================================

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Zap, Sun, FileText, Newspaper,
  CheckCircle, AlertTriangle, Clock, ExternalLink, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// ─────────────────────────────────────────
// STATE CONSTANTS — edit these for CA updates
// or copy/replace for other states
// ─────────────────────────────────────────
const STATE = {
  abbr: "CA",
  name: "California",
  iso: "CAISO",
  isoColor: "#c0392b",
};

const UTILITIES = [
  { name: "PG&E",   territory: "Northern CA",      avg_rate: 38.2, nem: "NEM 3.0", interconnection: "6–12 months" },
  { name: "SCE",    territory: "Southern CA",       avg_rate: 35.1, nem: "NEM 3.0", interconnection: "6–9 months" },
  { name: "SDG&E",  territory: "San Diego",         avg_rate: 45.8, nem: "NEM 3.0", interconnection: "4–8 months" },
  { name: "LADWP",  territory: "Los Angeles (muni)", avg_rate: 28.4, nem: "Feed-in Tariff", interconnection: "3–6 months" },
];

const NEM_FACTS = [
  { label: "Export credit rate", value: "~$0.02–0.05/kWh", note: "Varies by utility and TOU period" },
  { label: "Avoided cost basis", value: "Yes", note: "Credits based on avoided cost, not retail rate" },
  { label: "Monthly true-up", value: "Annual", note: "Bill credits roll over monthly, true-up annually" },
  { label: "Interconnection fee", value: "$75–$150", note: "One-time application fee per system" },
  { label: "Multifamily billing", value: "VNEM available", value2: "Virtual NEM for MF properties", note: "AB 2511 expanded multifamily access" },
  { label: "Effective date", value: "Apr 15, 2023", note: "NEM 3.0 applies to all new applications" },
];

const CPUC_PROCEEDINGS = [
  {
    docket: "R.22-07-005",
    title: "Net Energy Metering Successor Tariff (NEM 3.0)",
    status: "decided",
    summary: "Decision issued Apr 2023. Export rates set at avoided cost (~$0.05/kWh peak). Applies to all new residential and commercial DG applications.",
    last_action: "Apr 2023",
    url: "https://www.cpuc.ca.gov/nem",
  },
  {
    docket: "R.21-06-017",
    title: "Multifamily Affordable Housing Solar Rooftop Program",
    status: "active",
    summary: "Ongoing proceeding to expand solar access for renters and affordable housing tenants. Key for multifamily DER developers.",
    last_action: "Jan 2026",
    url: "https://www.cpuc.ca.gov/industries-and-topics/electrical-energy/demand-side-management/solar/multifamily-affordable-solar-housing-mash",
  },
  {
    docket: "R.23-12-010",
    title: "Distribution Resource Plan / DER Interconnection Reform",
    status: "active",
    summary: "Proceeding to streamline interconnection for distributed resources under 1MW. Could significantly reduce 6–12 month timelines for rooftop + BESS projects.",
    last_action: "Mar 2026",
    url: "https://www.cpuc.ca.gov",
  },
  {
    docket: "SGIP Budget Cycle 5",
    title: "Self-Generation Incentive Program — Budget Cycle 5",
    status: "active",
    summary: "CPUC authorized new SGIP budget. Equity Resiliency budget open. Standard residential budget nearly exhausted. Commercial BESS waitlisted in PG&E territory.",
    last_action: "Feb 2026",
    url: "https://www.selfgenca.com",
  },
];

const SGIP_BUDGETS = [
  { category: "Equity Resiliency", rate: "$1.00/Wh", status: "active",   note: "Medically vulnerable, fire-risk areas. Highest incentive." },
  { category: "Equity",            rate: "$0.85/Wh", status: "active",   note: "Low-income customers in disadvantaged communities." },
  { category: "Residential",       rate: "$0.25/Wh", status: "waitlist", note: "Standard residential. Funds nearly exhausted in PG&E territory." },
  { category: "Commercial / Non-Res", rate: "$0.15/Wh", status: "waitlist", note: "C&I and multifamily BESS. PG&E and SCE waitlisted." },
];

const OTHER_INCENTIVES = [
  {
    name: "Federal ITC (Section 48E)",
    value: "30% + 10% DC adder",
    status: "active",
    notes: "Base 30% + 10% domestic content adder if DC requirements met. Prevailing wage required for full credit.",
    url: "https://www.irs.gov/credits-deductions/domestic-content-bonus-credit",
  },
  {
    name: "CPUC Solar Rights Act (AB 2188)",
    value: "Permit streamlining",
    status: "active",
    notes: "Requires streamlined permitting for rooftop solar under 10kW. Instant permit via online submission for qualifying systems.",
    url: "https://leginfo.legislature.ca.gov",
  },
  {
    name: "CA Solar + Storage Initiative",
    value: "Varies by utility",
    status: "active",
    notes: "Utility-specific paired solar + storage programs. SCE and SDG&E offer TOU optimization incentives for paired systems.",
    url: "https://www.energy.ca.gov",
  },
  {
    name: "DAC-SASH (Disadvantaged Communities)",
    value: "$3.00/W",
    status: "active",
    notes: "Single-family homes in disadvantaged communities. Administered by GRID Alternatives. High value for qualifying properties.",
    url: "https://gridalternatives.org/programs/dac-sash",
  },
];

// ─────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────
type Tab = "dashboard" | "policy" | "incentives" | "news";

interface Article {
  id: string;
  title: string;
  summary: string;
  source_url: string;
  source_name: string;
  published_at: string;
  topic: string;
}

// ─────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────
const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    active:   "bg-green-500/15 text-green-400 border-green-500/30",
    decided:  "bg-blue-500/15 text-blue-400 border-blue-500/30",
    waitlist: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    closed:   "bg-red-500/15 text-red-400 border-red-500/30",
    pending:  "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
  };
  return (
    <span className={`inline-block rounded border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${map[status] || map.pending}`}>
      {status}
    </span>
  );
};

// ─────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────
export default function CAHub() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [articles, setArticles] = useState<Article[]>([]);
  const [articlesLoading, setArticlesLoading] = useState(false);
  const [articleTopic, setArticleTopic] = useState<string>("all");

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "dashboard",  label: "Dashboard",  icon: <Zap className="h-4 w-4" /> },
    { key: "policy",     label: "Policy",     icon: <FileText className="h-4 w-4" /> },
    { key: "incentives", label: "Incentives", icon: <Sun className="h-4 w-4" /> },
    { key: "news",       label: "News",       icon: <Newspaper className="h-4 w-4" /> },
  ];

  // Fetch CA articles when News tab is opened
  useEffect(() => {
    if (tab !== "news") return;
    async function fetchArticles() {
      setArticlesLoading(true);
      let query = supabase
        .from("articles")
        .select("id, title, summary, source_url, source_name, published_at, topic")
        .contains("states", ["CA"])
        .order("published_at", { ascending: false })
        .limit(30);
      if (articleTopic !== "all") query = query.eq("topic", articleTopic);
      const { data } = await query;
      setArticles(data || []);
      setArticlesLoading(false);
    }
    fetchArticles();
  }, [tab, articleTopic]);

  const topicDisplayToEnum: Record<string, string> = {
    "Solar": "solar",
    "Energy Storage": "bess_storage",
    "Policy & Regulation": "policy_incentives",
    "Finance & Incentives": "market_pricing",
    "Grid & Utilities": "technology_equipment",
  };
  const topics = ["all", ...Object.keys(topicDisplayToEnum)];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">

      {/* ── Page header ── */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate("/market")}
                className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="text-sm">Market Intelligence</span>
              </button>
              <div className="h-4 w-px bg-zinc-800" />
              <div className="flex items-center gap-2">
                <span
                  className="rounded px-2 py-0.5 font-mono text-xs font-bold"
                  style={{ backgroundColor: STATE.isoColor + "22", color: STATE.isoColor }}
                >
                  {STATE.iso}
                </span>
                <h1 className="text-xl font-bold text-zinc-50">{STATE.name}</h1>
                <span className="rounded bg-zinc-800 px-2 py-0.5 font-mono text-xs text-zinc-400">
                  {STATE.abbr}
                </span>
              </div>
            </div>
            <span className="font-mono text-xs text-zinc-600">
              Last verified: Mar 2026
            </span>
          </div>

          {/* Tab bar */}
          <div className="mt-4 flex gap-1">
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  tab === t.key
                    ? "bg-amber-500/15 text-amber-400"
                    : "text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-300"
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">

        {/* ══════════════════════════════════════
            DASHBOARD TAB
        ══════════════════════════════════════ */}
        {tab === "dashboard" && (
          <div className="space-y-8">

            {/* Headline numbers */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "Avg Residential Rate", value: "~$0.38/kWh", sub: "Weighted avg PG&E/SCE/SDG&E/LADWP", color: "text-amber-400" },
                { label: "NEM Export Credit", value: "~$0.05/kWh", sub: "Peak avoided cost rate", color: "text-red-400" },
                { label: "SGIP Equity Resiliency", value: "$1.00/Wh", sub: "Highest BESS incentive available", color: "text-green-400" },
                { label: "Avg Solar Yield", value: "1,850 kWh/yr", sub: "Per kW installed, 10kW system", color: "text-yellow-400" },
              ].map((card, i) => (
                <div key={i} className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-4">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-500 mb-2">{card.label}</p>
                  <p className={`font-mono text-2xl font-bold ${card.color}`}>{card.value}</p>
                  <p className="mt-1 text-xs text-zinc-600">{card.sub}</p>
                </div>
              ))}
            </div>

            {/* Utility breakdown table */}
            <div>
              <h2 className="text-lg font-bold text-zinc-100 mb-4">Utility Breakdown</h2>
              <div className="rounded-lg border border-zinc-800 overflow-hidden">
                <table className="w-full text-left">
                  <thead className="border-b border-zinc-800 bg-zinc-900/50">
                    <tr>
                      {["Utility", "Territory", "Avg Rate (¢/kWh)", "Net Metering", "Interconnection Timeline"].map(h => (
                        <th key={h} className="px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-zinc-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {UTILITIES.map((u, i) => (
                      <tr key={i} className="bg-zinc-900/30 hover:bg-zinc-800/30 transition-colors">
                        <td className="px-4 py-3 font-mono text-sm font-bold text-zinc-200">{u.name}</td>
                        <td className="px-4 py-3 text-sm text-zinc-400">{u.territory}</td>
                        <td className="px-4 py-3 font-mono text-sm font-bold text-amber-400">{u.avg_rate}</td>
                        <td className="px-4 py-3 font-mono text-xs text-zinc-400">{u.nem}</td>
                        <td className="px-4 py-3">
                          <span className="rounded bg-zinc-800 px-2 py-0.5 font-mono text-xs text-zinc-400">
                            {u.interconnection}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* NEM 3.0 quick facts */}
            <div>
              <h2 className="text-lg font-bold text-zinc-100 mb-4">NEM 3.0 Quick Facts</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {NEM_FACTS.map((f, i) => (
                  <div key={i} className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-600 mb-1">{f.label}</p>
                    <p className="text-sm font-semibold text-amber-400">{f.value}</p>
                    <p className="mt-1 text-xs text-zinc-500">{f.note}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-400" />
                  <div>
                    <p className="text-sm font-medium text-amber-400">NEM 3.0 impact on multifamily</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      Under NEM 3.0, adding battery storage significantly improves project economics by shifting solar export to peak TOU periods when avoided cost credits are highest ($0.08–0.12/kWh vs $0.02/kWh off-peak). BESS is now effectively required for NEM 3.0 projects to pencil out.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════
            POLICY TAB
        ══════════════════════════════════════ */}
        {tab === "policy" && (
          <div className="space-y-8">
            <div>
              <h2 className="text-lg font-bold text-zinc-100 mb-2">CPUC Proceedings</h2>
              <p className="text-sm text-zinc-500 mb-6">
                Active and recently decided proceedings affecting DER development in California.
                Updated manually when new decisions or rulings are issued.
              </p>
              <div className="space-y-4">
                {CPUC_PROCEEDINGS.map((p, i) => (
                  <div key={i} className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-xs font-bold text-zinc-400">{p.docket}</span>
                          <StatusBadge status={p.status} />
                        </div>
                        <h3 className="text-base font-semibold text-zinc-100">{p.title}</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-zinc-600 flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {p.last_action}
                        </span>
                        <a
                          href={p.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 rounded border border-zinc-700 px-2 py-1 font-mono text-[10px] text-zinc-400 hover:border-zinc-500 hover:text-zinc-200 transition-colors"
                        >
                          <ExternalLink className="h-2.5 w-2.5" /> CPUC
                        </a>
                      </div>
                    </div>
                    <p className="text-sm text-zinc-400 leading-relaxed">{p.summary}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Interconnection rules */}
            <div>
              <h2 className="text-lg font-bold text-zinc-100 mb-4">Interconnection by Utility</h2>
              <div className="space-y-3">
                {UTILITIES.map((u, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3">
                    <div>
                      <p className="font-mono text-sm font-bold text-zinc-200">{u.name}</p>
                      <p className="text-xs text-zinc-500">{u.territory}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-sm text-amber-400 font-semibold">{u.interconnection}</p>
                      <p className="font-mono text-[10px] text-zinc-600">typical timeline</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-900/30 p-4">
                <div className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-400" />
                  <p className="text-xs text-zinc-500">
                    Systems under 30kW connected at 120/240V typically qualify for Rule 21 fast-track interconnection. Battery-only additions to existing PV may use simplified process. Always verify with utility before project commitment.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════
            INCENTIVES TAB
        ══════════════════════════════════════ */}
        {tab === "incentives" && (
          <div className="space-y-8">

            {/* SGIP */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-lg font-bold text-zinc-100">SGIP — Self-Generation Incentive Program</h2>
                <StatusBadge status="active" />
              </div>
              <p className="text-sm text-zinc-500 mb-4">
                California's primary BESS incentive. Four budget categories with different rates and statuses.
                Equity Resiliency is the highest-value category and currently open.
              </p>
              <div className="rounded-lg border border-zinc-800 overflow-hidden">
                <table className="w-full text-left">
                  <thead className="border-b border-zinc-800 bg-zinc-900/50">
                    <tr>
                      {["Category", "Rate", "Status", "Notes"].map(h => (
                        <th key={h} className="px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-zinc-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {SGIP_BUDGETS.map((s, i) => (
                      <tr key={i} className="bg-zinc-900/30 hover:bg-zinc-800/30 transition-colors">
                        <td className="px-4 py-3 font-mono text-sm font-semibold text-zinc-200">{s.category}</td>
                        <td className="px-4 py-3 font-mono text-sm font-bold text-amber-400">{s.rate}</td>
                        <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                        <td className="px-4 py-3 text-xs text-zinc-500">{s.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 flex justify-end">
                <a
                  href="https://www.selfgenca.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-amber-400 transition-colors"
                >
                  <ExternalLink className="h-3 w-3" /> selfgenca.com — official SGIP portal
                </a>
              </div>
            </div>

            {/* Other incentives */}
            <div>
              <h2 className="text-lg font-bold text-zinc-100 mb-4">Other Programs</h2>
              <div className="space-y-4">
                {OTHER_INCENTIVES.map((inc, i) => (
                  <div key={i} className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-zinc-200">{inc.name}</p>
                        <StatusBadge status={inc.status} />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-amber-400">{inc.value}</span>
                        <a
                          href={inc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-zinc-600 hover:text-zinc-400 transition-colors"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    </div>
                    <p className="text-xs text-zinc-500 leading-relaxed">{inc.notes}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════
            NEWS TAB
        ══════════════════════════════════════ */}
        {tab === "news" && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-zinc-100">California News</h2>
                <p className="text-sm text-zinc-500">Articles tagged California from the live feed.</p>
              </div>
              {/* Topic filter */}
              <div className="flex flex-wrap gap-2">
                {topics.map(t => (
                  <button
                    key={t}
                    onClick={() => setArticleTopic(t)}
                    className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                      articleTopic === t
                        ? "border-transparent bg-amber-500/20 text-amber-400"
                        : "border-zinc-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    {t === "all" ? "All topics" : t}
                  </button>
                ))}
              </div>
            </div>

            {articlesLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-24 animate-pulse rounded-lg bg-zinc-800/50" />
                ))}
              </div>
            ) : articles.length === 0 ? (
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 px-6 py-16 text-center">
                <Newspaper className="h-8 w-8 text-zinc-700 mx-auto mb-3" />
                <p className="text-sm text-zinc-500">No California articles yet.</p>
                <p className="mt-1 text-xs text-zinc-600">
                  Articles get tagged automatically after the next issue runs with the updated fetch function.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {articles.map(a => (
                  <a
                    key={a.id}
                    href={a.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-start gap-4 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 transition-colors hover:border-amber-500/30 hover:bg-zinc-800/50"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="rounded bg-zinc-800 px-2 py-0.5 font-mono text-[10px] text-zinc-500">
                          {a.topic}
                        </span>
                        <span className="font-mono text-[10px] text-zinc-600">
                          {new Date(a.published_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-zinc-200 group-hover:text-amber-400 transition-colors line-clamp-2">
                        {a.title}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500 line-clamp-2">{a.summary}</p>
                      <p className="mt-1.5 font-mono text-[10px] text-zinc-600">{a.source_name}</p>
                    </div>
                    <ExternalLink className="h-4 w-4 flex-shrink-0 text-zinc-700 group-hover:text-amber-400 transition-colors mt-1" />
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}
