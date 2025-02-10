/*
  # Storage Setup for Project Images

  1. Storage Bucket
    - Create project-images bucket for storing user images
    - Enable RLS on the bucket
  
  2. Storage Policies
    - Allow authenticated users to upload their own images
    - Allow authenticated users to read their own images
    - Allow authenticated users to delete their own images
*/

-- Create storage bucket for project images
INSERT INTO storage.buckets (id, name)
VALUES ('project-images', 'project-images')
ON CONFLICT DO NOTHING;

-- Enable RLS on the bucket
UPDATE storage.buckets
SET public = false
WHERE name = 'project-images';

-- Create storage policies
CREATE POLICY "Users can upload their own images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'project-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can read their own images"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'project-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update their own images"
ON storage.objects FOR UPDATE TO authenticated
WITH CHECK (
  bucket_id = 'project-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own images"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'project-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);