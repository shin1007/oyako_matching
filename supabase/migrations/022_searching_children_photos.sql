-- Migration: 探している子ども・親の写真登録機能
-- Created: 2026-01-19
-- Description: 探している子ども・親の写真を保存するテーブルとストレージを作成します。
-- 撮影日時と年齢情報も保存し、将来的にCloudflare Pagesの機能を利用して
-- 現在の写真を生成できるようにします。

-- ===== searching_children_photos テーブルの作成 =====

CREATE TABLE IF NOT EXISTS public.searching_children_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  searching_child_id UUID NOT NULL REFERENCES public.searching_children(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  captured_at DATE,
  age_at_capture INTEGER,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- コメント追加
COMMENT ON TABLE public.searching_children_photos IS '探している子ども・親の写真情報を保存するテーブル';
COMMENT ON COLUMN public.searching_children_photos.searching_child_id IS '写真が関連付けられている searching_children のID';
COMMENT ON COLUMN public.searching_children_photos.user_id IS '写真をアップロードしたユーザーのID';
COMMENT ON COLUMN public.searching_children_photos.photo_url IS '写真のURL（Supabase Storage）';
COMMENT ON COLUMN public.searching_children_photos.captured_at IS '写真の撮影日時';
COMMENT ON COLUMN public.searching_children_photos.age_at_capture IS '撮影時の年齢';
COMMENT ON COLUMN public.searching_children_photos.description IS '写真の説明やメモ';
COMMENT ON COLUMN public.searching_children_photos.display_order IS '表示順序（0-4）';

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_searching_children_photos_searching_child_id 
  ON public.searching_children_photos(searching_child_id);
CREATE INDEX IF NOT EXISTS idx_searching_children_photos_user_id 
  ON public.searching_children_photos(user_id);

-- updated_at トリガー
CREATE OR REPLACE FUNCTION update_searching_children_photos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS searching_children_photos_updated_at ON public.searching_children_photos;
CREATE TRIGGER searching_children_photos_updated_at
BEFORE UPDATE ON public.searching_children_photos
FOR EACH ROW
EXECUTE FUNCTION update_searching_children_photos_updated_at();

-- 写真枚数制限（1つの searching_child につき最大5枚）
CREATE OR REPLACE FUNCTION check_searching_children_photos_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.searching_children_photos WHERE searching_child_id = NEW.searching_child_id) >= 5 THEN
    RAISE EXCEPTION 'Cannot add more than 5 photos per searching child';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS enforce_searching_children_photos_limit ON public.searching_children_photos;
CREATE TRIGGER enforce_searching_children_photos_limit
BEFORE INSERT ON public.searching_children_photos
FOR EACH ROW
EXECUTE FUNCTION check_searching_children_photos_limit();

-- ===== Supabase Storage バケット作成 =====

-- 探している子ども・親の写真用バケットを作成
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'searching-children-photos',
  'searching-children-photos',
  false, -- 非公開バケット（認証が必要）
  5242880, -- 5MB (5 * 1024 * 1024 bytes)
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- ===== RLSポリシー設定 =====

-- テーブルのRLS有効化
ALTER TABLE public.searching_children_photos ENABLE ROW LEVEL SECURITY;

-- ポリシー: 自分の写真のみ閲覧可能
CREATE POLICY "Users can view their own searching children photos"
ON public.searching_children_photos FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- ポリシー: 自分の写真のみ挿入可能
CREATE POLICY "Users can insert their own searching children photos"
ON public.searching_children_photos FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- ポリシー: 自分の写真のみ更新可能
CREATE POLICY "Users can update their own searching children photos"
ON public.searching_children_photos FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- ポリシー: 自分の写真のみ削除可能
CREATE POLICY "Users can delete their own searching children photos"
ON public.searching_children_photos FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- ===== Storage RLSポリシー =====

-- ポリシー: 自分の写真のみアップロード可能
CREATE POLICY "Users can upload their own searching children photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'searching-children-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- ポリシー: 自分の写真のみ更新可能
CREATE POLICY "Users can update their own searching children photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'searching-children-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'searching-children-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- ポリシー: 自分の写真のみ削除可能
CREATE POLICY "Users can delete their own searching children photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'searching-children-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- ポリシー: 自分の写真のみ閲覧可能
CREATE POLICY "Users can view their own searching children photos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'searching-children-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
