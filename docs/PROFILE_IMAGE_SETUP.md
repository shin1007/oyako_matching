# プロフィール画像機能のセットアップ手順

## ⚠️ 重要：最初に実行すること

この機能を使用する前に、以下の手動セットアップが必要です：

### 1. Supabase Storageバケットの作成とRLSポリシーの設定

`supabase/migrations/021_profile_images_storage.sql`ファイルの内容を、SupabaseのSQL Editorで実行してください。

または、Supabaseの管理画面から手動で設定することもできます（詳細は下記参照）。

---

## 概要

プロフィール画像のアップロード機能が追加されました。ユーザーは自分のプロフィール画像を設定でき、画像は自動的に以下のように処理されます：

- **正方形に切り取り**: ユーザーが任意の領域を選択可能
- **自動リサイズ**: 最大500x500pxに縮小
- **自動圧縮**: 最大500KBに圧縮（JPEG形式）
- **対応フォーマット**: JPEG、PNG、WebP

## 詳細なセットアップ手順

### 1. Supabase Storageバケットの作成

以下のSQL文をSupabaseのSQL Editorで実行してください：

```sql
-- マイグレーションファイル: supabase/migrations/021_profile_images_storage.sql
-- このファイルの内容をSupabaseで実行してください
```

または、Supabaseの管理画面で以下の手順を実行してください：

1. Supabaseダッシュボードにログイン
2. 左メニューから「Storage」を選択
3. 「Create a new bucket」をクリック
4. 以下の設定でバケットを作成：
   - **Bucket name**: `profile-images`
   - **Public bucket**: チェックを入れる（公開バケット）
   - **File size limit**: 512KB (524288 bytes)
   - **Allowed MIME types**: `image/jpeg`, `image/png`, `image/webp`

### 2. RLSポリシーの設定

Storageバケット作成後、以下のRLSポリシーを設定してください：

#### アップロードポリシー（INSERT）
```sql
CREATE POLICY "Users can upload their own profile images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

#### 更新ポリシー（UPDATE）
```sql
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
```

#### 削除ポリシー（DELETE）
```sql
CREATE POLICY "Users can delete their own profile images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'profile-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

#### 閲覧ポリシー（SELECT）
```sql
CREATE POLICY "Anyone can view profile images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'profile-images');
```

### 3. 動作確認

1. アプリケーションを起動: `npm run dev`
2. ログインして「プロフィール編集」ページに移動
3. 「画像をアップロード」ボタンをクリック
4. 画像を選択し、クロップ領域を調整
5. 「切り取りを確定」をクリック
6. プロフィールを保存
7. ダッシュボードで画像が表示されることを確認

## トラフィック最適化

画像は以下の方法でトラフィックを最適化しています：

1. **クライアント側でリサイズ**: サーバーに送信前に500x500pxにリサイズ
2. **高品質圧縮**: 最大500KBに圧縮しながら画質を維持（JPEG品質95%）
3. **キャッシュ制御**: 1時間のキャッシュを設定（`cacheControl: '3600'`）
4. **適切なファイルサイズ制限**: アップロード前は5MB、圧縮後は500KB以下

## セキュリティ

- **ファイルサイズ制限**: クライアント側で5MB、サーバー側で512KBに制限
- **ファイル形式制限**: JPEG、PNG、WebPのみ許可
- **RLSポリシー**: 各ユーザーは自分の画像のみアップロード・更新・削除可能
- **公開アクセス**: 画像は公開URLでアクセス可能（認証不要）
- **CodeQL脆弱性スキャン**: 実施済み（脆弱性なし）

## トラブルシューティング

### 画像がアップロードできない

1. Storageバケットが作成されているか確認
2. RLSポリシーが正しく設定されているか確認
3. ブラウザのコンソールでエラーメッセージを確認

### 画像が表示されない

1. `profile_image_url`が正しくデータベースに保存されているか確認
2. Storageバケットが公開設定になっているか確認
3. URLが正しい形式か確認（`https://xxx.supabase.co/storage/v1/object/public/profile-images/...`）

## 技術詳細

### 使用ライブラリ

- **react-image-crop**: 画像のクロップUI
- **browser-image-compression**: ブラウザ内での画像圧縮・リサイズ

### ファイル構成

- `app/components/ImageUpload.tsx`: 画像アップロードコンポーネント
- `app/dashboard/profile/page.tsx`: プロフィール編集ページ（画像アップロード統合）
- `app/dashboard/page.tsx`: ダッシュボード（画像表示）
- `supabase/migrations/021_profile_images_storage.sql`: Storageバケット作成SQL
