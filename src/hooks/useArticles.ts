import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Article = Tables<"articles">;
export type Issue = Tables<"issues">;

export function useLatestIssue() {
  return useQuery({
    queryKey: ["latest-issue"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("issues")
        .select("*")
        .order("issue_number", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useIssueArticles(issueId: string | undefined) {
  return useQuery({
    queryKey: ["issue-articles", issueId],
    queryFn: async () => {
      if (!issueId) return [];
      const { data, error } = await supabase
        .from("articles")
        .select("*")
        .eq("issue_id", issueId)
        .order("is_featured", { ascending: false })
        .order("published_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!issueId,
  });
}

export function useAllIssues() {
  return useQuery({
    queryKey: ["all-issues"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("issues")
        .select("*")
        .order("issue_number", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useIssue(issueId: string | undefined) {
  return useQuery({
    queryKey: ["issue", issueId],
    queryFn: async () => {
      if (!issueId) return null;
      const { data, error } = await supabase
        .from("issues")
        .select("*")
        .eq("id", issueId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!issueId,
  });
}

export function useArticle(articleId: string | undefined) {
  return useQuery({
    queryKey: ["article", articleId],
    queryFn: async () => {
      if (!articleId) return null;
      const { data, error } = await supabase
        .from("articles")
        .select("*, issues(*)")
        .eq("id", articleId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!articleId,
  });
}
