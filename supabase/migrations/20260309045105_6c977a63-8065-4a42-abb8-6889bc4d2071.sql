CREATE TABLE public.pvwatts_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  state_id text NOT NULL UNIQUE,
  state_name text NOT NULL,
  ac_annual numeric,
  capacity_factor numeric,
  fetched_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.pvwatts_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pvwatts_cache is publicly readable"
  ON public.pvwatts_cache
  FOR SELECT
  TO anon, authenticated
  USING (true);