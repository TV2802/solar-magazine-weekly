import { TopicBadge } from "./TopicBadge";
import { FeedbackButtons } from "./FeedbackButtons";
import { Button } from "./ui/button";
import { X, ExternalLink, Clock } from "lucide-react";
import { format } from "date-fns";
import type { Article } from "@/hooks/useArticles";
import { TOPIC_CONFIG } from "@/lib/topics";
import { stripHtml } from "@/lib/utils";

interface ArticleDrawerProps {
  article: Article | null;
  open: boolean;
  onClose: () => void;
}

function estimateReadTime(text: string | null): string {
  if (!text) return "1 min";
  const words = text.trim().split(/\s+/).length;
  const mins = Math.max(1, Math.ceil(words / 200));
  return `${mins} min read`;
}

function getEnergyToken(topic: string): string {
  const map: Record<string, string> = {
    policy_incentives: "policy",
    technology_equipment: "technology",
    multifamily_nexus: "multifamily",
    market_pricing: "market",
    code_compliance: "compliance",
    bess_storage: "bess",
    innovation_spotlight: "innovation",
    project_wins: "wins",
    weekly_digest: "digest",
    solar: "policy",
    multifamily: "multifamily",
    battery: "bess",
    built_environment: "compliance",
    new_innovations: "innovation",
    company_success: "wins",
  };
  return map[topic] ?? "policy";
}

export function ArticleDrawer({ article, open, onClose }: ArticleDrawerProps) {
  if (!article) return null;

  const config = TOPIC_CONFIG[article.topic];
  const token = getEnergyToken(article.topic);
  const dateStr = article.published_at
    ? format(new Date(article.published_at), "MMMM d, yyyy")
    : "";
  const readTime = estimateReadTime(stripHtml(article.summary));

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 z-50 bg-black/70 backdrop-blur-sm transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className={`fixed inset-y-0 right-0 z-50 w-full max-w-lg transform border-l border-border bg-background shadow-2xl transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
      >
        {/* Colored top accent */}
        <div
          className="absolute left-0 top-0 h-[3px] w-full"
          style={{ backgroundColor: `hsl(var(--energy-${token}))` }}
        />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex h-full flex-col overflow-y-auto p-6 pt-14">
          {/* Section tag */}
          <span
            className="mb-4 inline-block font-mono text-[11px] font-medium uppercase tracking-[0.2em]"
            style={{ color: `hsl(var(--energy-${token}))` }}
          >
            {config.emoji} {config.label}
          </span>

          {/* Meta line */}
          <div className="mb-4 flex items-center gap-3 font-mono text-[11px] text-muted-foreground">
            {article.source_name && (
              <span className="font-medium text-foreground/60">{article.source_name}</span>
            )}
            {article.source_name && dateStr && <span className="opacity-30">·</span>}
            {dateStr && <span>{dateStr}</span>}
            <span className="opacity-30">·</span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" /> {readTime}
            </span>
          </div>

          {/* Title */}
          <h2 className="mb-6 font-display text-2xl font-extrabold leading-[1.1] text-foreground md:text-3xl">
            {article.title}
          </h2>

          {/* Summary */}
          {article.summary && (
            <div className="mb-6 text-base leading-[1.8] text-foreground/80">
              <p>{stripHtml(article.summary)}</p>
            </div>
          )}

          <div className="mt-auto flex items-center justify-between border-t border-border/50 pt-6">
            <FeedbackButtons articleId={article.id} />
            <Button asChild size="lg" className="gap-2 rounded-full font-mono text-xs tracking-wider">
              <a
                href={article.source_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                READ FULL ARTICLE <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
