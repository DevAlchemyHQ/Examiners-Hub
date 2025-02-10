/*
  # Create feedback_v2 table

  1. New Table
    - `feedback_v2` table with enhanced structure for user feedback
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `type` (text, either 'error' or 'suggestion')
      - `content` (text)
      - `rating` (text, emoji rating)
      - `user_email` (text)
      - `user_name` (text)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS
    - Add policies for insert and select
*/

-- Create feedback_v2 table
CREATE TABLE IF NOT EXISTS feedback_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('error', 'suggestion')),
  content text NOT NULL,
  rating text NOT NULL CHECK (rating IN ('😡', '😕', '😐', '🙂', '😄')),
  user_email text,
  user_name text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE feedback_v2 ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can insert feedback"
  ON feedback_v2
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Only authenticated users can read feedback"
  ON feedback_v2
  FOR SELECT
  TO authenticated
  USING (true);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_feedback_v2_created_at 
ON feedback_v2(created_at);

CREATE INDEX IF NOT EXISTS idx_feedback_v2_type 
ON feedback_v2(type);

CREATE INDEX IF NOT EXISTS idx_feedback_v2_user_id 
ON feedback_v2(user_id);