-- Enable PostGIS extension for spatial queries
CREATE EXTENSION IF NOT EXISTS postgis;

-- Parcels table with PostGIS geometry
CREATE TABLE IF NOT EXISTS parcels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parcel_id TEXT NOT NULL,
  owner_name TEXT,
  address TEXT,
  geometry GEOMETRY(MultiPolygon, 4326) NOT NULL,
  properties JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Spatial index for fast viewport queries using ST_Intersects
CREATE INDEX IF NOT EXISTS parcels_geometry_idx ON parcels USING GIST (geometry);

-- Index for parcel_id lookups
CREATE INDEX IF NOT EXISTS parcels_parcel_id_idx ON parcels (parcel_id);

-- Unique constraint on parcel_id to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS parcels_parcel_id_unique ON parcels (parcel_id);

-- Row Level Security
ALTER TABLE parcels ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view parcels
CREATE POLICY "Authenticated users can view parcels"
  ON parcels
  FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can insert/update/delete parcels
CREATE POLICY "Admins can manage parcels"
  ON parcels
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_parcels_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER parcels_updated_at
  BEFORE UPDATE ON parcels
  FOR EACH ROW
  EXECUTE FUNCTION update_parcels_updated_at();

-- Function to get parcels within a viewport bounding box
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

-- Function to get a single parcel by ID
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
