-- FIX: Update sync_membership_cache to use association_id
-- This function was breaking updates on association_memberships because it referenced the old 'vve_id' column.

CREATE OR REPLACE FUNCTION public.sync_membership_cache()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.sys_membership_cache (user_id, vve_id) 
    VALUES (NEW.user_id, NEW.association_id) -- Updated to association_id
    ON CONFLICT DO NOTHING;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    DELETE FROM public.sys_membership_cache 
    WHERE user_id = OLD.user_id AND vve_id = OLD.association_id; -- Updated
    RETURN OLD;
  ELSIF (TG_OP = 'UPDATE') THEN
    DELETE FROM public.sys_membership_cache 
    WHERE user_id = OLD.user_id AND vve_id = OLD.association_id; -- Updated
    
    INSERT INTO public.sys_membership_cache (user_id, vve_id) 
    VALUES (NEW.user_id, NEW.association_id) -- Updated
    ON CONFLICT DO NOTHING;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;
