-- Secure PostGIS's spatial_ref_sys table
--
-- Migration 003 ran `CREATE EXTENSION postgis` without a SCHEMA clause, so
-- PostGIS installed into `public` -- the schema PostgREST exposes. That created
-- `public.spatial_ref_sys`, the EPSG coordinate-system catalog (~8,500 rows),
-- which PostGIS grants SELECT on to PUBLIC. Result: it is readable via
-- `GET /rest/v1/spatial_ref_sys` with the anon key, and the Supabase advisor
-- flags it as "RLS Disabled in Public".
--
-- The data itself is static public reference data -- no district or user data.
-- This migration attempts to close the API exposure anyway.
--
-- RESULT (applied 2026-08-11): every statement below was refused. On this
-- project spatial_ref_sys is owned by supabase_admin, not postgres, so the
-- REVOKEs warned "no privileges could be revoked", the COMMENT raised
-- insufficient_privilege, and RLS was not enabled -- an anon-key request to
-- /rest/v1/spatial_ref_sys still returns rows. This file is retained as the
-- record of that finding; see the PostGIS section of CLAUDE.md. Clearing the
-- advisor entry requires either superuser access (Supabase support) or moving
-- PostGIS out of `public` entirely.
--
-- Safe for this app: we only use ST_AsGeoJSON, ST_Intersects, and
-- ST_MakeEnvelope, none of which read spatial_ref_sys. Reprojection from
-- Vermont State Plane to WGS84 happens client-side with proj4 in
-- scripts/import-parcels.ts, not via ST_Transform.
--
-- Every statement below requires table ownership. On hosted Supabase this table
-- is often owned by supabase_admin rather than postgres, so each is guarded and
-- raises a WARNING instead of aborting the migration. If you see those
-- warnings, verify the exposure with:
--   curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/spatial_ref_sys?select=srid&limit=1" \
--     -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY"

-- Enable RLS. This is what the advisor actually checks for.
DO $$
BEGIN
  ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE WARNING 'spatial_ref_sys: not the table owner, RLS not enabled. The advisor warning will persist.';
END
$$;

-- Grants, not RLS, are what actually gate PostgREST here. PostGIS grants SELECT
-- to PUBLIC, so PUBLIC must be revoked -- revoking only anon and authenticated
-- would leave the PUBLIC grant in force. service_role is left alone so
-- scripts/import-parcels.ts keeps working.
DO $$
BEGIN
  REVOKE ALL ON TABLE public.spatial_ref_sys FROM PUBLIC;
  REVOKE ALL ON TABLE public.spatial_ref_sys FROM anon;
  REVOKE ALL ON TABLE public.spatial_ref_sys FROM authenticated;
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE WARNING 'spatial_ref_sys: not the table owner, grants unchanged. Table may still be readable via the REST API.';
END
$$;

-- Document why this table is an exception, for the next person who runs the advisor.
DO $$
BEGIN
  COMMENT ON TABLE public.spatial_ref_sys IS
    'PostGIS EPSG catalog. Lives in public because PostGIS was installed there (migration 003) and the extension is non-relocatable. API roles have no access; this app uses only ST_AsGeoJSON/ST_Intersects/ST_MakeEnvelope, which never read it. Reprojection is done client-side with proj4 in scripts/import-parcels.ts. See migration 015.';
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE WARNING 'spatial_ref_sys: not the table owner, comment not set.';
END
$$;
