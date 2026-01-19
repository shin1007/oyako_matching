-- フォーラム投稿に user_type 列を追加して親と子のフォーラムを分離する

-- forum_posts テーブルに user_type 列を追加
ALTER TABLE public.forum_posts 
ADD COLUMN IF NOT EXISTS user_type TEXT NOT NULL DEFAULT 'parent' 
CHECK (user_type IN ('parent', 'child'));

-- 既存の投稿に対して、author_id から user_type を設定
UPDATE public.forum_posts 
SET user_type = (
  SELECT role 
  FROM public.users 
  WHERE users.id = forum_posts.author_id
)
WHERE user_type = 'parent';

-- インデックスを追加してパフォーマンスを向上
CREATE INDEX IF NOT EXISTS idx_forum_posts_user_type ON public.forum_posts(user_type);

-- 複合インデックスも追加
CREATE INDEX IF NOT EXISTS idx_forum_posts_user_type_created_at ON public.forum_posts(user_type, created_at DESC);
