/*
  # Fix Storage Bucket Configuration

  1. Updates
    - Ensure project-images bucket exists
    - Set proper bucket configuration
    - Update storage policies
  
  2. Security
    - Enable RLS
    - Add proper access policies
*/

-- Recreate project-images bucket with proper configuration
DO $$
BEGIN
  -- Delete existing bucket if it exists
  DELETE FROM storage.buckets WHERE id = 'project-images';
  
  -- Create bucket with proper configuration
  INSERT INTO storage.buckets (id, name, public)
  VALUES (
    'project-images',
    'project-images',
    false
  );
END $$;

-- Update bucket configuration
UPDATE storage.buckets
SET public = false,
    file_size_limit = 52428800, -- 50MB limit
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif']
WHERE id = 'project-images';

-- Drop existing policies
DROP POLICY IF EXISTS "Users can upload their own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can read their own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own images" ON storage.objects;

-- Create updated storage policies
CREATE POLICY "Users can upload their own images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'project-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can read their own images"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'project-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own images"
ON storage.objects FOR UPDATE TO authenticated
WITH CHECK (
  bucket_id = 'project-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own images"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'project-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);