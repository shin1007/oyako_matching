# レート制限機能 - セットアップ手順

## ⚠️ 重要: 以下の手順を実行してください

レート制限機能を有効にするには、データベースマイグレーションを実行する必要があります。

### 1. Supabaseマイグレーションの実行

以下のいずれかの方法でマイグレーションを実行してください：

#### 方法A: Supabase CLI を使用（推奨）

```bash
# Supabase CLIがインストールされている場合
supabase db push
```

#### 方法B: Supabaseダッシュボードから手動実行

1. [Supabaseダッシュボード](https://app.supabase.com)にアクセス
2. プロジェクトを選択
3. 左メニューから「SQL Editor」を選択
4. `supabase/migrations/019_rate_limits.sql` の内容をコピー
5. SQLエディタに貼り付けて実行

### 2. 動作確認

マイグレーション実行後、以下を確認してください：

```sql
-- テーブルが作成されたか確認
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'rate_limits';

-- インデックスが作成されたか確認
SELECT indexname FROM pg_indexes WHERE tablename = 'rate_limits';
```

期待される結果:
- `rate_limits` テーブルが存在する
- 3つのインデックスが作成されている:
  - `idx_rate_limits_user_action`
  - `idx_rate_limits_timestamp`
  - `idx_rate_limits_user_post`

### 3. アプリケーションの起動

```bash
# 依存関係のインストール（初回のみ）
npm install

# 開発サーバーの起動
npm run dev
```

### 4. 機能のテスト

詳細なテストプランは `docs/RATE_LIMITING_TEST_PLAN.md` を参照してください。

#### 簡易テスト

1. 親アカウントでログイン
2. `/forum/new` にアクセスして投稿を作成
3. すぐにもう一度投稿を試みる
4. 「1分間の制限に達しました」というエラーメッセージが表示されることを確認
5. カウントダウンタイマーが表示されることを確認

### 5. （オプション）定期クリーンアップの設定

古いレコード（1日以上前）を定期的に削除することを推奨します：

```sql
-- 手動実行
SELECT clean_old_rate_limits();

-- または、pg_cronを使用して自動化（Supabase Pro以上）
-- 毎日午前3時に実行
SELECT cron.schedule('clean-rate-limits', '0 3 * * *', 'SELECT clean_old_rate_limits()');
```

## トラブルシューティング

### マイグレーションエラー

```
ERROR: function uuid_generate_v4() does not exist
```

→ 解決策: `uuid-ossp` 拡張機能を有効にしてください：

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### レート制限が機能しない

1. ブラウザの開発者ツールを開く
2. ネットワークタブで `/api/forum/posts` または `/api/forum/comments` のレスポンスを確認
3. 429ステータスコードが返っているか確認

### カウントダウンが表示されない

- ページをリフレッシュしてキャッシュをクリア
- ブラウザのJavaScriptコンソールでエラーを確認

## 完了確認チェックリスト

- [ ] マイグレーションが正常に実行された
- [ ] `rate_limits` テーブルが作成された
- [ ] インデックスが作成された
- [ ] アプリケーションが正常に起動する
- [ ] 投稿のレート制限が機能する
- [ ] コメントのレート制限が機能する
- [ ] カウントダウンタイマーが表示される
- [ ] 制限時間経過後に再度投稿/コメント可能

## サポート

問題が発生した場合は、以下のドキュメントを参照してください：

- [実装詳細](./docs/RATE_LIMITING.md)
- [テストプラン](./docs/RATE_LIMITING_TEST_PLAN.md)
- [UI/UXガイド](./docs/RATE_LIMITING_UI_GUIDE.md)

---

セットアップが完了したら、このファイルは削除しても構いません。
