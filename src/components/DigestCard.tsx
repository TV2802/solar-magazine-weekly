import { useState } from "react";
import { RefreshCw, Newspaper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface DigestCardProps {
  issueId: string | undefined;
  digestText: string | null;
}

export function DigestCard({ issueId, digestText }: DigestCardProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const queryClient = useQueryClient();

  const handleRegenerate = async () => {
    if (!issueId) return;
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-digest", {
        body: { issue_id: issueId },
      });
      if (error) throw error;
      toast.success("Digest regenerated");
      queryClient.invalidateQueries({ queryKey: ["latest-issue"] });
      queryClient.invalidateQueries({ queryKey: ["issue-articles"] });
    } catch (e: any) {
      toast.error(e.message || "Failed to generate digest");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="mb-12 overflow-hidden rounded-md border-l-[5px] border-l-primary bg-card p-6 md:p-8">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Newspaper className="h-5 w-5 text-primary" />
          <h2 className="font-display text-xl font-bold text-card-foreground">
            Weekly News Digest
          </h2>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRegenerate}
          disabled={isGenerating || !issueId}
          className="gap-2 rounded-full border-border font-mono text-[11px] tracking-wider"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isGenerating ? "animate-spin" : ""}`} />
          {isGenerating ? "GENERATING…" : "REFRESH"}
        </Button>
      </div>
      {digestText ? (
        <p className="font-body text-base leading-[1.8] text-card-foreground/80">
          {digestText}
        </p>
      ) : (
        <p className="font-mono text-sm text-muted-foreground">
          No digest generated yet. Click Refresh to generate an AI editorial summary.
        </p>
      )}
    </div>
  );
}
