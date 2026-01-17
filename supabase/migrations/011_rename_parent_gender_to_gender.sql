-- Migration: Rename parent_gender to gender
-- Created: 2026-01-17

ALTER TABLE public.profiles 
RENAME COLUMN parent_gender TO gender;

COMMENT ON COLUMN public.profiles.gender IS 'Gender (male/female/other/prefer_not_to_say) used for matching context';
