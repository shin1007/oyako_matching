# 写真登録機能のセットアップ手順

この機能を使用する前に、以下の手順を実行してください。

## 前提条件

- Supabaseプロジェクトが設定されていること
- Supabase CLIがインストールされているか、Supabase Dashboardにアクセスできること

## セットアップ手順

### 方法1: Supabase CLI を使用（推奨）

1. プロジェクトのルートディレクトリに移動:
```bash
cd /path/to/oyako_matching
```

2. Supabaseにログイン:
```bash
supabase login
```

3. プロジェクトをリンク:
```bash
supabase link --project-ref your-project-ref
```

4. マイグレーションを実行:
```bash
supabase db push
```

### 方法2: Supabase Dashboard を使用

1. [Supabase Dashboard](https://app.supabase.com) にログイン

2. プロジェクトを選択

3. 左サイドバーから「SQL Editor」を選択

4. 「New Query」をクリック

5. 以下のファイルの内容をコピー&ペースト:
   - `supabase/migrations/022_target_people_photos.sql`

6. 「Run」ボタンをクリックして実行

7. 成功メッセージが表示されることを確認

## 動作確認

マイグレーションが正常に実行されたことを確認するには:

1. Supabase Dashboard の「Table Editor」を開く

2. 以下のテーブルが存在することを確認:
   - `target_people_photos`

3. 「Storage」セクションを開く

4. 以下のバケットが存在することを確認:
   - `searching-children-photos`

## トラブルシューティング

### エラー: "relation already exists"

このエラーは、テーブルが既に存在する場合に発生します。これは問題ありません。マイグレーションは既に実行されています。

### エラー: "bucket already exists"

このエラーは、ストレージバケットが既に存在する場合に発生します。これは問題ありません。マイグレーションは既に実行されています。

### RLSポリシーのエラー

もしRLSポリシーに関するエラーが発生した場合は、以下のSQLを実行して既存のポリシーを削除してから、マイグレーションを再実行してください:

```sql
-- テーブルのポリシーを削除
DROP POLICY IF EXISTS "Users can view their own searching children photos" ON public.target_people_photos;
DROP POLICY IF EXISTS "Users can insert their own searching children photos" ON public.target_people_photos;
DROP POLICY IF EXISTS "Users can update their own searching children photos" ON public.target_people_photos;
DROP POLICY IF EXISTS "Users can delete their own searching children photos" ON public.target_people_photos;

-- ストレージのポリシーを削除
DROP POLICY IF EXISTS "Users can upload their own searching children photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own searching children photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own searching children photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own searching children photos" ON storage.objects;
```

## 機能の使用方法

セットアップが完了したら、以下の手順で写真登録機能を使用できます:

1. アプリケーションにログイン

2. ダッシュボードから「プロフィール」ページへ移動

3. 探している子ども・親の情報セクションまでスクロール

4. 写真セクションで「+ 写真を追加」ボタンをクリック

5. 画像を選択してアップロード

6. 撮影日と年齢情報を入力（任意）

7. 「プロフィールを保存」ボタンをクリック

詳細な使用方法については、[写真登録機能のドキュメント](./PHOTO_REGISTRATION_FEATURE.md)を参照してください。

## サポート

問題が発生した場合は、以下の情報を含めてお問い合わせください:

- 発生したエラーメッセージ
- 実行した手順
- ブラウザのコンソールログ（開発者ツールで確認可能）
- Supabase Dashboard の Logs セクションのエラーログ
