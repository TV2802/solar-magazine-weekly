import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

function getSessionId() {
  let id = localStorage.getItem("feedback_session_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("feedback_session_id", id);
  }
  return id;
}

const sessionId = getSessionId();

type Vote = "up" | "down" | null;

export function useArticleFeedback(articleId: string) {
  const [vote, setVote] = useState<Vote>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase
      .from("article_feedback")
      .select("vote")
      .eq("article_id", articleId)
      .eq("session_id", sessionId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setVote(data.vote as Vote);
      });
  }, [articleId]);

  const toggleVote = useCallback(
    async (type: "up" | "down") => {
      if (loading) return;
      setLoading(true);

      try {
        if (vote === type) {
          // Remove vote
          await supabase
            .from("article_feedback")
            .delete()
            .eq("article_id", articleId)
            .eq("session_id", sessionId);
          setVote(null);
        } else {
          // Upsert vote
          await supabase.from("article_feedback").upsert(
            {
              article_id: articleId,
              session_id: sessionId,
              vote: type,
            },
            { onConflict: "article_id,session_id" }
          );
          setVote(type);
        }
      } finally {
        setLoading(false);
      }
    },
    [articleId, vote, loading]
  );

  return { vote, toggleVote, loading };
}
