/*
  # Add Downloads Column to Profiles Table

  1. Changes
    - Add downloads_remaining column to profiles table
    - Set default value to 5 for free tier users
    - Add check constraint to ensure valid values
    - Update existing profiles to have 5 downloads

  2. Security
    - Maintain existing RLS policies
*/

-- Add downloads_remaining column
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS downloads_remaining integer DEFAULT 5;

-- Add check constraint to ensure valid values
ALTER TABLE profiles
ADD CONSTRAINT downloads_remaining_check 
CHECK (downloads_remaining IS NULL OR downloads_remaining >= 0);

-- Update existing profiles to have 5 downloads if they're on free tier
UPDATE profiles 
SET downloads_remaining = 5
WHERE subscription_status = 'free' AND downloads_remaining IS NULL;

-- Set downloads_remaining to NULL for premium users
UPDATE profiles
SET downloads_remaining = NULL
WHERE subscription_status != 'free';