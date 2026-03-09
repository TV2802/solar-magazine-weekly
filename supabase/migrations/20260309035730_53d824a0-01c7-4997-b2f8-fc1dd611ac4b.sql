
CREATE TABLE public.saved_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  session_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (article_id, session_id)
);

ALTER TABLE public.saved_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read saved articles"
  ON public.saved_articles FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can insert saved articles"
  ON public.saved_articles FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can delete saved articles"
  ON public.saved_articles FOR DELETE
  TO anon, authenticated
  USING (true);
