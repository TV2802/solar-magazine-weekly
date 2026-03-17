// Tag color mapping for consistent styling
const TAG_COLORS: Record<string, string> = {
  Solar: "policy",
  BESS: "bess",
  Policy: "compliance",
  Incentives: "policy",
  Interconnection: "technology",
  NEM: "market",
  SGIP: "policy",
  ITC: "policy",
  Multifamily: "multifamily",
  VPP: "innovation",
  Utilities: "market",
  Financing: "market",
  Grid: "technology",
  Federal: "compliance",
  Equipment: "technology",
  California: "wins",
  "New York": "wins",
  Texas: "wins",
  Massachusetts: "wins",
  Colorado: "wins",
  "New Jersey": "wins",
};

export function getTagToken(tag: string): string {
  return TAG_COLORS[tag] ?? "policy";
}

// All known tags in display order
export const ALL_TAGS = [
  "Solar", "BESS", "Policy", "Incentives", "ITC", "NEM", "SGIP",
  "Interconnection", "VPP", "Utilities", "Grid", "Federal",
  "Multifamily", "Financing", "Equipment",
  "California", "New York", "Texas", "Massachusetts", "Colorado", "New Jersey",
];
