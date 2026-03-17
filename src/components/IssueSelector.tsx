import { format } from "date-fns";
import { ChevronDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Issue } from "@/hooks/useArticles";

interface IssueSelectorProps {
  issues: Issue[];
  currentIssueId: string | undefined;
  onSelect: (issueId: string) => void;
}

export function IssueSelector({ issues, currentIssueId, onSelect }: IssueSelectorProps) {
  if (issues.length <= 1) return null;

  return (
    <Select value={currentIssueId} onValueChange={onSelect}>
      <SelectTrigger className="w-auto gap-2 rounded-full border-border/50 bg-background/60 px-4 py-1.5 font-mono text-[11px] tracking-wider text-muted-foreground backdrop-blur-sm hover:border-primary/40 hover:text-foreground">
        <SelectValue placeholder="Select issue" />
      </SelectTrigger>
      <SelectContent className="max-h-64">
        {issues.map((issue) => (
          <SelectItem
            key={issue.id}
            value={issue.id}
            className="font-mono text-xs"
          >
            Issue #{issue.issue_number} · {format(new Date(issue.week_start), "MMM d")} – {format(new Date(issue.week_end), "MMM d, yyyy")}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
