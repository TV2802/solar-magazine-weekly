import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { sessionId } from "@/hooks/useSavedArticles";
import { ArticleCard } from "./ArticleCard";
import { X, Bookmark } from "lucide-react";
import type { Article } from "@/hooks/useArticles";

interface SavedDrawerProps {
  open: boolean;
  onClose: () => void;
  onSelectArticle: (article: Article) => void;
}

export function SavedDrawer({ open, onClose, onSelectArticle }: SavedDrawerProps) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    supabase
      .from("saved_articles")
      .select("article_id, created_at, articles(*)")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (!error && data) {
          const fetched = data
            .map((row: any) => row.articles)
            .filter(Boolean) as Article[];
          setArticles(fetched);
        }
        setLoading(false);
      });
  }, [open]);

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
        className={`fixed inset-y-0 right-0 z-50 w-full max-w-md transform border-l border-border bg-background shadow-2xl transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
      >
        <div className="absolute left-0 top-0 h-[3px] w-full bg-primary" />

        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex h-full flex-col overflow-y-auto p-6 pt-14">
          <div className="mb-6 flex items-center gap-2">
            <Bookmark className="h-5 w-5 fill-primary text-primary" />
            <h2 className="font-display text-xl font-bold text-foreground">Saved Articles</h2>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 animate-pulse rounded-md bg-muted" />
              ))}
            </div>
          ) : articles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Bookmark className="mb-3 h-10 w-10 text-muted-foreground/30" />
              <p className="font-display text-base font-semibold text-foreground">No saved articles</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Bookmark articles to find them here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {articles.map((article) => (
                <ArticleCard
                  key={article.id}
                  article={article}
                  onSelect={(a) => {
                    onClose();
                    onSelectArticle(a);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
