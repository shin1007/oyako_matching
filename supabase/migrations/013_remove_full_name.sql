-- Remove legacy full_name column from profiles table
-- This column has been replaced by last_name_kanji and first_name_kanji fields

ALTER TABLE profiles DROP COLUMN IF EXISTS full_name;
