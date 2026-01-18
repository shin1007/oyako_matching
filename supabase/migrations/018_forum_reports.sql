-- 通報機能テーブル
CREATE TABLE public.forum_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reported_content_type TEXT NOT NULL CHECK (reported_content_type IN ('post', 'comment')),
  reported_content_id UUID NOT NULL,
  report_reason TEXT NOT NULL CHECK (report_reason IN ('spam', 'harassment', 'personal_info', 'inappropriate', 'other')),
  report_details TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  reviewed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX idx_forum_reports_reporter_id ON public.forum_reports(reporter_id);
CREATE INDEX idx_forum_reports_content ON public.forum_reports(reported_content_type, reported_content_id);
CREATE INDEX idx_forum_reports_status ON public.forum_reports(status);
CREATE INDEX idx_forum_reports_created_at ON public.forum_reports(created_at DESC);

-- RLSポリシー有効化
ALTER TABLE public.forum_reports ENABLE ROW LEVEL SECURITY;

-- 通報者は自分の通報のみ閲覧可能
CREATE POLICY "Users can view their own reports" ON public.forum_reports
  FOR SELECT USING (auth.uid() = reporter_id);

-- 認証済みユーザーは通報を作成可能
CREATE POLICY "Authenticated users can create reports" ON public.forum_reports
  FOR INSERT WITH CHECK (
    auth.uid() = reporter_id AND
    auth.uid() IS NOT NULL
  );

-- 注意: UPDATE操作には明示的なポリシーを設定していないため、
-- 一般ユーザーは通報のステータスを変更できません。
-- 将来的に管理者機能を実装する際は、管理者用のUPDATEポリシーを追加してください。

-- 重複通報防止用のユニーク制約
CREATE UNIQUE INDEX idx_unique_report_per_user_content 
  ON public.forum_reports(reporter_id, reported_content_type, reported_content_id)
  WHERE status IN ('pending', 'reviewed');

-- 通報数を確認する関数
CREATE OR REPLACE FUNCTION get_report_count(
  content_type TEXT,
  content_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  report_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO report_count
  FROM public.forum_reports
  WHERE reported_content_type = content_type
    AND reported_content_id = content_id
    AND status IN ('pending', 'reviewed');
  
  RETURN report_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ユーザーが既に通報済みかチェックする関数
CREATE OR REPLACE FUNCTION has_user_reported(
  user_id UUID,
  content_type TEXT,
  content_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  has_reported BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1
    FROM public.forum_reports
    WHERE reporter_id = user_id
      AND reported_content_type = content_type
      AND reported_content_id = content_id
      AND status IN ('pending', 'reviewed')
  ) INTO has_reported;
  
  RETURN has_reported;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
