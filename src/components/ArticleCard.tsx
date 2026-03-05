import { Link } from "react-router-dom";
import { TopicBadge } from "./TopicBadge";
import { FeedbackButtons } from "./FeedbackButtons";
import { ExternalLink } from "lucide-react";
import type { Article } from "@/hooks/useArticles";
import { format } from "date-fns";

interface ArticleCardProps {
  article: Article;
  featured?: boolean;
}

export function ArticleCard({ article, featured = false }: ArticleCardProps) {
  const dateStr = article.published_at
    ? format(new Date(article.published_at), "MMM d, yyyy")
    : "";

  if (featured) {
    return (
      <Link
        to={`/article/${article.id}`}
        className="group relative block overflow-hidden rounded-lg border border-border bg-card transition-all hover:shadow-xl"
      >
        {article.image_url && (
          <div className="aspect-[21/9] w-full overflow-hidden">
            <img
              src={article.image_url}
              alt={article.title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </div>
        )}
        <div className="p-6 md:p-8">
          <div className="mb-3 flex items-center gap-3">
            <TopicBadge topic={article.topic} />
            {article.source_name && (
              <span className="text-xs font-medium text-muted-foreground">
                {article.source_name}
              </span>
            )}
            {dateStr && (
              <span className="text-xs text-muted-foreground">{dateStr}</span>
            )}
          </div>
          <h2 className="mb-2 text-2xl font-bold leading-tight text-card-foreground md:text-3xl">
            {article.title}
          </h2>
          {article.summary && (
            <p className="text-base text-muted-foreground line-clamp-3">
              {article.summary}
            </p>
          )}
          <div className="mt-4 flex justify-end">
            <FeedbackButtons articleId={article.id} />
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      to={`/article/${article.id}`}
      className="group flex flex-col overflow-hidden rounded-lg border border-border bg-card transition-all hover:shadow-lg"
    >
      {article.image_url && (
        <div className="aspect-video w-full overflow-hidden">
          <img
            src={article.image_url}
            alt={article.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </div>
      )}
      <div className="flex flex-1 flex-col p-4">
        <div className="mb-2 flex items-center gap-2">
          <TopicBadge topic={article.topic} />
          {dateStr && (
            <span className="text-xs text-muted-foreground">{dateStr}</span>
          )}
        </div>
        <h3 className="mb-1 text-lg font-bold leading-snug text-card-foreground group-hover:text-primary transition-colors">
          {article.title}
        </h3>
        {article.summary && (
          <p className="mt-auto text-sm text-muted-foreground line-clamp-2">
            {article.summary}
          </p>
        )}
        {article.source_name && (
          <div className="mt-3 flex items-center gap-1 text-xs font-medium text-muted-foreground">
            <ExternalLink className="h-3 w-3" />
            {article.source_name}
          </div>
        )}
        <div className="mt-2 flex justify-end">
          <FeedbackButtons articleId={article.id} />
        </div>
      </div>
    </Link>
  );
}
