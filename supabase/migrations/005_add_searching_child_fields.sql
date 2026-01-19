-- Add fields for storing information about the child parents are searching for
-- This helps with parent-child matching functionality

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS searching_child_birth_date DATE,
  ADD COLUMN IF NOT EXISTS searching_child_name_hiragana TEXT,
  ADD COLUMN IF NOT EXISTS searching_child_name_kanji TEXT;

-- Add comments to document the purpose of these fields
COMMENT ON COLUMN public.profiles.searching_child_birth_date IS '探している子どもの生年月日 (Birth date of child being searched for)';
COMMENT ON COLUMN public.profiles.searching_child_name_hiragana IS '探している子どもの名前（ひらがな） (Child name in hiragana)';
COMMENT ON COLUMN public.profiles.searching_child_name_kanji IS '探している子どもの名前（漢字） (Child name in kanji)';

-- Create index for searching by child birth date to improve matching performance
CREATE INDEX IF NOT EXISTS idx_profiles_searching_child_birth_date ON public.profiles(searching_child_birth_date);
