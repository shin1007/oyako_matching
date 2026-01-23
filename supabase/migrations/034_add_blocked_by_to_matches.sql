-- matchesテーブルにblocked_byカラムを追加
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS blocked_by UUID;

-- 既存のblockedレコードにはNULLが入る（必要に応じて後でUPDATE可能）
