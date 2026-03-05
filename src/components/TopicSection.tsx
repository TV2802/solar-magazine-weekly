import { ArticleCard } from "./ArticleCard";
import { TOPIC_CONFIG } from "@/lib/topics";
import type { Article } from "@/hooks/useArticles";
import type { Database } from "@/integrations/supabase/types";

type TopicCategory = Database["public"]["Enums"]["topic_category"];

interface TopicSectionProps {
  topic: TopicCategory;
  articles: Article[];
}

export function TopicSection({ topic, articles }: TopicSectionProps) {
  if (articles.length === 0) return null;
  const config = TOPIC_CONFIG[topic];

  return (
    <section id={`section-${topic}`} className="mb-12 scroll-mt-24">
      <div className="mb-6 flex items-center gap-3">
        <div className={`h-6 w-1 rounded-full ${config.bgClass}`} />
        <span className="text-xl">{config.emoji}</span>
        <h2 className="font-display text-2xl font-bold text-foreground">
          {config.label}
        </h2>
        <span className="text-sm text-muted-foreground">
          {articles.length} article{articles.length !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {articles.map((a) => (
          <ArticleCard key={a.id} article={a} />
        ))}
      </div>
    </section>
  );
}
