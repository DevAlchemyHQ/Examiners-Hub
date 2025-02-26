/*
  # Add Bulk Defects Table

  1. New Table
    - `bulk_defects` table for storing bulk defect entries
      - `id` (uuid, primary key, references auth.users)
      - `data` (jsonb, stores defects and selected images)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS
    - Add policies for users to manage their own bulk defects
*/

-- Create bulk_defects table
CREATE TABLE IF NOT EXISTS bulk_defects (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  data jsonb NOT NULL DEFAULT '{
    "defects": [],
    "selectedImages": []
  }'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE bulk_defects ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their own bulk defects"
  ON bulk_defects
  FOR ALL
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bulk_defects_updated_at 
ON bulk_defects(updated_at);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_bulk_defects_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_bulk_defects_updated_at
  BEFORE UPDATE ON bulk_defects
  FOR EACH ROW
  EXECUTE FUNCTION update_bulk_defects_updated_at(); 