import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { sessionId } from "@/hooks/useSavedArticles";
import { ArticleCard } from "@/components/ArticleCard";
import { ArticleDrawer } from "@/components/ArticleDrawer";
import { Bookmark } from "lucide-react";
import type { Article } from "@/hooks/useArticles";

export default function Saved() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Article | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    async function fetchSaved() {
      setLoading(true);
      const { data, error } = await supabase
        .from("saved_articles")
        .select("article_id, created_at, articles(*)")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: false });

      if (!error && data) {
        const fetched = data
          .map((row: any) => row.articles)
          .filter(Boolean) as Article[];
        setArticles(fetched);
      }
      setLoading(false);
    }
    fetchSaved();
  }, []);

  const handleSelect = (article: Article) => {
    setSelected(article);
    setDrawerOpen(true);
  };

  return (
    <main className="container mx-auto px-4 py-10">
      <div className="mb-8 flex items-center gap-3">
        <Bookmark className="h-6 w-6 fill-primary text-primary" />
        <h1 className="font-display text-3xl font-bold text-foreground">Saved Articles</h1>
      </div>

      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-md bg-muted" />
          ))}
        </div>
      ) : articles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Bookmark className="mb-4 h-12 w-12 text-muted-foreground/40" />
          <p className="font-display text-xl font-semibold text-foreground">No saved articles yet</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Click the bookmark icon on any article to save it here.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => (
            <ArticleCard key={article.id} article={article} onSelect={handleSelect} />
          ))}
        </div>
      )}

      <ArticleDrawer
        article={selected}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </main>
  );
}
