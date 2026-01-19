-- Add forum display name field to profiles table
-- This field is used for displaying user names in the peer support forum

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS forum_display_name TEXT;

-- Add comment to explain the field
COMMENT ON COLUMN public.profiles.forum_display_name IS 'Display name for peer support forum (optional, for privacy)';
