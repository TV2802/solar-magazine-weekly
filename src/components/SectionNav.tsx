import { ALL_TOPICS, TOPIC_CONFIG } from "@/lib/topics";
import type { Database } from "@/integrations/supabase/types";

type TopicCategory = Database["public"]["Enums"]["topic_category"];

interface SectionNavProps {
  activeFilter: TopicCategory | null;
  onFilterChange: (topic: TopicCategory | null) => void;
}

function getEnergyToken(topic: string): string {
  const map: Record<string, string> = {
    policy_incentives: "policy",
    technology_equipment: "technology",
    multifamily_nexus: "multifamily",
    market_pricing: "market",
    code_compliance: "compliance",
    bess_storage: "bess",
    innovation_spotlight: "innovation",
    project_wins: "wins",
    weekly_digest: "digest",
  };
  return map[topic] ?? "policy";
}

export function SectionNav({ activeFilter, onFilterChange }: SectionNavProps) {
  return (
    <div className="sticky top-14 z-40 border-b border-border bg-background/95 backdrop-blur-md">
      <div className="container mx-auto px-4">
        <div className="flex gap-2 overflow-x-auto py-3 scrollbar-hide">
          <button
            onClick={() => onFilterChange(null)}
            className={`flex-shrink-0 rounded-full px-4 py-1.5 font-mono text-[11px] font-medium tracking-wider transition-all duration-200 ${
              activeFilter === null
                ? "bg-primary text-primary-foreground shadow-[0_0_12px_hsl(var(--primary)/0.4)]"
                : "border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
            }`}
          >
            ALL
          </button>
          {ALL_TOPICS.filter((t) => t !== "weekly_digest").map((topic) => {
            const config = TOPIC_CONFIG[topic];
            const isActive = activeFilter === topic;
            const token = getEnergyToken(topic);
            return (
              <button
                key={topic}
                onClick={() => onFilterChange(isActive ? null : topic)}
                className={`flex-shrink-0 rounded-full px-4 py-1.5 font-mono text-[11px] font-medium tracking-wider transition-all duration-200 ${
                  isActive
                    ? "text-primary-foreground shadow-lg"
                    : "border border-border text-muted-foreground hover:text-foreground"
                }`}
                style={
                  isActive
                    ? {
                        backgroundColor: `hsl(var(--energy-${token}))`,
                        boxShadow: `0 0 16px hsl(var(--energy-${token}) / 0.4)`,
                      }
                    : {
                        borderColor: undefined,
                      }
                }
                onMouseEnter={(e) => {
                  if (!isActive) {
                    (e.target as HTMLElement).style.borderColor = `hsl(var(--energy-${token}) / 0.5)`;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    (e.target as HTMLElement).style.borderColor = '';
                  }
                }}
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
