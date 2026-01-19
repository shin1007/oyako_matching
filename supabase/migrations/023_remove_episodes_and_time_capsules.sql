-- 不要な機能の削除: エピソードとタイムカプセル
-- このマイグレーションは episodes と time_capsules テーブルを削除します

-- Drop find_potential_matches function (depends on episodes table)
DROP FUNCTION IF EXISTS public.find_potential_matches(target_user_id UUID, target_role TEXT, min_similarity DECIMAL);

-- Drop episodes table and related objects
DROP INDEX IF EXISTS public.idx_episodes_embedding;
DROP INDEX IF EXISTS public.idx_episodes_moderation;
DROP INDEX IF EXISTS public.idx_episodes_user_id;
DROP TRIGGER IF EXISTS update_episodes_updated_at ON public.episodes;
DROP TABLE IF EXISTS public.episodes CASCADE;

-- Drop time_capsules table and related objects
DROP INDEX IF EXISTS public.idx_time_capsules_parent_id;
DROP TABLE IF EXISTS public.time_capsules CASCADE;
