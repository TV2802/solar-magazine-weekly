import { TopicBadge } from "./TopicBadge";
import { FeedbackButtons } from "./FeedbackButtons";
import { Button } from "./ui/button";
import { X, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import type { Article } from "@/hooks/useArticles";

interface ArticleDrawerProps {
  article: Article | null;
  open: boolean;
  onClose: () => void;
}

export function ArticleDrawer({ article, open, onClose }: ArticleDrawerProps) {
  if (!article) return null;

  const dateStr = article.published_at
    ? format(new Date(article.published_at), "MMMM d, yyyy")
    : "";

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 z-50 bg-black/60 transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className={`fixed inset-y-0 right-0 z-50 w-full max-w-lg transform bg-background shadow-2xl transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-sm p-1 text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex h-full flex-col overflow-y-auto p-6 pt-14">
          {/* Meta */}
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <TopicBadge topic={article.topic} />
            {article.source_name && (
              <span className="text-sm font-medium text-muted-foreground">
                {article.source_name}
              </span>
            )}
            {dateStr && (
              <span className="text-sm text-muted-foreground">{dateStr}</span>
            )}
          </div>

          {/* Title */}
          <h2 className="mb-4 font-display text-2xl font-bold leading-tight text-foreground md:text-3xl">
            {article.title}
          </h2>

          {/* Image */}
          {article.image_url && (
            <img
              src={article.image_url}
              alt={article.title}
              className="mb-6 w-full rounded-lg object-cover"
            />
          )}

          {/* Summary */}
          {article.summary && (
            <div className="prose prose-sm max-w-none text-foreground mb-6">
              <p>{article.summary}</p>
            </div>
          )}

          <div className="mt-auto flex items-center justify-between pt-6 border-t border-border">
            <FeedbackButtons articleId={article.id} />
            <Button asChild size="lg" className="gap-2">
              <a
                href={article.source_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                Read Full Article <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
