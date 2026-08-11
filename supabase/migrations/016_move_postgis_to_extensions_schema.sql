-- Move PostGIS out of `public` into the `extensions` schema
--
-- Migration 003 installed PostGIS into `public`, the schema PostgREST exposes.
-- That put `public.spatial_ref_sys` (PostGIS's EPSG catalog) behind the REST
-- API and tripped the "RLS Disabled in Public" advisor. Migration 015 tried to
-- enable RLS / revoke grants on that table and was refused -- it is owned by
-- supabase_admin, not postgres. Relocating the extension is the remaining fix:
-- `extensions` is not exposed to PostgREST, so the table leaves the API surface
-- entirely and the advisor entry clears.
--
-- PostGIS is marked non-relocatable, so ALTER EXTENSION ... SET SCHEMA is not
-- available; the extension must be dropped and recreated. `DROP EXTENSION
-- postgis CASCADE` cascades to exactly one object in this database:
-- `parcels.geometry` (verified -- it is the only geometry/geography column).
-- The GIST index goes with the column. To avoid re-importing from VCGI, the
-- geometries are staged in-database as EWKB (a lossless binary round-trip,
-- unlike GeoJSON text) and restored after the extension is recreated.
--
-- This whole file MUST run as one transaction so a failure cannot leave parcels
-- without geometry. `supabase db push` wraps migrations in a transaction; if
-- applying by hand, use `psql --single-transaction -f`.
--
-- Applied to production 2026-08-11. Verified afterwards: all 1751 parcels
-- present, geometries byte-identical to a pre-migration EWKB/GeoJSON export,
-- spatial_ref_sys now in `extensions`, and GET /rest/v1/spatial_ref_sys returns
-- 404 instead of the full table.

-- 1. Stage geometries as EWKB. Bit-exact, unlike ST_AsGeoJSON, which rounds to
--    9 decimal places.
CREATE TABLE parcels_geom_backup AS
  SELECT id, ST_AsEWKB(geometry) AS ewkb FROM parcels;

-- 2. Drop and recreate the extension in `extensions`. Cascades to
--    parcels.geometry and its GIST index; both are rebuilt below.
DROP EXTENSION postgis CASCADE;
CREATE EXTENSION postgis SCHEMA extensions;

-- 3. Rebuild the column, now typed against the relocated extension.
ALTER TABLE parcels ADD COLUMN geometry extensions.geometry(MultiPolygon, 4326);

-- The restore is a data migration, not a real edit, so suppress the
-- parcels_updated_at BEFORE UPDATE trigger -- otherwise every row's updated_at
-- is stamped with the migration time.
ALTER TABLE parcels DISABLE TRIGGER parcels_updated_at;

UPDATE parcels p
   SET geometry = extensions.ST_GeomFromEWKB(b.ewkb)
  FROM parcels_geom_backup b
 WHERE b.id = p.id;

ALTER TABLE parcels ENABLE TRIGGER parcels_updated_at;

-- Fail loudly rather than commit a partially restored table.
DO $$
DECLARE
  missing INTEGER;
  mismatched INTEGER;
BEGIN
  SELECT count(*) FILTER (WHERE p.geometry IS NULL),
         count(*) FILTER (WHERE extensions.ST_AsEWKB(p.geometry) IS DISTINCT FROM b.ewkb)
    INTO missing, mismatched
    FROM parcels p JOIN parcels_geom_backup b ON b.id = p.id;

  IF missing > 0 OR mismatched > 0 THEN
    RAISE EXCEPTION 'Geometry restore failed: % null, % not byte-identical', missing, mismatched;
  END IF;
END
$$;

ALTER TABLE parcels ALTER COLUMN geometry SET NOT NULL;

-- Matches the original index from migration 003.
CREATE INDEX parcels_geometry_idx ON parcels USING GIST (geometry);

DROP TABLE parcels_geom_backup;

-- 4. Repoint the RPCs at the relocated extension.
--    These are SECURITY DEFINER, which does NOT set search_path -- they would
--    otherwise resolve ST_* against the *caller's* path. anon and authenticated
--    have no search_path setting (they fall back to "$user", public) and so
--    would not find ST_Intersects in `extensions`. Pinning search_path on the
--    functions fixes that and also satisfies the function_search_path_mutable
--    advisor rule.
CREATE OR REPLACE FUNCTION get_parcels_in_viewport(
  min_lng DOUBLE PRECISION,
  min_lat DOUBLE PRECISION,
  max_lng DOUBLE PRECISION,
  max_lat DOUBLE PRECISION,
  limit_count INTEGER DEFAULT 500
)
RETURNS TABLE (
  id UUID,
  parcel_id TEXT,
  owner_name TEXT,
  address TEXT,
  geometry TEXT,
  properties JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.parcel_id,
    p.owner_name,
    p.address,
    ST_AsGeoJSON(p.geometry)::TEXT as geometry,
    p.properties,
    p.created_at,
    p.updated_at
  FROM parcels p
  WHERE ST_Intersects(
    p.geometry,
    ST_MakeEnvelope(min_lng, min_lat, max_lng, max_lat, 4326)
  )
  LIMIT limit_count;
END;
$$;

CREATE OR REPLACE FUNCTION get_parcel_by_id(parcel_uuid UUID)
RETURNS TABLE (
  id UUID,
  parcel_id TEXT,
  owner_name TEXT,
  address TEXT,
  geometry TEXT,
  properties JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.parcel_id,
    p.owner_name,
    p.address,
    ST_AsGeoJSON(p.geometry)::TEXT as geometry,
    p.properties,
    p.created_at,
    p.updated_at
  FROM parcels p
  WHERE p.id = parcel_uuid;
END;
$$;
