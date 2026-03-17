import { format } from "date-fns";
import { Zap } from "lucide-react";
import { IssueSelector } from "./IssueSelector";
import type { Issue } from "@/hooks/useArticles";

interface HeroBannerProps {
  issue: Issue | null;
  allIssues?: Issue[];
  onIssueChange?: (issueId: string) => void;
}

export function HeroBanner({ issue, allIssues = [], onIssueChange }: HeroBannerProps) {
  const weekLabel = issue
    ? `${format(new Date(issue.week_start), "MMM d")} — ${format(new Date(issue.week_end), "MMM d, yyyy")}`
    : format(new Date(), "MMMM d, yyyy");

  return (
    <header className="relative overflow-hidden bg-background border-b border-border">
      <div className="absolute left-0 top-0 h-[3px] w-full bg-gradient-to-r from-primary via-secondary to-primary" />

      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(hsl(var(--primary) / 0.3) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary) / 0.3) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />

      <div className="container relative mx-auto flex flex-col items-center px-4 py-16 text-center md:py-24">
        <div className="mb-6 flex items-center gap-3">
          <Zap className="h-8 w-8 text-primary md:h-10 md:w-10" />
          <span className="font-display text-4xl font-black tracking-tight text-foreground md:text-6xl">
            ENERGYPULSE
          </span>
        </div>

        <p className="mb-8 max-w-lg font-mono text-sm tracking-wide text-muted-foreground md:text-base">
          Curated DER intelligence for multifamily solar + storage developers
        </p>

        <div className="flex items-center gap-4">
          {issue && (
            <span className="rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 font-mono text-xs font-medium tracking-wider text-primary">
              ISSUE #{issue.issue_number}
            </span>
          )}
          <span className="font-mono text-xs tracking-wider text-muted-foreground">
            {weekLabel}
          </span>
        </div>

        {allIssues.length > 1 && onIssueChange && (
          <div className="mt-5">
            <IssueSelector
              issues={allIssues}
              currentIssueId={issue?.id}
              onSelect={onIssueChange}
            />
          </div>
        )}
      </div>
    </header>
  );
}
