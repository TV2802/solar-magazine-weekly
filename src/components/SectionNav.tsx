import { ALL_TOPICS, TOPIC_CONFIG } from "@/lib/topics";
import type { Database } from "@/integrations/supabase/types";

type TopicCategory = Database["public"]["Enums"]["topic_category"];

interface SectionNavProps {
  activeFilter: TopicCategory | null;
  onFilterChange: (topic: TopicCategory | null) => void;
}

export function SectionNav({ activeFilter, onFilterChange }: SectionNavProps) {
  return (
    <div className="sticky top-14 z-40 border-b border-border bg-background/90 backdrop-blur-sm">
      <div className="container mx-auto px-4">
        <div className="flex gap-1 overflow-x-auto py-2 scrollbar-hide">
          <button
            onClick={() => onFilterChange(null)}
            className={`flex-shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              activeFilter === null
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            All
          </button>
          {ALL_TOPICS.filter((t) => t !== "weekly_digest").map((topic) => {
            const config = TOPIC_CONFIG[topic];
            const isActive = activeFilter === topic;
            return (
              <button
                key={topic}
                onClick={() => onFilterChange(isActive ? null : topic)}
                className={`flex-shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {config.emoji} {config.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
