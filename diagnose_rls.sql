-- DIAGNOSTIC SCRIPT (CACHE VERSION)
-- Checks if the Cache Table Strategy is correctly applied.

-- 1. Check if Cache Table exists and has data
SELECT count(*) as cache_count FROM public.sys_membership_cache;

-- 2. Check Trigger definition on vve_memberships
SELECT tgname, tgtype, tgenabled, tgisinternal 
FROM pg_trigger 
WHERE tgrelid = 'public.vve_memberships'::regclass 
AND tgname = 'trg_sync_membership_cache';

-- 3. Check Function reads from CACHE (not View/Table)
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'get_my_vve_ids';
