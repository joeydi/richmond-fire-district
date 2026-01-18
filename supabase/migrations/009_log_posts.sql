-- Log Posts table for water system updates
-- Users can post updates with rich text content and images

-- ============================================
-- LOG POSTS TABLE
-- ============================================
CREATE TABLE log_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for chronological listing
CREATE INDEX log_posts_created_at_idx ON log_posts(created_at DESC);

-- Index for author queries
CREATE INDEX log_posts_author_id_idx ON log_posts(author_id);

-- Trigger for updated_at
CREATE TRIGGER log_posts_updated_at
  BEFORE UPDATE ON log_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- LOG POST IMAGES TABLE
-- ============================================
CREATE TABLE log_post_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  log_post_id UUID NOT NULL REFERENCES log_posts(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  filename TEXT NOT NULL,
  size_bytes INTEGER,
  mime_type TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES profiles(id)
);

-- Index for fast lookups by log post
CREATE INDEX log_post_images_post_idx ON log_post_images(log_post_id);

-- Index for lookups by creator
CREATE INDEX log_post_images_created_by_idx ON log_post_images(created_by);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE log_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE log_post_images ENABLE ROW LEVEL SECURITY;

-- LOG POSTS POLICIES

-- All authenticated users can view log posts
CREATE POLICY "Authenticated users can view log posts"
  ON log_posts
  FOR SELECT
  TO authenticated
  USING (true);

-- Editors and admins can create log posts
CREATE POLICY "Editors can create log posts"
  ON log_posts
  FOR INSERT
  TO authenticated
  WITH CHECK (is_editor_or_admin());

-- Authors can update their own posts, admins can update any
CREATE POLICY "Authors and admins can update log posts"
  ON log_posts
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = author_id OR is_admin()
  )
  WITH CHECK (
    auth.uid() = author_id OR is_admin()
  );

-- Only admins can delete log posts
CREATE POLICY "Admins can delete log posts"
  ON log_posts
  FOR DELETE
  TO authenticated
  USING (is_admin());

-- LOG POST IMAGES POLICIES

-- All authenticated users can view log post images
CREATE POLICY "Authenticated users can view log post images"
  ON log_post_images
  FOR SELECT
  TO authenticated
  USING (true);

-- Editors can insert images (post author check happens in app)
CREATE POLICY "Editors can insert log post images"
  ON log_post_images
  FOR INSERT
  TO authenticated
  WITH CHECK (is_editor_or_admin());

-- Authors can delete images from their posts, admins can delete any
CREATE POLICY "Authors and admins can delete log post images"
  ON log_post_images
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM log_posts
      WHERE log_posts.id = log_post_images.log_post_id
      AND (log_posts.author_id = auth.uid() OR is_admin())
    )
  );
