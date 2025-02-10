/*
  # Add image metadata table

  1. New Tables
    - `image_metadata`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `file_name` (text)
      - `photo_number` (text)
      - `description` (text)
      - `is_sketch` (boolean)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `image_metadata` table
    - Add policies for authenticated users to manage their own data
*/

-- Create image metadata table
CREATE TABLE IF NOT EXISTS image_metadata (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  photo_number text,
  description text,
  is_sketch boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE image_metadata ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can create their own image metadata"
  ON image_metadata
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own image metadata"
  ON image_metadata
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own image metadata"
  ON image_metadata
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own image metadata"
  ON image_metadata
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);