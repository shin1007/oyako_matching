-- レート制限テーブル
-- スパム防止のため、投稿とコメントの頻度を制限

CREATE TABLE public.rate_limits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('post', 'comment')),
  post_id UUID REFERENCES public.forum_posts(id) ON DELETE CASCADE, -- コメントの場合のみ使用
  action_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- パフォーマンス向上のためのインデックス
CREATE INDEX idx_rate_limits_user_action ON public.rate_limits(user_id, action_type);
CREATE INDEX idx_rate_limits_timestamp ON public.rate_limits(action_timestamp DESC);
CREATE INDEX idx_rate_limits_user_post ON public.rate_limits(user_id, post_id) WHERE post_id IS NOT NULL;

-- 古いレコードを自動削除する関数（1日以上前のレコード）
CREATE OR REPLACE FUNCTION clean_old_rate_limits()
RETURNS void AS $$
BEGIN
  DELETE FROM public.rate_limits
  WHERE action_timestamp < NOW() - INTERVAL '1 day';
END;
$$ LANGUAGE plpgsql;

-- 定期的なクリーンアップ用のコメント（実際の実行は別途設定が必要）
-- このクエリを定期実行することを推奨: SELECT clean_old_rate_limits();

COMMENT ON TABLE public.rate_limits IS 'レート制限のためのアクションログ。投稿とコメントの頻度制限に使用。';
COMMENT ON COLUMN public.rate_limits.action_type IS 'アクションの種類: post（投稿）, comment（コメント）';
COMMENT ON COLUMN public.rate_limits.post_id IS 'コメントの場合、対象の投稿ID。同一投稿への連続コメント防止に使用。';
