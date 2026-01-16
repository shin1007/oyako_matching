-- Migration: Add support for multiple searching children
-- Created: 2026-01-16

-- Create searching_children table
CREATE TABLE IF NOT EXISTS public.searching_children (
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
COMMENT ON TABLE public.searching_children IS 'Stores information about children that users are searching for (up to 5 per user)';
COMMENT ON COLUMN public.searching_children.user_id IS 'Reference to the user who is searching for this child';
COMMENT ON COLUMN public.searching_children.birth_date IS 'Birth date of the child being searched for';
COMMENT ON COLUMN public.searching_children.name_hiragana IS 'Child name in hiragana';
COMMENT ON COLUMN public.searching_children.name_kanji IS 'Child name in kanji';
COMMENT ON COLUMN public.searching_children.gender IS 'Gender of the child being searched for (male/female/other)';
COMMENT ON COLUMN public.searching_children.display_order IS 'Display order for sorting (0-4)';

-- Create indexes
CREATE INDEX idx_searching_children_user_id ON public.searching_children(user_id);
CREATE INDEX idx_searching_children_birth_date ON public.searching_children(birth_date);

-- Migrate existing data from profiles table (only if columns exist)
DO $$
BEGIN
  -- Check if the old columns exist before attempting migration
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'searching_child_birth_date'
  ) THEN
    INSERT INTO public.searching_children (user_id, birth_date, name_hiragana, name_kanji, display_order)
    SELECT 
      user_id,
      searching_child_birth_date,
      searching_child_name_hiragana,
      searching_child_name_kanji,
      0 as display_order
    FROM public.profiles
    WHERE searching_child_birth_date IS NOT NULL 
       OR searching_child_name_hiragana IS NOT NULL 
       OR searching_child_name_kanji IS NOT NULL;
    
    RAISE NOTICE 'Successfully migrated existing searching child data';
  ELSE
    RAISE NOTICE 'Old columns not found in profiles table, skipping data migration';
  END IF;
END $$;

-- Add constraint to limit 5 children per user
CREATE OR REPLACE FUNCTION check_searching_children_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.searching_children WHERE user_id = NEW.user_id) >= 5 THEN
    RAISE EXCEPTION 'Cannot add more than 5 searching children per user';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_searching_children_limit
BEFORE INSERT ON public.searching_children
FOR EACH ROW
EXECUTE FUNCTION check_searching_children_limit();

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_searching_children_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER searching_children_updated_at
BEFORE UPDATE ON public.searching_children
FOR EACH ROW
EXECUTE FUNCTION update_searching_children_updated_at();

-- Mark old columns as deprecated (only if they exist)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'searching_child_birth_date'
  ) THEN
    COMMENT ON COLUMN public.profiles.searching_child_birth_date IS 'DEPRECATED: Use searching_children table instead';
    COMMENT ON COLUMN public.profiles.searching_child_name_hiragana IS 'DEPRECATED: Use searching_children table instead';
    COMMENT ON COLUMN public.profiles.searching_child_name_kanji IS 'DEPRECATED: Use searching_children table instead';
    RAISE NOTICE 'Marked old columns as deprecated';
  END IF;
END $$;
