/*
  # Add Projects Table

  1. New Tables
    - `projects`
      - `id` (uuid, primary key, references auth.users)
      - `form_data` (jsonb, stores form state)
      - `images` (jsonb, stores image metadata)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS on projects table
    - Add policy for users to manage their own projects
*/

-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  form_data jsonb NOT NULL DEFAULT '{}',
  images jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their own project"
  ON projects
  USING (auth.uid() = id);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_projects_updated_at 
ON projects(updated_at);