
-- Add new enum values
ALTER TYPE public.topic_category ADD VALUE IF NOT EXISTS 'policy_incentives';
ALTER TYPE public.topic_category ADD VALUE IF NOT EXISTS 'technology_equipment';
ALTER TYPE public.topic_category ADD VALUE IF NOT EXISTS 'multifamily_nexus';
ALTER TYPE public.topic_category ADD VALUE IF NOT EXISTS 'market_pricing';
ALTER TYPE public.topic_category ADD VALUE IF NOT EXISTS 'code_compliance';
ALTER TYPE public.topic_category ADD VALUE IF NOT EXISTS 'bess_storage';
ALTER TYPE public.topic_category ADD VALUE IF NOT EXISTS 'innovation_spotlight';
ALTER TYPE public.topic_category ADD VALUE IF NOT EXISTS 'project_wins';
ALTER TYPE public.topic_category ADD VALUE IF NOT EXISTS 'weekly_digest';

-- Add digest_text column to issues
ALTER TABLE public.issues ADD COLUMN IF NOT EXISTS digest_text text;
