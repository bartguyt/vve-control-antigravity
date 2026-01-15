-- Force PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';

-- Alternative: Comment on table often forces reload
COMMENT ON TABLE public.assignments IS 'Assignments module table - Reload Trigger';
