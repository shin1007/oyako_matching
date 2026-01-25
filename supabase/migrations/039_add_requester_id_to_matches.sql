-- matchesテーブルに申請者ID（requester_id）を追加
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS requester_id UUID;
-- 既存レコードにはNULLが入るが、今後の申請時にセットされる
