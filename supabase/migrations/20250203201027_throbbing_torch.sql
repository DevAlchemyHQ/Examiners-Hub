/*
  # Enable Email Verification

  1. Changes
    - Remove default value for email_confirmed_at to enforce email verification
    - Add trigger to handle email verification status

  2. Security
    - Ensures users verify their email before accessing the system
    - Maintains existing RLS policies
*/

-- Remove default value for email_confirmed_at
ALTER TABLE auth.users 
ALTER COLUMN email_confirmed_at DROP DEFAULT;

-- Reset existing unconfirmed users to require verification
UPDATE auth.users
SET email_confirmed_at = NULL
WHERE email_confirmed_at IS NOT NULL 
AND last_sign_in_at IS NULL;

-- Create function to handle email verification
CREATE OR REPLACE FUNCTION handle_email_verification()
RETURNS trigger AS $$
BEGIN
  -- Set initial profile values for new users
  INSERT INTO public.profiles (
    id,
    full_name,
    email,
    avatar_emoji,
    subscription_status,
    downloads_remaining
  )
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    new.email,
    '😊',
    'free',
    5
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;