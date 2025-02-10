/*
  # Update feedback system

  1. Changes
    - Drop old feedback tables
    - Create new feedback table with simplified structure
    - Add appropriate policies
  
  2. Security
    - Enable RLS
    - Allow anonymous inserts
    - Allow authenticated reads
*/

-- Drop old tables if they exist
DROP TABLE IF EXISTS feedback;
DROP TABLE IF EXISTS feedback_v2;

-- Create new feedback table
CREATE TABLE feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('error', 'suggestion')),
  content text NOT NULL,
  rating text NOT NULL CHECK (rating IN ('😡', '😕', '😐', '🙂', '😄')),
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