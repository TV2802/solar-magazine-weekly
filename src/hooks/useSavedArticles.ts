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

// Global saved set so all cards stay in sync without re-fetching
let globalSaved = new Set<string>();
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((fn) => fn());
}

let hydrated = false;

async function hydrate() {
  if (hydrated) return;
  hydrated = true;
  const { data } = await supabase
    .from("saved_articles")
    .select("article_id")
    .eq("session_id", sessionId);
  if (data) {
    globalSaved = new Set(data.map((r) => r.article_id));
    notifyListeners();
  }
}

export function useSavedArticles() {
  const [, forceRender] = useState(0);

  useEffect(() => {
    const listener = () => forceRender((n) => n + 1);
    listeners.add(listener);
    hydrate();
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const isSaved = useCallback((articleId: string) => globalSaved.has(articleId), []);

  const toggleSave = useCallback(async (articleId: string) => {
    const wasSaved = globalSaved.has(articleId);

    // Optimistic update
    if (wasSaved) {
      globalSaved.delete(articleId);
    } else {
      globalSaved.add(articleId);
    }
    notifyListeners();

    if (wasSaved) {
      await supabase
        .from("saved_articles")
        .delete()
        .eq("article_id", articleId)
        .eq("session_id", sessionId);
    } else {
      await supabase.from("saved_articles").upsert(
        { article_id: articleId, session_id: sessionId },
        { onConflict: "article_id,session_id" }
      );
    }
  }, []);

  return { isSaved, toggleSave, sessionId };
}

export { sessionId };
