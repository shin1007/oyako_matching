-- Migration: Add parent gender to profiles
-- Created: 2026-01-16

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS parent_gender TEXT
  CHECK (parent_gender IN ('male', 'female', 'other', 'prefer_not_to_say') OR parent_gender IS NULL);

COMMENT ON COLUMN public.profiles.parent_gender IS 'Gender of the parent (male/female/other/prefer_not_to_say) used for matching context';
