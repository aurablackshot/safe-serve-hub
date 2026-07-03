
-- Restrict has_role EXECUTE to authenticated only (needed by RLS policies)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- Drop broad SELECT policy on releases bucket that enables listing.
-- Public buckets still serve direct public URLs without an RLS SELECT policy.
DROP POLICY IF EXISTS "Public can read releases" ON storage.objects;
