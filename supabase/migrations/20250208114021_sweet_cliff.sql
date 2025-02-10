-- Drop existing projects table if it exists
DROP TABLE IF EXISTS projects;

-- Create projects table with correct schema
CREATE TABLE projects (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  form_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  images jsonb NOT NULL DEFAULT '[]'::jsonb,
  selected_images text[] NOT NULL DEFAULT '{}'::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their own project"
  ON projects
  FOR ALL
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Create indexes for better performance
CREATE INDEX idx_projects_user_id ON projects(id);
CREATE INDEX idx_projects_updated_at ON projects(updated_at);