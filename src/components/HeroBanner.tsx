import { format } from "date-fns";
import { Zap } from "lucide-react";
import type { Issue } from "@/hooks/useArticles";

export function HeroBanner({ issue }: { issue: Issue | null }) {
  const weekLabel = issue
    ? `${format(new Date(issue.week_start), "MMM d")} — ${format(new Date(issue.week_end), "MMM d, yyyy")}`
    : format(new Date(), "MMMM d, yyyy");

  return (
    <header className="relative overflow-hidden border-b border-border bg-foreground text-background">
      <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-energy-policy via-energy-bess to-energy-innovation" />

      <div className="container mx-auto flex flex-col items-start gap-2 px-4 py-10 md:flex-row md:items-end md:justify-between md:py-16">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" />
            <span className="font-display text-sm font-semibold uppercase tracking-widest text-primary">
              ENERGYPULSE
            </span>
          </div>
          <h1 className="font-display text-4xl font-bold leading-none md:text-6xl">
            Weekly Briefing
          </h1>
          <p className="mt-2 max-w-lg text-sm text-muted-foreground">
            Curated DER intelligence for multifamily solar + storage developers
          </p>
        </div>
        <div className="text-right">
          {issue && (
            <p className="mb-1 font-display text-lg font-semibold text-primary">
              Issue #{issue.issue_number}
            </p>
          )}
          <p className="text-sm text-muted-foreground">{weekLabel}</p>
        </div>
      </div>
    </header>
  );
}
