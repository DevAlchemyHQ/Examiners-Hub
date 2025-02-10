/*
  # Disable Email Confirmation

  1. Changes
    - Disable email confirmation requirement for new signups
    - Allow immediate login after registration
    - Update auth settings for better user experience

  2. Security
    - Email confirmation can still be enabled later if needed
    - Maintains other security features
*/

-- Update auth settings to disable email confirmation
ALTER TABLE auth.users
ALTER COLUMN email_confirmed_at
SET DEFAULT now();

-- Ensure existing users are confirmed
UPDATE auth.users
SET email_confirmed_at = now()
WHERE email_confirmed_at IS NULL;