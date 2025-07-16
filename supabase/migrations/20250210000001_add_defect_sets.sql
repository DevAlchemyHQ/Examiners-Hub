-- Create defect_sets table for storing user defect sets
CREATE TABLE IF NOT EXISTS defect_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE defect_sets ENABLE ROW LEVEL SECURITY;

-- Create policies for defect_sets
CREATE POLICY "Users can view own defect sets"
  ON defect_sets
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own defect sets"
  ON defect_sets
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own defect sets"
  ON defect_sets
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own defect sets"
  ON defect_sets
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_defect_sets_user_id ON defect_sets(user_id);
CREATE INDEX IF NOT EXISTS idx_defect_sets_created_at ON defect_sets(created_at);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_defect_sets_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_defect_sets_updated_at
  BEFORE UPDATE ON defect_sets
  FOR EACH ROW
  EXECUTE FUNCTION update_defect_sets_updated_at(); 