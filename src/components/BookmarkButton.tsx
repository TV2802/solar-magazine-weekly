import { Bookmark } from "lucide-react";
import { useSavedArticles } from "@/hooks/useSavedArticles";

interface BookmarkButtonProps {
  articleId: string;
  className?: string;
}

export function BookmarkButton({ articleId, className = "" }: BookmarkButtonProps) {
  const { isSaved, toggleSave } = useSavedArticles();
  const saved = isSaved(articleId);

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        toggleSave(articleId);
      }}
      aria-label={saved ? "Remove bookmark" : "Save article"}
      className={`rounded-full p-1.5 transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring ${className}`}
    >
      <Bookmark
        className={`h-4 w-4 transition-colors ${
          saved
            ? "fill-primary text-primary"
            : "fill-transparent text-muted-foreground hover:text-foreground"
        }`}
      />
    </button>
  );
}
