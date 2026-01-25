-- matchesテーブルにブロック前の状態を保持するカラムを追加
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS previous_status TEXT;
