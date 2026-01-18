# 掲示板レート制限機能 - 実装ドキュメント

## 概要

掲示板のスパム防止のため、投稿とコメントに対してレート制限機能を実装しました。これにより、短時間での大量投稿や悪意のある連続投稿を防止し、健全なコミュニティを維持できます。

## レート制限の仕様

### 投稿のレート制限

1ユーザーあたりの制限：
- **1分間に1投稿まで**
- **1時間に5投稿まで**
- **1日に20投稿まで**

### コメントのレート制限

1ユーザーあたりの制限：
- **1分間に3コメントまで**
- **1時間に30コメントまで**
- **同一投稿への連続コメント防止**（最低30秒間隔）

## 実装内容

### 1. データベーススキーマ

#### rate_limits テーブル

新しいマイグレーション: `supabase/migrations/019_rate_limits.sql`

```sql
CREATE TABLE public.rate_limits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('post', 'comment')),
  post_id UUID REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  action_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**フィールド説明：**
- `user_id`: アクションを実行したユーザーID
- `action_type`: アクションの種類（'post' または 'comment'）
- `post_id`: コメントの場合、対象の投稿ID（同一投稿への連続コメント防止用）
- `action_timestamp`: アクション実行日時

**インデックス：**
- `idx_rate_limits_user_action`: ユーザーとアクション種別による検索を高速化
- `idx_rate_limits_timestamp`: タイムスタンプによる検索を高速化
- `idx_rate_limits_user_post`: 同一投稿へのコメント検索を高速化

**クリーンアップ機能：**
- `clean_old_rate_limits()` 関数で1日以上前のレコードを削除可能
- 定期的な実行を推奨（ストレージ節約のため）

### 2. バックエンドAPI

#### レート制限ヘルパー関数

新しいファイル: `lib/rate-limit.ts`

**主要な関数：**

##### `checkRateLimit()`
```typescript
async function checkRateLimit(
  supabase: SupabaseClient,
  userId: string,
  actionType: 'post' | 'comment',
  configs: RateLimitConfig[],
  postId?: string
): Promise<RateLimitResult>
```

複数の時間ウィンドウでレート制限をチェックし、制限超過の場合は次に実行可能な時刻を返します。

##### `recordRateLimitAction()`
```typescript
async function recordRateLimitAction(
  supabase: SupabaseClient,
  userId: string,
  actionType: 'post' | 'comment',
  postId?: string
): Promise<void>
```

アクションをrate_limitsテーブルに記録します。

#### API統合

**投稿API (`app/api/forum/posts/route.ts`)：**
- POST リクエスト時にレート制限をチェック
- 制限超過時は429ステータスコードと次の投稿可能時刻を返す
- 投稿成功後、アクションを記録

**コメントAPI (`app/api/forum/comments/route.ts`)：**
- POST リクエスト時にレート制限をチェック
- 同一投稿への連続コメントもチェック
- 制限超過時は429ステータスコードと次のコメント可能時刻を返す
- コメント成功後、アクションを記録

### 3. フロントエンドUI

#### 新規投稿ページ (`app/forum/new/page.tsx`)

**追加機能：**
- レート制限エラー表示
- 次の投稿可能時刻までのカウントダウンタイマー
- カウントダウン中は投稿ボタンを無効化
- ボタンのラベルをカウントダウンに変更

**UIの動作：**
```
制限内: 「投稿する」ボタン（有効）
制限超過: 「X分Y秒後に投稿可能」ボタン（無効）+ カウントダウン表示
```

#### 投稿詳細ページ (`app/forum/[id]/page.tsx`)

**追加機能：**
- コメントフォームにレート制限エラー表示
- 次のコメント可能時刻までのカウントダウンタイマー
- カウントダウン中はコメントフォームとボタンを無効化
- ボタンのラベルをカウントダウンに変更

**UIの動作：**
```
制限内: 「コメントする」ボタン（有効）、テキストエリア（有効）
制限超過: 「X分Y秒後にコメント可能」ボタン（無効）、テキストエリア（無効）+ カウントダウン表示
```

## エラーメッセージ

レート制限に達した場合、以下のような日本語メッセージが表示されます：

- 「1分間の制限に達しました。次の投稿は X秒後 以降に可能です。」
- 「1時間の制限に達しました。次の投稿は X分Y秒後 以降に可能です。」
- 「1日の制限に達しました。次の投稿は X時間Y分後 以降に可能です。」
- 「同じ投稿への連続コメントは30秒以上間隔を空けてください。次のコメントは X秒後 以降に可能です。」

## セキュリティとパフォーマンス

### セキュリティ
- データベースレベルでのレート制限により、APIを直接呼び出す攻撃にも対応
- すべてのチェックはサーバーサイドで実行
- ユーザーIDによる制限でアカウント単位での管理

### パフォーマンス
- インデックスによる高速検索
- エラー時はサービス継続性を優先（制限をスキップ）
- 1日以上前のレコードは定期クリーンアップ可能

### データ保護
- CASCADE削除設定により、ユーザー削除時に関連レコードも自動削除
- プライバシーに配慮したデータ構造

## 使用方法

### 手動データベースセットアップが必要な場合

マイグレーションファイル `supabase/migrations/019_rate_limits.sql` を実行してください：

```bash
# Supabase CLIを使用する場合
supabase db push

# または、Supabaseダッシュボードから直接SQLを実行
```

### 定期クリーンアップの設定（推奨）

古いレコードを定期的に削除するため、以下のクエリを定期実行することを推奨します：

```sql
SELECT clean_old_rate_limits();
```

Supabaseのダッシュボードから、Database > Functions で pg_cron などを使用して自動化できます。

## テスト方法

### 投稿のレート制限テスト

1. 親アカウントでログイン
2. `/forum/new` で新規投稿を作成
3. 連続して投稿を試みる
4. 1分以内に2回目の投稿を試すと制限エラーが表示される
5. カウントダウンタイマーが表示され、時間経過で自動的に解除される

### コメントのレート制限テスト

1. 親アカウントでログイン
2. 任意の投稿の詳細ページを開く
3. コメントを連続して投稿を試みる
4. 30秒以内に同じ投稿への2回目のコメントを試すと制限エラーが表示される
5. カウントダウンタイマーが表示され、時間経過で自動的に解除される

## トラブルシューティング

### レート制限が機能しない場合

1. マイグレーションが正しく実行されたか確認
   ```sql
   SELECT * FROM public.rate_limits LIMIT 1;
   ```

2. インデックスが作成されているか確認
   ```sql
   SELECT indexname FROM pg_indexes WHERE tablename = 'rate_limits';
   ```

3. アプリケーションログでエラーを確認
   - ブラウザの開発者ツールでネットワークタブを確認
   - APIレスポンスに429ステータスコードが返っているか確認

### パフォーマンスの問題

rate_limitsテーブルのサイズが大きくなりすぎた場合：

```sql
-- レコード数を確認
SELECT COUNT(*) FROM public.rate_limits;

-- 古いレコードを削除
SELECT clean_old_rate_limits();
```

## 今後の拡張可能性

- Redis を使用した高速なレート制限（現在はデータベースベース）
- IP アドレスベースのレート制限
- 管理者による個別ユーザーの制限設定
- より細かい制限設定（カテゴリ別など）
- レート制限の統計情報表示

## まとめ

この実装により：
- ✅ スパム投稿の防止
- ✅ サーバーリソースの保護
- ✅ ユーザーフレンドリーなエラー表示
- ✅ 健全なコミュニティの維持

が実現されました。
