# 子ども・親の写真登録機能

## 概要

このドキュメントでは、探している子ども・親の写真を登録する機能について説明します。この機能により、ユーザーは探している相手の写真を最大5枚まで登録でき、撮影日時と年齢情報を記録することができます。

将来的には、これらの情報を利用してCloudflare Pagesの機能で現在の姿を推定する機能を追加する予定です。

## 実装内容

### データベーススキーマ

#### `searching_children_photos` テーブル

探している子ども・親の写真情報を保存するテーブルです。

| カラム名 | 型 | 説明 |
|---------|-----|------|
| id | UUID | 主キー |
| searching_child_id | UUID | 関連する searching_children のID（外部キー） |
| user_id | UUID | 写真をアップロードしたユーザーのID（外部キー） |
| photo_url | TEXT | 写真のURL（Supabase Storage） |
| captured_at | DATE | 写真の撮影日 |
| age_at_capture | INTEGER | 撮影時の年齢 |
| description | TEXT | 写真の説明やメモ |
| display_order | INTEGER | 表示順序（0-4） |
| created_at | TIMESTAMPTZ | 作成日時 |
| updated_at | TIMESTAMPTZ | 更新日時 |

**制約:**
- 1つの `searching_child` につき最大5枚の写真を登録可能
- トリガーで枚数制限を実装

#### Supabase Storage

**バケット名:** `searching-children-photos`

**設定:**
- 公開バケット（画像URLで直接アクセス可能）
- RLSポリシーでアップロード・更新・削除を制御
- 最大ファイルサイズ: 5MB
- 許可される画像形式: JPEG, PNG, WebP

### Row Level Security (RLS)

すべてのテーブルとストレージに対して、以下のポリシーが適用されています：

- **SELECT**: ユーザーは自分の写真のみ閲覧可能
- **INSERT**: ユーザーは自分の写真のみ挿入可能
- **UPDATE**: ユーザーは自分の写真のみ更新可能
- **DELETE**: ユーザーは自分の写真のみ削除可能

### フロントエンド実装

#### コンポーネント

**`SearchingChildPhotoUpload.tsx`**

探している子ども・親の写真をアップロード・管理するコンポーネントです。

**主な機能:**
- 複数枚の写真を一度にアップロード可能（最大5枚まで）
- 画像の自動圧縮（最大5MB）
- 撮影日と年齢の入力
- 写真の説明・メモの追加
- 写真の削除機能

**Props:**
```typescript
interface SearchingChildPhotoUploadProps {
  searchingChildId: string | undefined;  // searching_child のID（保存後に利用）
  userId: string;                         // ユーザーID
  photos: Photo[];                        // 現在の写真リスト
  onPhotosUpdate: (photos: Photo[]) => void;  // 写真更新時のコールバック
  onError?: (message: string) => void;    // エラー時のコールバック
  userRole?: 'parent' | 'child';          // ユーザーの役割（UIの色分けに使用）
}
```

#### プロフィールページ統合

`/dashboard/profile` ページに写真登録セクションが追加されています。

**表示位置:**
- 各探している子ども・親の情報カードの最下部
- 出身地情報の直後

**操作フロー:**
1. プロフィールページを開く
2. 探している子ども・親の情報セクションまでスクロール
3. 「+ 写真を追加」ボタンをクリック
4. 画像ファイルを選択（複数選択可能）
5. 自動的にアップロードと圧縮が実行される
6. 撮影日と年齢を入力（任意）
7. 説明やメモを追加（任意）
8. 「プロフィールを保存」ボタンをクリックして保存

## 使い方

### 写真の登録

1. ダッシュボードから「プロフィール」ページへ移動
2. 探している子ども・親の情報セクションまでスクロール
3. 写真セクションで「+ 写真を追加」ボタンをクリック
4. JPEG、PNG、またはWebP形式の画像を選択（最大5MB、複数選択可能）
5. アップロード後、以下の情報を入力:
   - **撮影日**: 写真を撮影した日付（任意）
   - **撮影時の年齢**: その時の年齢（任意）
   - **メモ・説明**: 写真に関する説明（例: 「保育園の運動会」）（任意）
6. 「プロフィールを保存」ボタンをクリックして保存

### 写真の削除

各写真カードの右上にある「削除」ボタンをクリックすると、その写真を削除できます。

### 注意事項

- 1つの子ども・親につき最大5枚まで写真を登録できます
- 画像は自動的に圧縮されます（最大5MB）
- 対応フォーマット: JPEG、PNG、WebP
- 撮影日と年齢の情報は、将来的にAI機能で現在の姿を推定する際に使用される予定です

## マイグレーション

### 実行方法

1. Supabase CLIを使用する場合:
```bash
supabase migration up
```

2. Supabase Dashboardを使用する場合:
   - SQL Editorを開く
   - `supabase/migrations/022_searching_children_photos.sql` の内容を貼り付け
   - 実行する

### ロールバック

もし問題が発生した場合は、以下のSQLでロールバックできます:

```sql
-- テーブルの削除
DROP TABLE IF EXISTS public.searching_children_photos CASCADE;

-- ストレージバケットの削除
DELETE FROM storage.buckets WHERE id = 'searching-children-photos';

-- 関数とトリガーの削除
DROP FUNCTION IF EXISTS check_searching_children_photos_limit() CASCADE;
DROP FUNCTION IF EXISTS update_searching_children_photos_updated_at() CASCADE;
```

## 今後の拡張予定

### Cloudflare Pages AI機能

将来的に以下の機能を実装予定です:

1. **年齢進行推定**
   - 撮影時の年齢と撮影日から現在の年齢を計算
   - AIを使用して年齢に応じた姿を推定

2. **写真生成**
   - 登録された複数の写真から特徴を抽出
   - 現在の年齢での姿を推定した画像を生成

3. **精度向上**
   - より多くの写真を登録することで精度が向上
   - 撮影日時と年齢情報が重要な役割を果たす

## セキュリティ

- すべての写真は公開バケットに保存されますが、RLSポリシーで保護されています
- アップロード・更新・削除は認証済みユーザーが自分の写真のみ可能
- 閲覧は誰でも可能（URLを知っている場合）
- 写真のアップロード時に自動的に圧縮され、サイズが制限される
- 不正なファイル形式は拒否される

## トラブルシューティング

### 写真がアップロードできない

**原因:**
- ファイルサイズが大きすぎる（5MB以上）
- 対応していない画像形式
- ネットワークエラー

**解決方法:**
1. 画像のファイルサイズを確認する（5MB以下に圧縮してください）
2. JPEG、PNG、WebP形式であることを確認する
3. インターネット接続を確認する
4. ブラウザのコンソールでエラーメッセージを確認する

### 保存した写真が表示されない

**原因:**
- プロフィールの保存に失敗した
- データベース接続エラー

**解決方法:**
1. ページをリロードする
2. 「プロフィールを保存」ボタンを再度クリックする
3. エラーメッセージを確認する

### データベースエラー

**エラーメッセージ:** `Could not find the table 'public.searching_children_photos'`

**解決方法:**
マイグレーションが実行されていない可能性があります。以下のコマンドでマイグレーションを実行してください:

```bash
supabase migration up
```

## 関連ファイル

- **マイグレーション**: `supabase/migrations/022_searching_children_photos.sql`
- **コンポーネント**: `app/components/SearchingChildPhotoUpload.tsx`
- **プロフィールページ**: `app/dashboard/profile/page.tsx`

## まとめ

この機能により、ユーザーは探している子ども・親の写真を登録し、撮影日時と年齢情報を記録できるようになりました。これらの情報は、将来的にAI技術を使用して現在の姿を推定する機能の基盤となります。
