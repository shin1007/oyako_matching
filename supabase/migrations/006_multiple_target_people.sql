-- Migration: Add support for multiple searching children
-- Created: 2026-01-16

-- Create target_people table
CREATE TABLE IF NOT EXISTS public.target_people (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  birth_date DATE,
  name_hiragana TEXT,
  name_kanji TEXT,
  gender TEXT CHECK (gender IN ('male', 'female', 'other') OR gender IS NULL),
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comments
-- Ensure gender column exists even if the table was created before this migration
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public'
      AND table_name = 'target_people'
      AND column_name = 'gender'
  ) THEN
    ALTER TABLE public.target_people
    ADD COLUMN gender TEXT CHECK (gender IN ('male', 'female', 'other') OR gender IS NULL);
  END IF;
END $$;

-- Add comments
COMMENT ON TABLE public.target_people IS 'Stores information about children that users are searching for (up to 5 per user)';
COMMENT ON COLUMN public.target_people.user_id IS 'Reference to the user who is searching for this child';
COMMENT ON COLUMN public.target_people.birth_date IS 'Birth date of the child being searched for';
COMMENT ON COLUMN public.target_people.name_hiragana IS 'Child name in hiragana';
COMMENT ON COLUMN public.target_people.name_kanji IS 'Child name in kanji';
COMMENT ON COLUMN public.target_people.gender IS 'Gender of the child being searched for (male/female/other)';
COMMENT ON COLUMN public.target_people.display_order IS 'Display order for sorting (0-4)';

-- Create indexes (safe if already exist)
CREATE INDEX IF NOT EXISTS idx_target_people_user_id ON public.target_people(user_id);
CREATE INDEX IF NOT EXISTS idx_target_people_birth_date ON public.target_people(birth_date);

-- Migrate existing data from profiles table (only if columns exist)
DO $$
BEGIN
  -- Check if the old columns exist before attempting migration
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'target_person_birth_date'
  ) THEN
    INSERT INTO public.target_people (user_id, birth_date, name_hiragana, name_kanji, display_order)
    SELECT 
      user_id,
      target_person_birth_date,
      target_person_name_hiragana,
      target_person_name_kanji,
      0 as display_order
    FROM public.profiles
    WHERE target_person_birth_date IS NOT NULL 
       OR target_person_name_hiragana IS NOT NULL 
       OR target_person_name_kanji IS NOT NULL;
    
    RAISE NOTICE 'Successfully migrated existing searching child data';
  ELSE
    RAISE NOTICE 'Old columns not found in profiles table, skipping data migration';
  END IF;
END $$;

-- Add constraint to limit 5 children per user
CREATE OR REPLACE FUNCTION check_target_people_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.target_people WHERE user_id = NEW.user_id) >= 5 THEN
    RAISE EXCEPTION 'Cannot add more than 5 searching children per user';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Recreate trigger safely
DROP TRIGGER IF EXISTS enforce_target_people_limit ON public.target_people;
CREATE TRIGGER enforce_target_people_limit
BEFORE INSERT ON public.target_people
FOR EACH ROW
EXECUTE FUNCTION check_target_people_limit();

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_target_people_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Recreate trigger safely
DROP TRIGGER IF EXISTS target_people_updated_at ON public.target_people;
CREATE TRIGGER target_people_updated_at
BEFORE UPDATE ON public.target_people
FOR EACH ROW
EXECUTE FUNCTION update_target_people_updated_at();

-- Mark old columns as deprecated (only if they exist)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'target_person_birth_date'
  ) THEN
    COMMENT ON COLUMN public.profiles.target_person_birth_date IS 'DEPRECATED: Use target_people table instead';
    COMMENT ON COLUMN public.profiles.target_person_name_hiragana IS 'DEPRECATED: Use target_people table instead';
    COMMENT ON COLUMN public.profiles.target_person_name_kanji IS 'DEPRECATED: Use target_people table instead';
    RAISE NOTICE 'Marked old columns as deprecated';
  END IF;
END $$;
