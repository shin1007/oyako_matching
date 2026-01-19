-- マッチ一覧の詳細情報を効率的に取得するためのビューとヘルパー関数
-- N+1問題を解決し、パフォーマンスを向上させる

-- 未読メッセージ数を集計するヘルパー関数
CREATE OR REPLACE FUNCTION get_unread_message_count(
  p_match_id UUID,
  p_user_id UUID
)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM public.messages
    WHERE match_id = p_match_id
      AND sender_id != p_user_id
      AND read_at IS NULL
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- 最終メッセージを取得するヘルパー関数
CREATE OR REPLACE FUNCTION get_last_message(
  p_match_id UUID
)
RETURNS TABLE (
  content TEXT,
  created_at TIMESTAMPTZ,
  sender_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT m.content, m.created_at, m.sender_id
  FROM public.messages m
  WHERE m.match_id = p_match_id
  ORDER BY m.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;

-- マッチ詳細ビュー: JOINを使用して関連データを効率的に取得
-- このビューは admin クライアントからのみアクセス可能（RLSなし）
CREATE OR REPLACE VIEW matches_with_details AS
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

-- ビューにコメントを追加
COMMENT ON VIEW matches_with_details IS 'マッチ情報とユーザー・プロフィール情報を結合したビュー（N+1問題解決用）';

-- インデックスの確認（既存のインデックスがあるはずだが、念のため）
CREATE INDEX IF NOT EXISTS idx_messages_match_sender_read ON public.messages(match_id, sender_id, read_at);
CREATE INDEX IF NOT EXISTS idx_messages_match_created ON public.messages(match_id, created_at DESC);

-- パフォーマンス向上のため、matches テーブルにも created_at の降順インデックスを追加
CREATE INDEX IF NOT EXISTS idx_matches_created_desc ON public.matches(created_at DESC);
