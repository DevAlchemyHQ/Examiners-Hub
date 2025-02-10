/*
  # Fix Image Metadata Storage

  1. Updates
    - Add file_path column to track storage location
    - Add public_url column to store cached URLs
    - Add indexes for faster queries
  
  2. Changes
    - Modify image_metadata table structure
    - Add necessary indexes
*/

-- Add new columns to image_metadata
ALTER TABLE image_metadata 
ADD COLUMN IF NOT EXISTS file_path text,
ADD COLUMN IF NOT EXISTS public_url text;

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_image_metadata_user_id 
ON image_metadata(user_id);

CREATE INDEX IF NOT EXISTS idx_image_metadata_created 
ON image_metadata(created_at);