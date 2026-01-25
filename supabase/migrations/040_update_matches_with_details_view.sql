-- matches_with_detailsビューにrequester_idを追加
DROP VIEW IF EXISTS public.matches_with_details;
CREATE VIEW public.matches_with_details AS
SELECT
  m.id,
  m.parent_id,
  m.child_id,
  m.similarity_score,
  m.status,
  m.created_at,
  m.updated_at,
  m.blocked_by,
  m.requester_id,
  -- 親情報
  p1.role AS parent_role,
  p1.last_name_kanji AS parent_last_name_kanji,
  p1.first_name_kanji AS parent_first_name_kanji,
  p1.last_name_hiragana AS parent_last_name_hiragana,
  p1.first_name_hiragana AS parent_first_name_hiragana,
  p1.birth_date AS parent_birth_date,
  p1.profile_image_url AS parent_profile_image_url,
  -- 子情報
  p2.role AS child_role,
  p2.last_name_kanji AS child_last_name_kanji,
  p2.first_name_kanji AS child_first_name_kanji,
  p2.last_name_hiragana AS child_last_name_hiragana,
  p2.first_name_hiragana AS child_first_name_hiragana,
  p2.birth_date AS child_birth_date,
  p2.profile_image_url AS child_profile_image_url
FROM public.matches m
LEFT JOIN public.profiles p1 ON m.parent_id = p1.user_id
LEFT JOIN public.profiles p2 ON m.child_id = p2.user_id;
