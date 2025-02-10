/*
  # Fix feedback table structure

  1. Changes
    - Drop existing feedback table
    - Create new feedback table with correct structure
    - Add appropriate policies and indexes
  
  2. Security
    - Enable RLS
    - Allow public inserts
    - Allow authenticated reads
*/

-- Drop existing table
DROP TABLE IF EXISTS feedback;

-- Create new feedback table with correct structure
CREATE TABLE feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('error', 'suggestion')),
  content text NOT NULL,
  rating text NOT NULL CHECK (rating IN ('😡', '😕', '😐', '🙂', '😄')),
  user_email text,
  user_name text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can insert feedback"
  ON feedback
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Only authenticated users can read feedback"
  ON feedback
  FOR SELECT
  TO authenticated
  USING (true);

-- Add indexes for better performance
CREATE INDEX idx_feedback_created_at ON feedback(created_at);
CREATE INDEX idx_feedback_type ON feedback(type);