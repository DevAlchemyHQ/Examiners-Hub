/*
  # Create Quail Maps Schema

  1. New Tables
    - `quail_maps`
      - `id` (uuid, primary key)
      - `region` (text, unique)
      - `name` (text)
      - `file_path` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `quail_maps` table
    - Add policy for authenticated users to read maps
*/

CREATE TABLE IF NOT EXISTS quail_maps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region text UNIQUE NOT NULL,
  name text NOT NULL,
  file_path text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE quail_maps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read quail maps"
  ON quail_maps
  FOR SELECT
  TO authenticated
  USING (true);