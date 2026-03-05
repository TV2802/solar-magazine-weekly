-- Migrate old topic values to new ones
UPDATE public.articles SET topic = 'bess_storage' WHERE topic = 'battery';
UPDATE public.articles SET topic = 'technology_equipment' WHERE topic = 'solar';
UPDATE public.articles SET topic = 'multifamily_nexus' WHERE topic = 'multifamily';
UPDATE public.articles SET topic = 'innovation_spotlight' WHERE topic IN ('new_innovations', 'built_environment');
UPDATE public.articles SET topic = 'project_wins' WHERE topic = 'company_success';