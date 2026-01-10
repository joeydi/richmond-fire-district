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
