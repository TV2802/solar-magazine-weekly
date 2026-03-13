import { useState } from "react";
import { ExternalLink, AlertTriangle, CheckCircle, Clock, ChevronDown, ChevronUp } from "lucide-react";

// ─────────────────────────────────────────
// DATA — Updated March 2026
// Sources: IRS Notice 2026-15, Notice 2025-08, OBBBA, Winston & Strawn, Foley Hoag
// ─────────────────────────────────────────

const DC_THRESHOLDS = [
  { period: "Before June 16, 2025", solar: 40, bess: 40, status: "past" },
  { period: "June 16 – Dec 31, 2025", solar: 45, bess: 45, status: "past" },
  { period: "2026 (current)", solar: 50, bess: 50, status: "current" },
  { period: "2027", solar: 55, bess: 55, status: "future" },
  { period: "2028+", solar: 55, bess: 55, status: "future" },
];

const FEOC_THRESHOLDS = [
  { period: "2026 (current)", storage_macr: 55, solar_macr: 40, status: "current" },
  { period: "2027", storage_macr: 60, solar_macr: 45, status: "future" },
  { period: "2028", storage_macr: 65, solar_macr: 50, status: "future" },
  { period: "2029", storage_macr: 70, solar_macr: 55, status: "future" },
  { period: "2030+", storage_macr: 75, solar_macr: 60, status: "future" },
];

const BESS_MANUFACTURERS = [
  {
    name: "Tesla (Megapack)",
    origin: "USA",
    cells: "CATL (China)",
    feoc_status: "conditional",
    dc_eligible: false,
    itc_eligible: true,
    notes: "Cells from CATL — FEOC risk for 2026+ projects. Safe-harbored projects pre-Jan 2026 unaffected.",
    verified: "Q4 2025",
  },
  {
    name: "Fluence (Gridstack)",
    origin: "USA / Multi",
    cells: "Various",
    feoc_status: "conditional",
    dc_eligible: false,
    itc_eligible: true,
    notes: "Supply chain varies by project. Requires MACR calculation per project.",
    verified: "Q4 2025",
  },
  {
    name: "Viridi Parente",
    origin: "USA",
    cells: "USA",
    feoc_status: "compliant",
    dc_eligible: true,
    itc_eligible: true,
    notes: "Meets 75% MACR threshold (2030 level) now. US manufacturing in Richmond, CA.",
    verified: "Q3 2025",
  },
  {
    name: "Enphase (IQ Battery)",
    origin: "USA",
    cells: "USA / Non-FEOC",
    feoc_status: "compliant",
    dc_eligible: true,
    itc_eligible: true,
    notes: "Meets 45% domestic content. FEOC-compliant. Residential/C&I scale.",
    verified: "Q4 2025",
  },
  {
    name: "Eos Energy (Znyth)",
    origin: "USA",
    cells: "USA (zinc)",
    feoc_status: "compliant",
    dc_eligible: true,
    itc_eligible: true,
    notes: "Zinc hybrid cathode — no lithium, no FEOC exposure. US manufactured.",
    verified: "Q1 2026",
  },
  {
    name: "EticaAG",
    origin: "Taiwan / USA (Q3 2026)",
    cells: "Non-FEOC Taiwan",
    feoc_status: "compliant",
    dc_eligible: false,
    itc_eligible: true,
    notes: "Non-FEOC Taiwan production now. Full US manufacturing starting Q3 2026.",
    verified: "Q1 2026",
  },
  {
    name: "CATL (EnerC)",
    origin: "China",
    cells: "China",
    feoc_status: "non_compliant",
    dc_eligible: false,
    itc_eligible: false,
    notes: "PFE — projects using CATL components after Jan 1 2026 may lose ITC eligibility.",
    verified: "Q1 2026",
  },
  {
    name: "BYD",
    origin: "China",
    cells: "China",
    feoc_status: "non_compliant",
    dc_eligible: false,
    itc_eligible: false,
    notes: "PFE — same FEOC restrictions as CATL. Not ITC-eligible for 2026+ construction start.",
    verified: "Q1 2026",
  },
];

const GUIDANCE_TIMELINE = [
  {
    date: "Feb 12, 2026",
    notice: "Notice 2026-15",
    title: "FEOC Material Assistance (MACR) Guidance",
    summary: "Operational guidance for MACR calculations. Introduces Cost Percentage, Identification, and Certification Safe Harbors. Projects beginning construction after Jan 1, 2026 must comply.",
    impact: "critical",
    url: "https://www.irs.gov/pub/irs-drop/n-26-15.pdf",
  },
  {
    date: "Jan 16, 2025",
    notice: "Notice 2025-08",
    title: "First Updated Elective Safe Harbor",
    summary: "Updated component cost tables for solar PV (split into ground-mount and rooftop) and BESS. Adds columns for domestic c-Si cells and wafers. Basis for MACR calculations.",
    impact: "high",
    url: "https://www.irs.gov/pub/irs-drop/n-25-08.pdf",
  },
  {
    date: "May 24, 2024",
    notice: "Notice 2024-41",
    title: "New Elective Safe Harbor",
    summary: "Introduced simplified safe harbor using IRS-assigned component cost percentages. Expanded eligible project types. Reduces burden of collecting direct cost data from manufacturers.",
    impact: "high",
    url: "https://www.irs.gov/pub/irs-drop/n-24-41.pdf",
  },
  {
    date: "May 12, 2023",
    notice: "Notice 2023-38",
    title: "Initial Domestic Content Guidance",
    summary: "First IRS guidance on domestic content bonus. Defined steel/iron requirement (100% US) and manufactured products requirement. Established Table 2 component lists for solar, wind, BESS.",
    impact: "medium",
    url: "https://www.irs.gov/pub/irs-drop/n-23-38.pdf",
  },
];

// ─────────────────────────────────────────
// HELPER COMPONENTS
// ─────────────────────────────────────────
const FEOCBadge = ({ status }: { status: string }) => {
  const map: Record<string, { label: string; cls: string }> = {
    compliant: { label: "FEOC Compliant", cls: "bg-green-500/15 text-green-400 border-green-500/30" },
    conditional: { label: "Conditional", cls: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
    non_compliant: { label: "Non-Compliant", cls: "bg-red-500/15 text-red-400 border-red-500/30" },
  };
  const { label, cls } = map[status] || map.conditional;
  return (
    <span className={`inline-block rounded border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${cls}`}>
      {label}
    </span>
  );
};

const ImpactBadge = ({ impact }: { impact: string }) => {
  const map: Record<string, string> = {
    critical: "bg-red-500/15 text-red-400 border-red-500/30",
    high: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    medium: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  };
  return (
    <span className={`inline-block rounded border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${map[impact]}`}>
      {impact}
    </span>
  );
};

type TabKey = "overview" | "feoc" | "manufacturers" | "timeline";

// ─────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────
export default function ComplianceTracker() {
  const [tab, setTab] = useState<TabKey>("overview");
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const tabs: { key: TabKey; label: string; icon: string }[] = [
    { key: "overview", label: "DC Thresholds", icon: "%" },
    { key: "feoc", label: "FEOC / MACR", icon: "⚠" },
    { key: "manufacturers", label: "BESS Manufacturers", icon: "🔋" },
    { key: "timeline", label: "Guidance Timeline", icon: "📋" },
  ];

  return (
    <section>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-zinc-50">Domestic Content & FEOC Tracker</h2>
            <span className="rounded bg-red-500/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-red-400 border border-red-500/30">
              Critical 2026
            </span>
          </div>
          <p className="mt-1 text-sm text-zinc-500">
            ITC eligibility depends on DC adder compliance + FEOC sourcing rules. Updated per Notice 2026-15 (Feb 12, 2026).
          </p>
        </div>
        <a
          href="https://www.irs.gov/credits-deductions/domestic-content-bonus-credit"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 rounded border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:border-zinc-500 hover:text-zinc-200 transition-colors"
        >
          <ExternalLink className="h-3 w-3" />
          IRS Guidance
        </a>
      </div>

      {/* Alert banner */}
      <div className="mb-6 flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
        <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-400" />
        <div>
          <p className="text-sm font-medium text-amber-400">Projects beginning construction after Jan 1, 2026 must comply with FEOC restrictions.</p>
          <p className="mt-1 text-xs text-zinc-500">
            Storage projects safe-harbored before Jan 1, 2026 are exempt. Domestic content bonus requires separate qualification from FEOC compliance. Both tests must be run in parallel.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex flex-wrap gap-2">
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
            <span className="mr-1.5">{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW: DC THRESHOLDS ── */}
      {tab === "overview" && (
        <div className="space-y-6">
          {/* Key numbers */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-4">
              <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-500 mb-2">Base ITC (2026)</p>
              <p className="font-mono text-3xl font-bold text-amber-400">30%</p>
              <p className="mt-1 text-xs text-zinc-500">Section 48E — prevailing wage + apprenticeship required</p>
            </div>
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
              <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-500 mb-2">DC Bonus Adder</p>
              <p className="font-mono text-3xl font-bold text-amber-400">+10%</p>
              <p className="mt-1 text-xs text-zinc-500">Requires 50% domestic manufactured products in 2026</p>
            </div>
            <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-4">
              <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-500 mb-2">Max ITC w/ Adders</p>
              <p className="font-mono text-3xl font-bold text-green-400">50%+</p>
              <p className="mt-1 text-xs text-zinc-500">DC + Energy Community + Low-Income adders combined</p>
            </div>
          </div>

          {/* Threshold table */}
          <div className="rounded-lg border border-zinc-800 overflow-hidden">
            <table className="w-full text-left">
              <thead className="border-b border-zinc-800 bg-zinc-900/50">
                <tr>
                  <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-zinc-500">Construction Start</th>
                  <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-zinc-500">Solar PV Min %</th>
                  <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-zinc-500">BESS Min %</th>
                  <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-zinc-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {DC_THRESHOLDS.map((row, i) => (
                  <tr key={i} className={`transition-colors ${row.status === "current" ? "bg-amber-500/5" : "bg-zinc-900/30 hover:bg-zinc-800/30"}`}>
                    <td className="px-4 py-3 text-sm font-medium text-zinc-200">
                      {row.period}
                      {row.status === "current" && (
                        <span className="ml-2 rounded bg-amber-500/20 px-1.5 py-0.5 font-mono text-[9px] text-amber-400">NOW</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-sm font-bold text-amber-400">{row.solar}%</td>
                    <td className="px-4 py-3 font-mono text-sm font-bold text-amber-400">{row.bess}%</td>
                    <td className="px-4 py-3">
                      {row.status === "past" && <span className="text-xs text-zinc-600">Passed</span>}
                      {row.status === "current" && <span className="text-xs text-amber-400 font-medium">Active</span>}
                      {row.status === "future" && <span className="text-xs text-zinc-500">Upcoming</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Key rules */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-4">
            <p className="mb-3 text-sm font-semibold text-zinc-200">Key Rules (Notice 2025-08 + OBBBA)</p>
            <div className="space-y-2 text-xs text-zinc-400">
              <div className="flex items-start gap-2"><CheckCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-green-400" /><span><strong className="text-zinc-300">Steel & Iron:</strong> 100% US-made required for all structural elements — no exceptions.</span></div>
              <div className="flex items-start gap-2"><CheckCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-green-400" /><span><strong className="text-zinc-300">Elective Safe Harbor:</strong> Use IRS Notice 2025-08 tables to calculate component percentages without collecting manufacturer cost data.</span></div>
              <div className="flex items-start gap-2"><CheckCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-green-400" /><span><strong className="text-zinc-300">Solar + Storage:</strong> Must qualify separately as of 2025 — combined project safe harbor no longer applies.</span></div>
              <div className="flex items-start gap-2"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-amber-400" /><span><strong className="text-zinc-300">BESS without US cells:</strong> Max achievable DC% is 40% — not enough to qualify in 2026 (requires 50%). US-made cells required.</span></div>
              <div className="flex items-start gap-2"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-amber-400" /><span><strong className="text-zinc-300">Direct pay projects:</strong> DC compliance mandatory for full elective payment. Non-compliant projects lose eligibility entirely after 2025.</span></div>
            </div>
          </div>
        </div>
      )}

      {/* ── FEOC / MACR ── */}
      {tab === "feoc" && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4">
              <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-500 mb-2">FEOC Effective Date</p>
              <p className="font-mono text-2xl font-bold text-red-400">Jan 1, 2026</p>
              <p className="mt-1 text-xs text-zinc-500">Projects beginning construction after this date must comply with MACR thresholds</p>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-4">
              <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-500 mb-2">Current MACR Threshold (Storage)</p>
              <p className="font-mono text-2xl font-bold text-amber-400">55% non-PFE</p>
              <p className="mt-1 text-xs text-zinc-500">55% of manufactured product costs must come from non-FEOC entities in 2026</p>
            </div>
          </div>

          {/* MACR schedule */}
          <div className="rounded-lg border border-zinc-800 overflow-hidden">
            <div className="border-b border-zinc-800 bg-zinc-900/50 px-4 py-3">
              <p className="text-sm font-semibold text-zinc-200">MACR Thresholds — Non-PFE Required %</p>
              <p className="text-xs text-zinc-500 mt-0.5">Source: OBBBA + Notice 2026-15 (Feb 12, 2026)</p>
            </div>
            <table className="w-full text-left">
              <thead className="border-b border-zinc-800 bg-zinc-900/30">
                <tr>
                  <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-zinc-500">Year</th>
                  <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-zinc-500">Storage MACR Min</th>
                  <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-zinc-500">Solar MACR Min</th>
                  <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-zinc-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {FEOC_THRESHOLDS.map((row, i) => (
                  <tr key={i} className={`transition-colors ${row.status === "current" ? "bg-amber-500/5" : "bg-zinc-900/30 hover:bg-zinc-800/30"}`}>
                    <td className="px-4 py-3 text-sm font-medium text-zinc-200">
                      {row.period}
                      {row.status === "current" && (
                        <span className="ml-2 rounded bg-amber-500/20 px-1.5 py-0.5 font-mono text-[9px] text-amber-400">NOW</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-sm font-bold text-amber-400">{row.storage_macr}%</td>
                    <td className="px-4 py-3 font-mono text-sm font-bold text-amber-400">{row.solar_macr}%</td>
                    <td className="px-4 py-3 text-xs text-zinc-500">{row.status === "current" ? <span className="text-amber-400 font-medium">Active</span> : "Upcoming"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Safe Harbors */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-4">
            <p className="mb-3 text-sm font-semibold text-zinc-200">Three Safe Harbor Pathways (Notice 2026-15)</p>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { title: "Identification Safe Harbor", desc: "Use MPs and MPCs listed in 2023-2025 Safe Harbor Tables as the exclusive list. Unlisted components are disregarded.", risk: "Low" },
                { title: "Cost Percentage Safe Harbor", desc: "Use IRS-assigned cost percentages from Notice 2025-08 tables. No need for manufacturer direct cost data.", risk: "Low" },
                { title: "Certification Safe Harbor", desc: "Obtain signed certifications from direct suppliers confirming PFE/non-PFE status and cost breakdowns.", risk: "Medium" },
              ].map((sh, i) => (
                <div key={i} className="rounded border border-zinc-700 p-3">
                  <p className="text-xs font-semibold text-zinc-200 mb-1">{sh.title}</p>
                  <p className="text-xs text-zinc-500 leading-relaxed">{sh.desc}</p>
                  <p className="mt-2 font-mono text-[10px] text-zinc-600">Documentation risk: <span className="text-zinc-400">{sh.risk}</span></p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-4">
            <p className="mb-3 text-sm font-semibold text-zinc-200">Key FEOC Rules</p>
            <div className="space-y-2 text-xs text-zinc-400">
              <div className="flex items-start gap-2"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-red-400" /><span><strong className="text-zinc-300">PFE = Prohibited Foreign Entity</strong> — any entity owned 25%+ by China, Russia, Iran, or North Korea government or nationals.</span></div>
              <div className="flex items-start gap-2"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-amber-400" /><span><strong className="text-zinc-300">Manufacturing location ≠ FEOC compliance.</strong> A battery made in South Korea by a Chinese-owned company is still FEOC.</span></div>
              <div className="flex items-start gap-2"><CheckCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-green-400" /><span><strong className="text-zinc-300">Safe-harbored projects:</strong> Storage safe-harbored before Jan 1, 2026 are fully exempt from FEOC requirements.</span></div>
              <div className="flex items-start gap-2"><CheckCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-green-400" /><span><strong className="text-zinc-300">No ITC = No FEOC.</strong> If your project isn't claiming ITC, FEOC restrictions don't apply. Relevant for some DG economics.</span></div>
              <div className="flex items-start gap-2"><Clock className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-blue-400" /><span><strong className="text-zinc-300">More guidance expected:</strong> Proposed regulations on "Foreign-Influenced Entity" rules still pending. Comments due March 30, 2026.</span></div>
            </div>
          </div>
        </div>
      )}

      {/* ── BESS MANUFACTURERS ── */}
      {tab === "manufacturers" && (
        <div className="space-y-4">
          <p className="text-xs text-zinc-500">
            FEOC status based on latest available information. Verify with supplier certifications before procurement. Status subject to change as Treasury guidance evolves.
          </p>
          <div className="rounded-lg border border-zinc-800 overflow-hidden">
            <table className="w-full text-left">
              <thead className="border-b border-zinc-800 bg-zinc-900/50">
                <tr>
                  <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-zinc-500">Manufacturer</th>
                  <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-zinc-500">FEOC Status</th>
                  <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-zinc-500">Cell Origin</th>
                  <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-zinc-500">DC Eligible</th>
                  <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-zinc-500">ITC Eligible</th>
                  <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-zinc-500">Verified</th>
                  <th className="px-4 py-3 w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {BESS_MANUFACTURERS.map((m, i) => (
                  <>
                    <tr
                      key={i}
                      className="bg-zinc-900/30 hover:bg-zinc-800/30 cursor-pointer transition-colors"
                      onClick={() => setExpandedRow(expandedRow === i ? null : i)}
                    >
                      <td className="px-4 py-3 text-sm font-medium text-zinc-200">{m.name}</td>
                      <td className="px-4 py-3"><FEOCBadge status={m.feoc_status} /></td>
                      <td className="px-4 py-3 font-mono text-xs text-zinc-400">{m.cells}</td>
                      <td className="px-4 py-3">
                        {m.dc_eligible
                          ? <CheckCircle className="h-4 w-4 text-green-400" />
                          : <span className="font-mono text-xs text-zinc-600">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {m.itc_eligible
                          ? <CheckCircle className="h-4 w-4 text-green-400" />
                          : <AlertTriangle className="h-4 w-4 text-red-400" />}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-zinc-600">{m.verified}</td>
                      <td className="px-4 py-3 text-zinc-600">
                        {expandedRow === i ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </td>
                    </tr>
                    {expandedRow === i && (
                      <tr key={`${i}-detail`} className="bg-zinc-900/60">
                        <td colSpan={7} className="px-4 py-3 text-xs text-zinc-400 leading-relaxed">
                          <strong className="text-zinc-300">Notes:</strong> {m.notes}
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-zinc-600">
            * This table is manually maintained. Always obtain supplier certifications and verify PFE status independently before procurement decisions. Consult your tax advisor.
          </p>
        </div>
      )}

      {/* ── GUIDANCE TIMELINE ── */}
      {tab === "timeline" && (
        <div className="space-y-4">
          {GUIDANCE_TIMELINE.map((g, i) => (
            <div key={i} className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="font-mono text-xs text-zinc-500">{g.date}</span>
                    <span className="font-mono text-xs font-bold text-amber-400">{g.notice}</span>
                    <ImpactBadge impact={g.impact} />
                  </div>
                  <p className="text-sm font-semibold text-zinc-200 mb-2">{g.title}</p>
                  <p className="text-xs text-zinc-500 leading-relaxed">{g.summary}</p>
                </div>
                <a
                  href={g.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:border-zinc-500 hover:text-zinc-200 transition-colors flex-shrink-0"
                >
                  <ExternalLink className="h-3 w-3" />
                  Read Notice
                </a>
              </div>
            </div>
          ))}
          <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4">
            <div className="flex items-start gap-2">
              <Clock className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-400" />
              <div>
                <p className="text-sm font-medium text-blue-400">Upcoming guidance</p>
                <p className="mt-1 text-xs text-zinc-500">
                  Proposed regulations on Foreign-Influenced Entity rules expected. IRS safe harbor tables for MACR calculations due by Dec 31, 2026. Comments on Notice 2026-15 due March 30, 2026.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
