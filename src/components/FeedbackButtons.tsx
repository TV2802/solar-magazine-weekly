import { ThumbsUp, ThumbsDown } from "lucide-react";
import { useArticleFeedback } from "@/hooks/useArticleFeedback";
import { cn } from "@/lib/utils";

interface FeedbackButtonsProps {
  articleId: string;
}

export function FeedbackButtons({ articleId }: FeedbackButtonsProps) {
  const { vote, toggleVote, loading } = useArticleFeedback(articleId);

  return (
    <div
      className="flex items-center gap-1"
      onClick={(e) => e.preventDefault()}
    >
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          toggleVote("up");
        }}
        disabled={loading}
        className={cn(
          "rounded p-1 transition-colors hover:bg-accent",
          vote === "up"
            ? "text-primary"
            : "text-muted-foreground/50 hover:text-muted-foreground"
        )}
        aria-label="Thumbs up"
      >
        <ThumbsUp
          className="h-3.5 w-3.5"
          fill={vote === "up" ? "currentColor" : "none"}
        />
      </button>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          toggleVote("down");
        }}
        disabled={loading}
        className={cn(
          "rounded p-1 transition-colors hover:bg-accent",
          vote === "down"
            ? "text-destructive"
            : "text-muted-foreground/50 hover:text-muted-foreground"
        )}
        aria-label="Thumbs down"
      >
        <ThumbsDown
          className="h-3.5 w-3.5"
          fill={vote === "down" ? "currentColor" : "none"}
        />
      </button>
    </div>
  );
}
