-- Migration: プロフィール充実化 - 氏名の詳細分割、出身地情報追加
-- Created: 2026-01-17
-- Description: 親子プロフィールに以下のフィールドを追加します:
--   - last_name_kanji（苗字：漢字）
--   - last_name_hiragana（苗字：ひらがな）
--   - first_name_kanji（名前：漢字）
--   - first_name_hiragana（名前：ひらがな）
--   - birthplace_prefecture（出身地の都道府県）
--   - birthplace_municipality（出身地の市区町村）

-- ===== Profiles テーブルの更新 =====

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS last_name_kanji TEXT,
ADD COLUMN IF NOT EXISTS last_name_hiragana TEXT,
ADD COLUMN IF NOT EXISTS first_name_kanji TEXT,
ADD COLUMN IF NOT EXISTS first_name_hiragana TEXT,
ADD COLUMN IF NOT EXISTS birthplace_prefecture TEXT,
ADD COLUMN IF NOT EXISTS birthplace_municipality TEXT;

-- コメント追加
COMMENT ON COLUMN public.profiles.last_name_kanji IS 'ユーザーの苗字（漢字）';
COMMENT ON COLUMN public.profiles.last_name_hiragana IS 'ユーザーの苗字（ひらがな）';
COMMENT ON COLUMN public.profiles.first_name_kanji IS 'ユーザーの名前（漢字）';
COMMENT ON COLUMN public.profiles.first_name_hiragana IS 'ユーザーの名前（ひらがな）';
COMMENT ON COLUMN public.profiles.birthplace_prefecture IS '出身地の都道府県（e.g., 東京都, 大阪府）';
COMMENT ON COLUMN public.profiles.birthplace_municipality IS '出身地の市区町村（e.g., 渋谷区, 大阪市北区）';

-- ===== searching_children テーブルの更新 =====

ALTER TABLE public.searching_children
ADD COLUMN IF NOT EXISTS last_name_kanji TEXT,
ADD COLUMN IF NOT EXISTS last_name_hiragana TEXT,
ADD COLUMN IF NOT EXISTS first_name_kanji TEXT,
ADD COLUMN IF NOT EXISTS first_name_hiragana TEXT,
ADD COLUMN IF NOT EXISTS birthplace_prefecture TEXT,
ADD COLUMN IF NOT EXISTS birthplace_municipality TEXT;

-- コメント追加
COMMENT ON COLUMN public.searching_children.last_name_kanji IS '探している相手の苗字（漢字）';
COMMENT ON COLUMN public.searching_children.last_name_hiragana IS '探している相手の苗字（ひらがな）';
COMMENT ON COLUMN public.searching_children.first_name_kanji IS '探している相手の名前（漢字）';
COMMENT ON COLUMN public.searching_children.first_name_hiragana IS '探している相手の名前（ひらがな）';
COMMENT ON COLUMN public.searching_children.birthplace_prefecture IS '探している相手の出身地の都道府県';
COMMENT ON COLUMN public.searching_children.birthplace_municipality IS '探している相手の出身地の市区町村';

-- ===== インデックス追加 =====

CREATE INDEX IF NOT EXISTS idx_profiles_birthplace_prefecture 
  ON public.profiles(birthplace_prefecture);

CREATE INDEX IF NOT EXISTS idx_searching_children_birthplace_prefecture 
  ON public.searching_children(birthplace_prefecture);
