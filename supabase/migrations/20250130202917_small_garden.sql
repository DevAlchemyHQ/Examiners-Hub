/*
  # Create feedback table

  1. New Tables
    - `feedback`
      - `id` (uuid, primary key)
      - `feedback` (text, not null)
      - `created_at` (timestamptz, default now())

  2. Security
    - Enable RLS on `feedback` table
    - Add policy for authenticated users to insert feedback
    - Add policy for authenticated users to read feedback
*/

CREATE TABLE IF NOT EXISTS feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert feedback"
  ON feedback
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can read feedback"
  ON feedback
  FOR SELECT
  TO authenticated
  USING (true);