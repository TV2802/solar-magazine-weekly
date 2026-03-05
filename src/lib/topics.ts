import type { Database } from "@/integrations/supabase/types";

type TopicCategory = Database["public"]["Enums"]["topic_category"];

export interface TopicConfig {
  label: string;
  emoji: string;
  colorClass: string;
  bgClass: string;
  borderClass: string;
}

export const TOPIC_CONFIG: Record<TopicCategory, TopicConfig> = {
  policy_incentives: {
    label: "Policy & Incentives",
    emoji: "📋",
    colorClass: "text-energy-policy",
    bgClass: "bg-energy-policy",
    borderClass: "border-energy-policy",
  },
  technology_equipment: {
    label: "Technology & Equipment",
    emoji: "⚡",
    colorClass: "text-energy-technology",
    bgClass: "bg-energy-technology",
    borderClass: "border-energy-technology",
  },
  multifamily_nexus: {
    label: "Multifamily + Energy Nexus",
    emoji: "🏢",
    colorClass: "text-energy-multifamily",
    bgClass: "bg-energy-multifamily",
    borderClass: "border-energy-multifamily",
  },
  market_pricing: {
    label: "Market Pricing & Trends",
    emoji: "📈",
    colorClass: "text-energy-market",
    bgClass: "bg-energy-market",
    borderClass: "border-energy-market",
  },
  code_compliance: {
    label: "Code Compliance & Mandates",
    emoji: "🏛️",
    colorClass: "text-energy-compliance",
    bgClass: "bg-energy-compliance",
    borderClass: "border-energy-compliance",
  },
  bess_storage: {
    label: "BESS & Storage Focus",
    emoji: "🔋",
    colorClass: "text-energy-bess",
    bgClass: "bg-energy-bess",
    borderClass: "border-energy-bess",
  },
  innovation_spotlight: {
    label: "Innovation Spotlight",
    emoji: "🚀",
    colorClass: "text-energy-innovation",
    bgClass: "bg-energy-innovation",
    borderClass: "border-energy-innovation",
  },
  project_wins: {
    label: "Project & Company Wins",
    emoji: "🏆",
    colorClass: "text-energy-wins",
    bgClass: "bg-energy-wins",
    borderClass: "border-energy-wins",
  },
  weekly_digest: {
    label: "Weekly News Digest",
    emoji: "📰",
    colorClass: "text-energy-digest",
    bgClass: "bg-energy-digest",
    borderClass: "border-energy-digest",
  },
  // Legacy values — kept for type safety, hidden from UI
  solar: {
    label: "Solar",
    emoji: "☀️",
    colorClass: "text-energy-policy",
    bgClass: "bg-energy-policy",
    borderClass: "border-energy-policy",
  },
  multifamily: {
    label: "Multifamily",
    emoji: "🏢",
    colorClass: "text-energy-multifamily",
    bgClass: "bg-energy-multifamily",
    borderClass: "border-energy-multifamily",
  },
  battery: {
    label: "Battery",
    emoji: "🔋",
    colorClass: "text-energy-bess",
    bgClass: "bg-energy-bess",
    borderClass: "border-energy-bess",
  },
  built_environment: {
    label: "Built Environment",
    emoji: "🏛️",
    colorClass: "text-energy-compliance",
    bgClass: "bg-energy-compliance",
    borderClass: "border-energy-compliance",
  },
  new_innovations: {
    label: "New Innovations",
    emoji: "🚀",
    colorClass: "text-energy-innovation",
    bgClass: "bg-energy-innovation",
    borderClass: "border-energy-innovation",
  },
  company_success: {
    label: "Success Stories",
    emoji: "🏆",
    colorClass: "text-energy-wins",
    bgClass: "bg-energy-wins",
    borderClass: "border-energy-wins",
  },
};

// Only the 9 active sections (excluding legacy values)
export const ALL_TOPICS: TopicCategory[] = [
  "policy_incentives",
  "technology_equipment",
  "multifamily_nexus",
  "market_pricing",
  "code_compliance",
  "bess_storage",
  "innovation_spotlight",
  "project_wins",
  "weekly_digest",
];
