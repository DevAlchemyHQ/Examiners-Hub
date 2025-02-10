/*
  # Add avatar emoji column to profiles table

  1. Changes
    - Add avatar_emoji column to profiles table
    - Set default emoji value
    - Drop unused avatar_url column
*/

-- Add avatar_emoji column
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS avatar_emoji text DEFAULT '😊';

-- Drop unused avatar_url column
ALTER TABLE profiles
DROP COLUMN IF EXISTS avatar_url;