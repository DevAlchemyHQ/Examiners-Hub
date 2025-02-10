-- Create storage bucket for user files if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES (
  'user-project-files',
  'user-project-files',
  true
) ON CONFLICT (id) DO UPDATE 
SET public = true;

-- Update bucket configuration
UPDATE storage.buckets
SET file_size_limit = 52428800, -- 50MB limit
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
WHERE id = 'user-project-files';

-- Drop existing policies
DROP POLICY IF EXISTS "Users can upload their project files" ON storage.objects;
DROP POLICY IF EXISTS "Users can read their project files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their project files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their project files" ON storage.objects;

-- Create storage policies
CREATE POLICY "Users can upload their project files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'user-project-files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can read their project files"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'user-project-files');

CREATE POLICY "Users can update their project files"
ON storage.objects FOR UPDATE TO authenticated
WITH CHECK (
  bucket_id = 'user-project-files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their project files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'user-project-files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);