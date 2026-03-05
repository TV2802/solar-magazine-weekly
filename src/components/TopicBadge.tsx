import { TOPIC_CONFIG } from "@/lib/topics";
import type { Database } from "@/integrations/supabase/types";

type TopicCategory = Database["public"]["Enums"]["topic_category"];

export function TopicBadge({ topic }: { topic: TopicCategory }) {
  const config = TOPIC_CONFIG[topic];
  return (
    <span
      className={`inline-block rounded-sm px-2 py-0.5 text-xs font-semibold uppercase tracking-wider ${config.bgClass} text-primary-foreground`}
    >
      {config.emoji} {config.label}
    </span>
  );
}
