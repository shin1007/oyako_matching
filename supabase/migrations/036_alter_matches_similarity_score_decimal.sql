-- 1. ビューを一時削除
DROP VIEW IF EXISTS matches_with_details;

-- 2. カラム型を変更
ALTER TABLE public.matches
  ALTER COLUMN similarity_score TYPE DECIMAL(6,2);

-- 3. ビューを再作成
CREATE VIEW matches_with_details AS
SELECT 
  m.id,
  m.parent_id,
  m.child_id,
  m.similarity_score,
  m.status,
  m.created_at,
  m.updated_at,
  -- 親ユーザー情報
  u_parent.role as parent_role,
  p_parent.last_name_kanji as parent_last_name_kanji,
  p_parent.first_name_kanji as parent_first_name_kanji,
  p_parent.profile_image_url as parent_profile_image_url,
  -- 子ユーザー情報
  u_child.role as child_role,
  p_child.last_name_kanji as child_last_name_kanji,
  p_child.first_name_kanji as child_first_name_kanji,
  p_child.profile_image_url as child_profile_image_url
FROM public.matches m
LEFT JOIN public.users u_parent ON m.parent_id = u_parent.id
LEFT JOIN public.profiles p_parent ON m.parent_id = p_parent.user_id
LEFT JOIN public.users u_child ON m.child_id = u_child.id
LEFT JOIN public.profiles p_child ON m.child_id = p_child.user_id;
