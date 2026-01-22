-- Add fields for storing information about the child parents are searching for
-- This helps with parent-child matching functionality

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS target_person_birth_date DATE,
  ADD COLUMN IF NOT EXISTS target_person_name_hiragana TEXT,
  ADD COLUMN IF NOT EXISTS target_person_name_kanji TEXT;

-- Add comments to document the purpose of these fields
COMMENT ON COLUMN public.profiles.target_person_birth_date IS '探している対象者の生年月日 (Birth date of target person)';
COMMENT ON COLUMN public.profiles.target_person_name_hiragana IS '探している対象者の名前（ひらがな） (Target person name in hiragana)';
COMMENT ON COLUMN public.profiles.target_person_name_kanji IS '探している対象者の名前（漢字） (Target person name in kanji)';

-- Create index for searching by target person birth date to improve matching performance
CREATE INDEX IF NOT EXISTS idx_profiles_target_person_birth_date ON public.profiles(target_person_birth_date);
