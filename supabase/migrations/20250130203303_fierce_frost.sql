/*
  # Update Feedback System Policies

  1. Changes
    - Drop existing policies
    - Create new policies allowing:
      - Anonymous users to insert feedback
      - Authenticated users to read feedback

  2. Security
    - Maintain RLS on feedback table
    - Allow anonymous feedback submission
    - Restrict feedback viewing to authenticated users
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can insert feedback" ON feedback;
DROP POLICY IF EXISTS "Anyone can read feedback" ON feedback;
DROP POLICY IF EXISTS "Only authenticated users can read feedback" ON feedback;

-- Recreate policies with correct permissions
CREATE POLICY "Anyone can insert feedback"
  ON feedback
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Only authenticated users can read feedback"
  ON feedback
  FOR SELECT
  TO authenticated
  USING (true);