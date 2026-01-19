-- プロフィール画像用のストレージバケット作成

-- プロフィール画像用バケットを作成（存在しない場合のみ）
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-images',
  'profile-images',
  true, -- 公開バケット（URLで直接アクセス可能）
  524288, -- 512KB (512 * 1024 bytes)
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 524288,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- RLSポリシー：自分のプロフィール画像のみアップロード可能
DROP POLICY IF EXISTS "Users can upload their own profile images" ON storage.objects;
CREATE POLICY "Users can upload their own profile images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- RLSポリシー：自分のプロフィール画像のみ更新可能
DROP POLICY IF EXISTS "Users can update their own profile images" ON storage.objects;
CREATE POLICY "Users can update their own profile images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'profile-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- RLSポリシー：自分のプロフィール画像のみ削除可能
DROP POLICY IF EXISTS "Users can delete their own profile images" ON storage.objects;
CREATE POLICY "Users can delete their own profile images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'profile-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- RLSポリシー：すべてのユーザーが画像を閲覧可能（公開バケット）
DROP POLICY IF EXISTS "Anyone can view profile images" ON storage.objects;
CREATE POLICY "Anyone can view profile images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'profile-images');
