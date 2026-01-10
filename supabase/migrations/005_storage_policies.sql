-- Storage RLS policies for infrastructure-images bucket

-- Allow authenticated users to view images
CREATE POLICY "Authenticated users can view infrastructure images"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'infrastructure-images');

-- Allow admins to upload images
CREATE POLICY "Admins can upload infrastructure images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'infrastructure-images'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Allow admins to update images
CREATE POLICY "Admins can update infrastructure images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'infrastructure-images'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Allow admins to delete images
CREATE POLICY "Admins can delete infrastructure images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'infrastructure-images'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);
