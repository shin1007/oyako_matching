-- Migration: 探している子ども・親の写真登録機能
-- Created: 2026-01-19
-- Description: 探している子ども・親の写真を保存するテーブルとストレージを作成します。
-- 撮影日時と年齢情報も保存し、将来的にCloudflare Pagesの機能を利用して
-- 現在の写真を生成できるようにします。

-- ===== target_people_photos テーブルの作成 =====

CREATE TABLE IF NOT EXISTS public.target_people_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  searching_child_id UUID NOT NULL REFERENCES public.target_people(id) ON DELETE CASCADE,
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
COMMENT ON TABLE public.target_people_photos IS '探している子ども・親の写真情報を保存するテーブル';
COMMENT ON COLUMN public.target_people_photos.searching_child_id IS '写真が関連付けられている target_people のID';
COMMENT ON COLUMN public.target_people_photos.user_id IS '写真をアップロードしたユーザーのID';
COMMENT ON COLUMN public.target_people_photos.photo_url IS '写真のURL（Supabase Storage）';
COMMENT ON COLUMN public.target_people_photos.captured_at IS '写真の撮影日時';
COMMENT ON COLUMN public.target_people_photos.age_at_capture IS '撮影時の年齢';
COMMENT ON COLUMN public.target_people_photos.description IS '写真の説明やメモ';
COMMENT ON COLUMN public.target_people_photos.display_order IS '表示順序（0-4）';

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_target_people_photos_searching_child_id 
  ON public.target_people_photos(searching_child_id);
CREATE INDEX IF NOT EXISTS idx_target_people_photos_user_id 
  ON public.target_people_photos(user_id);

-- updated_at トリガー
CREATE OR REPLACE FUNCTION update_target_people_photos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS target_people_photos_updated_at ON public.target_people_photos;
CREATE TRIGGER target_people_photos_updated_at
BEFORE UPDATE ON public.target_people_photos
FOR EACH ROW
EXECUTE FUNCTION update_target_people_photos_updated_at();

-- 写真枚数制限（1つの searching_child につき最大5枚）
CREATE OR REPLACE FUNCTION check_target_people_photos_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.target_people_photos WHERE searching_child_id = NEW.searching_child_id) >= 5 THEN
    RAISE EXCEPTION 'Cannot add more than 5 photos per searching child';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS enforce_target_people_photos_limit ON public.target_people_photos;
CREATE TRIGGER enforce_target_people_photos_limit
BEFORE INSERT ON public.target_people_photos
FOR EACH ROW
EXECUTE FUNCTION check_target_people_photos_limit();

-- ===== Supabase Storage バケット作成 =====

-- 探している子ども・親の写真用バケットを作成
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'searching-children-photos',
  'searching-children-photos',
  true, -- 公開バケット（URLで直接アクセス可能、RLSで制御）
  5242880, -- 5MB (5 * 1024 * 1024 bytes)
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];


-- ===== RLSポリシー設定 =====

-- テーブルのRLS有効化
ALTER TABLE public.target_people_photos ENABLE ROW LEVEL SECURITY;

-- ポリシー: 認証済みユーザーは全ての写真を閲覧可能（マッチング機能で必要）
DROP POLICY IF EXISTS "Users can view their own searching children photos" ON public.target_people_photos;
DROP POLICY IF EXISTS "Authenticated users can view all searching children photos" ON public.target_people_photos;
CREATE POLICY "Authenticated users can view all searching children photos"
ON public.target_people_photos FOR SELECT
TO authenticated
USING (true);

-- ポリシー: 自分の写真のみ挿入可能
DROP POLICY IF EXISTS "Users can insert their own searching children photos" ON public.target_people_photos;
CREATE POLICY "Users can insert their own searching children photos"
ON public.target_people_photos FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- ポリシー: 自分の写真のみ更新可能
DROP POLICY IF EXISTS "Users can update their own searching children photos" ON public.target_people_photos;
CREATE POLICY "Users can update their own searching children photos"
ON public.target_people_photos FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- ポリシー: 自分の写真のみ削除可能
DROP POLICY IF EXISTS "Users can delete their own searching children photos" ON public.target_people_photos;
CREATE POLICY "Users can delete their own searching children photos"
ON public.target_people_photos FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- ===== Storage RLSポリシー =====

-- ポリシー: 自分の写真のみアップロード可能
DROP POLICY IF EXISTS "Users can upload their own searching children photos" ON storage.objects;
CREATE POLICY "Users can upload their own searching children photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'searching-children-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- ポリシー: 自分の写真のみ更新可能
DROP POLICY IF EXISTS "Users can update their own searching children photos" ON storage.objects;
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
DROP POLICY IF EXISTS "Users can delete their own searching children photos" ON storage.objects;
CREATE POLICY "Users can delete their own searching children photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'searching-children-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- ポリシー: すべてのユーザーが写真を閲覧可能（公開バケット・マッチング機能で必要）
DROP POLICY IF EXISTS "Anyone can view searching children photos" ON storage.objects;
CREATE POLICY "Anyone can view searching children photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'searching-children-photos');
