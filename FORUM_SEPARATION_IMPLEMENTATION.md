# フォーラム親子分離機能の実装

## 概要

親のフォーラムと子のフォーラムを分離し、親は親の投稿のみ、子は子の投稿のみを見られるようにする機能を実装しました。

## ユーザーが手動で実行すべき操作

### 1. データベースマイグレーションの適用

以下のマイグレーションファイルをSupabaseのSQL Editorで実行してください：

**ファイル**: `supabase/migrations/028_add_user_type_to_forum_posts.sql`

このマイグレーションは以下を行います：
- `forum_posts`テーブルに`user_type`列を追加（'parent' または 'child'）
- 既存の投稿に対して、投稿者のロールに基づいて`user_type`を設定
- パフォーマンス向上のためのインデックス追加

**適用手順**:
1. Supabaseダッシュボード > SQL Editor にアクセス
2. `supabase/migrations/028_add_user_type_to_forum_posts.sql`の内容をコピー
3. SQL Editorに貼り付けて実行
4. 実行完了を確認

## 実装内容

### 1. データベース変更

#### 新規列の追加
- **テーブル**: `forum_posts`
- **列名**: `user_type`
- **型**: TEXT
- **制約**: NOT NULL, CHECK (user_type IN ('parent', 'child'))
- **デフォルト値**: 'parent'

#### インデックス
- `idx_forum_posts_user_type`: user_typeでの検索を高速化
- `idx_forum_posts_user_type_created_at`: user_typeと作成日時の複合検索を高速化

### 2. API変更

#### GET /api/forum/posts
**変更点**:
- `userType`クエリパラメータを追加
- `userType=parent`または`userType=child`で投稿をフィルタリング

**使用例**:
```
/api/forum/posts?userType=parent
/api/forum/posts?userType=child&category_id=xxx
```

#### POST /api/forum/posts
**変更点**:
- 親と子の両方が投稿を作成可能に変更
- 投稿作成時に自動的にユーザーのロールに基づいて`user_type`を設定
- 投稿者のロール検証を追加

**動作**:
- 親ユーザーが投稿 → `user_type='parent'`が自動設定
- 子ユーザーが投稿 → `user_type='child'`が自動設定

#### POST /api/forum/comments
**変更点**:
- 親と子の両方がコメント可能に変更
- コメント投稿時に投稿の`user_type`を確認
- 同じ`user_type`のユーザーのみコメント可能

**動作**:
- 親は親の投稿にのみコメント可能
- 子は子の投稿にのみコメント可能
- 異なるタイプの投稿へのコメントは403エラー

### 3. フロントエンド変更

#### /forum/parent/page.tsx
- 既存の実装を維持（親ユーザー専用フォーラム）
- `userType=parent`パラメータでAPIを呼び出し

#### /forum/child/page.tsx
- 既存の実装を維持（子ユーザー専用フォーラム）
- `userType=child`パラメータでAPIを呼び出し

#### /forum/new/page.tsx
**変更点**:
- 親と子の両方が投稿作成可能
- ユーザーロールに応じた動的スタイリング
  - 親: parent-* カラースキーム
  - 子: child-* カラースキーム
- 投稿作成後、適切なフォーラムにリダイレクト
  - 親 → `/forum/parent`
  - 子 → `/forum/child`

#### /forum/[id]/page.tsx
**変更点**:
- 投稿のインターフェースに`user_type`フィールドを追加
- 投稿読み込み時にユーザーのロールと投稿の`user_type`を検証
- 不一致の場合はエラーメッセージを表示し、適切なフォーラムにリダイレクト

## セキュリティ考慮事項

### アクセス制御
1. **API レベル**:
   - 投稿取得時に`user_type`でフィルタリング
   - コメント作成時に投稿の`user_type`を検証

2. **フロントエンド レベル**:
   - 投稿詳細ページでユーザーロールと投稿タイプの一致を確認
   - 不一致の場合は自動リダイレクト

3. **データベース レベル**:
   - `user_type`列にCHECK制約を追加
   - 既存のRLSポリシーが引き続き有効

### データ整合性
- 既存の投稿は投稿者のロールに基づいて`user_type`が設定される
- 新規投稿は自動的に投稿者のロールから`user_type`が決定される

## テスト計画

### 1. 親ユーザーのテスト
- [ ] `/forum/parent`で親の投稿のみが表示されることを確認
- [ ] 子の投稿が表示されないことを確認
- [ ] 親の投稿に対してコメントができることを確認
- [ ] 子の投稿にはアクセスできないことを確認（直接URL入力）

### 2. 子ユーザーのテスト
- [ ] `/forum/child`で子の投稿のみが表示されることを確認
- [ ] 親の投稿が表示されないことを確認
- [ ] 子の投稿に対してコメントができることを確認
- [ ] 親の投稿にはアクセスできないことを確認（直接URL入力）

### 3. 投稿作成のテスト
- [ ] 親が投稿を作成すると`user_type='parent'`で保存される
- [ ] 子が投稿を作成すると`user_type='child'`で保存される
- [ ] 投稿作成後、適切なフォーラムにリダイレクトされる

### 4. コメント作成のテスト
- [ ] 親は親の投稿にのみコメント可能
- [ ] 子は子の投稿にのみコメント可能
- [ ] 異なるタイプの投稿へのコメントは拒否される（403エラー）

## 影響を受けるファイル

### 新規作成
- `supabase/migrations/028_add_user_type_to_forum_posts.sql`

### 変更
- `app/api/forum/posts/route.ts`
- `app/api/forum/comments/route.ts`
- `app/forum/new/page.tsx`
- `app/forum/[id]/page.tsx`

### 影響なし
- `app/forum/parent/page.tsx` (既存の実装を維持)
- `app/forum/child/page.tsx` (既存の実装を維持)
- `app/forum/page.tsx` (既存の実装を維持)

## 後方互換性

- 既存の投稿は自動的に投稿者のロールに基づいて`user_type`が設定される
- APIは`userType`パラメータがない場合でも動作する（すべての投稿を返す）
- フロントエンドは`/forum/parent`と`/forum/child`を使用するため、自動的にフィルタリングされる

## 今後の拡張案

1. **カテゴリの分離**:
   - 親用カテゴリと子用カテゴリを分ける
   - `forum_categories`テーブルに`user_type`列を追加

2. **通知の改善**:
   - 同じタイプのユーザーの投稿・コメントのみを通知

3. **検索機能**:
   - ユーザータイプに応じた検索結果のフィルタリング

4. **統計・分析**:
   - 親フォーラムと子フォーラムの活動統計を個別に表示
