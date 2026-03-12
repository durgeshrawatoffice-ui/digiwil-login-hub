-- Allow the app to force-refresh the REST schema cache when PostgREST is stale
CREATE OR REPLACE FUNCTION public.reload_schema_cache()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reload_schema_cache() TO authenticated;