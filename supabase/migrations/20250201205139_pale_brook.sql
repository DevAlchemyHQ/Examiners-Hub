/*
  # Fix Storage Bucket Name

  1. Updates
    - Create new bucket with unique name
    - Set proper bucket configuration
    - Update storage policies
  
  2. Security
    - Enable RLS
    - Add proper access policies
*/

-- Recreate bucket with unique name
DO $$
BEGIN
  -- Delete existing bucket if it exists
  DELETE FROM storage.buckets WHERE id = 'user-project-files';
  
  -- Create bucket with proper configuration
  INSERT INTO storage.buckets (id, name, public)
  VALUES (
    'user-project-files',
    'user-project-files',
    false
  );
END $$;

-- Update bucket configuration
UPDATE storage.buckets
SET public = false,
    file_size_limit = 52428800, -- 50MB limit
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif']
WHERE id = 'user-project-files';

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload their project files" ON storage.objects;
DROP POLICY IF EXISTS "Users can read their project files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their project files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their project files" ON storage.objects;

-- Create updated storage policies with new bucket name
CREATE POLICY "Users can upload their project files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'user-project-files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can read their project files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'user-project-files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

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