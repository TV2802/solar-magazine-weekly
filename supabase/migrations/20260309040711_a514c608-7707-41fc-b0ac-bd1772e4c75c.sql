
-- market_metrics table
CREATE TABLE public.market_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name text NOT NULL UNIQUE,
  value numeric NOT NULL,
  unit text NOT NULL,
  trend text NOT NULL DEFAULT 'neutral' CHECK (trend IN ('up', 'down', 'neutral')),
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.market_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Market metrics are publicly readable"
  ON public.market_metrics FOR SELECT TO anon, authenticated USING (true);

-- incentive_status table
CREATE TABLE public.incentive_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_name text NOT NULL,
  state text NOT NULL,
  status text NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Waitlist', 'Closed', 'Pending')),
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.incentive_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Incentive status is publicly readable"
  ON public.incentive_status FOR SELECT TO anon, authenticated USING (true);

-- Seed market_metrics
INSERT INTO public.market_metrics (metric_name, value, unit, trend, notes) VALUES
  ('Solar Module Cost', 0.22, '$/W', 'down', 'Mono-PERC utility-grade; spot market avg'),
  ('BESS System Cost ($/Wh)', 0.28, '$/Wh', 'down', 'LFP battery system, AC-coupled residential'),
  ('BESS System Cost ($/kW)', 280, '$/kW', 'down', 'Installed cost including inverter'),
  ('ITC Rate', 30, '%', 'neutral', 'Base ITC under IRA; domestic content adder +10%'),
  ('SGIP Incentive Rate', 0.40, '$/Wh', 'down', 'CA SGIP Equity Resiliency step — check current step');

-- Seed incentive_status
INSERT INTO public.incentive_status (program_name, state, status, notes) VALUES
  ('SGIP — Equity Resiliency', 'CA', 'Active', 'Step 4 open; check CPUC for capacity'),
  ('NY-Sun Residential', 'NY', 'Active', 'Incentive declines per MW installed milestone'),
  ('Mass Solar Loan', 'MA', 'Active', 'Income-eligible low-interest solar loans'),
  ('NJ TRECs', 'NJ', 'Active', 'Transition RECs for net-metered solar'),
  ('Colorado RENU Loan', 'CO', 'Active', 'CEEF low-interest energy upgrade loans'),
  ('TX Solar Property Tax Exemption', 'TX', 'Active', '100% property tax exemption for solar installs'),
  ('IRA Domestic Content Adder', 'Federal', 'Active', '+10% ITC for qualifying domestic content'),
  ('IRA Low-Income Community Adder', 'Federal', 'Active', '+10-20% ITC for low-income community projects'),
  ('CA MASH Program', 'CA', 'Closed', 'Multifamily Affordable Solar Housing — funds depleted'),
  ('NYSERDA Clean Heat', 'NY', 'Waitlist', 'Heat pump incentives; waitlist for contractors'),
  ('PSEG Smart Ideas C&I', 'NJ', 'Active', 'C&I efficiency + solar rebates'),
  ('Mass SMART', 'MA', 'Active', 'Solar Massachusetts Renewable Target program');
