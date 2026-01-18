-- Storage RLS policies for log-images bucket
-- Note: The bucket must be created manually in Supabase dashboard

-- Allow authenticated users to view log images
CREATE POLICY "Authenticated users can view log images"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'log-images');

-- Allow editors to upload log images
CREATE POLICY "Editors can upload log images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'log-images'
  AND is_editor_or_admin()
);

-- Allow editors to update log images
CREATE POLICY "Editors can update log images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'log-images'
  AND is_editor_or_admin()
);

-- Allow editors to delete log images
CREATE POLICY "Editors can delete log images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'log-images'
  AND is_editor_or_admin()
);
