import { useState } from "react";
import { HeroBanner } from "@/components/HeroBanner";
import { ArticleCard } from "@/components/ArticleCard";
import { ArticleDrawer } from "@/components/ArticleDrawer";
import { SectionNav } from "@/components/SectionNav";
import { useLatestIssue, useIssueArticles, useIssue, useAllIssues } from "@/hooks/useArticles";
import { Skeleton } from "@/components/ui/skeleton";
import { Zap } from "lucide-react";
import type { Article } from "@/hooks/useArticles";
import type { Database } from "@/integrations/supabase/types";

type TopicCategory = Database["public"]["Enums"]["topic_category"];

const Index = () => {
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [activeFilter, setActiveFilter] = useState<TopicCategory | null>(null);
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);

  const { data: latestIssue, isLoading: latestLoading } = useLatestIssue();
  const { data: allIssues } = useAllIssues();
  const { data: manualIssue } = useIssue(selectedIssueId ?? undefined);

  const issue = selectedIssueId ? manualIssue : latestIssue;
  const issueLoading = latestLoading;

  const { data: articles, isLoading: articlesLoading } = useIssueArticles(issue?.id);
  const isLoading = issueLoading || articlesLoading;

  const sortedArticles = [...(articles ?? [])]
    .filter((a) => a.topic !== "weekly_digest")
    .sort((a, b) => (b.relevance_score ?? 0) - (a.relevance_score ?? 0));

  const filteredArticles = activeFilter
    ? sortedArticles.filter((a) => a.topic === activeFilter)
    : sortedArticles;

  return (
    <>
      <HeroBanner
        issue={issue ?? null}
        allIssues={allIssues ?? []}
        onIssueChange={setSelectedIssueId}
      />
      <SectionNav activeFilter={activeFilter} onFilterChange={setActiveFilter} />

      <main className="container mx-auto px-4 py-10">
        {isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-48 rounded-lg" />
            ))}
          </div>
        ) : !articles || articles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <Zap className="mb-4 h-12 w-12 text-primary" />
            <h2 className="mb-2 font-display text-2xl font-bold">No Articles Yet</h2>
            <p className="max-w-md text-muted-foreground">
              The first weekly issue is being curated. Check back soon for the
              latest DER &amp; multifamily energy news.
            </p>
          </div>
        ) : filteredArticles.length === 0 ? (
          <p className="py-16 text-center text-muted-foreground">
            No articles in this section for the current issue.
          </p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredArticles.map((a) => (
              <ArticleCard key={a.id} article={a} onSelect={setSelectedArticle} />
            ))}
          </div>
        )}
      </main>

      <ArticleDrawer
        article={selectedArticle}
        open={!!selectedArticle}
        onClose={() => setSelectedArticle(null)}
      />
    </>
  );
};

export default Index;
