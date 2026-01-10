-- Infrastructure images table for storing photos of infrastructure points
CREATE TABLE IF NOT EXISTS infrastructure_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  infrastructure_point_id UUID NOT NULL REFERENCES infrastructure_points(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  filename TEXT NOT NULL,
  size_bytes INTEGER,
  mime_type TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES profiles(id)
);

-- Index for fast lookups by infrastructure point
CREATE INDEX IF NOT EXISTS infrastructure_images_point_idx
  ON infrastructure_images(infrastructure_point_id);

-- Index for lookups by creator
CREATE INDEX IF NOT EXISTS infrastructure_images_created_by_idx
  ON infrastructure_images(created_by);

-- Row Level Security
ALTER TABLE infrastructure_images ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view images
CREATE POLICY "Authenticated users can view infrastructure images"
  ON infrastructure_images
  FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can insert images
CREATE POLICY "Admins can insert infrastructure images"
  ON infrastructure_images
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Only admins can update images
CREATE POLICY "Admins can update infrastructure images"
  ON infrastructure_images
  FOR UPDATE
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

-- Only admins can delete images
CREATE POLICY "Admins can delete infrastructure images"
  ON infrastructure_images
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

