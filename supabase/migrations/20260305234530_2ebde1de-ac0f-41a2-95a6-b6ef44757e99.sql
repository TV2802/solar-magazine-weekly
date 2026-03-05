
CREATE TABLE public.article_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  vote text NOT NULL CHECK (vote IN ('up', 'down')),
  session_id text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (article_id, session_id)
);

ALTER TABLE public.article_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read feedback" ON public.article_feedback FOR SELECT USING (true);
CREATE POLICY "Anyone can insert feedback" ON public.article_feedback FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update feedback" ON public.article_feedback FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete feedback" ON public.article_feedback FOR DELETE USING (true);
