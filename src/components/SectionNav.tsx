import { ALL_TOPICS, TOPIC_CONFIG } from "@/lib/topics";

export function SectionNav() {
  const scrollTo = (topic: string) => {
    const el = document.getElementById(`section-${topic}`);
    el?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="sticky top-14 z-40 border-b border-border bg-background/90 backdrop-blur-sm">
      <div className="container mx-auto px-4">
        <div className="flex gap-1 overflow-x-auto py-2 scrollbar-hide">
          {ALL_TOPICS.filter((t) => t !== "weekly_digest").map((topic) => {
            const config = TOPIC_CONFIG[topic];
            return (
              <button
                key={topic}
                onClick={() => scrollTo(topic)}
                className="flex-shrink-0 rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
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
