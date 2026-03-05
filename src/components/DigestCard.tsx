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
    <div className="mb-12 rounded-lg border border-energy-digest/30 bg-card p-6 md:p-8">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Newspaper className="h-6 w-6 text-energy-digest" />
          <h2 className="font-display text-xl font-bold text-card-foreground">
            📰 Weekly News Digest
          </h2>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRegenerate}
          disabled={isGenerating || !issueId}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isGenerating ? "animate-spin" : ""}`} />
          {isGenerating ? "Generating…" : "Refresh"}
        </Button>
      </div>
      {digestText ? (
        <p className="text-base leading-relaxed text-card-foreground/90 italic">
          {digestText}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          No digest generated yet. Click Refresh to generate an AI editorial summary of this week's top stories.
        </p>
      )}
    </div>
  );
}
