# Supabase セットアップガイド

現在、アプリケーションがSupabaseサーバーに接続できない状態です。

## 問題の詳細

```
NEXT_PUBLIC_SUPABASE_URL=https://sdoxvhjvdsqdepwgrhip.supabase.co
```

このSupabaseプロジェクトURLは現在解決できません（DNS lookup失敗）。

## 解決方法

### オプション1: 新しいSupabaseプロジェクトを作成

1. [Supabase](https://supabase.com) にアクセスしてログイン
2. 「New Project」をクリック
3. プロジェクト名、データベースパスワード、リージョンを設定
4. プロジェクト作成後、以下の情報を取得:
   - Project URL (例: `https://xxxxx.supabase.co`)
   - `anon` `public` key (Settings > API > Project API keys)

5. `.env.local`を更新:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

6. データベースマイグレーションを実行:
   - Supabase ダッシュボード > SQL Editor
   - `supabase/migrations/001_initial_schema.sql` の内容を実行
   - `supabase/migrations/002_rls_policies.sql` の内容を実行
   - `supabase/migrations/003_forum_feature.sql` の内容を実行
   - `supabase/migrations/004_forum_rls_policies.sql` の内容を実行

### オプション2: Supabase Local Development

ローカルでSupabaseを実行する場合:

```bash
# Supabase CLIをインストール
npm install -g supabase

# ローカルSupabaseを起動
supabase start

# 表示されるURLとキーを.env.localに設定
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<表示されたキー>
```

### オプション3: 開発時の一時的な回避策（現在有効）

`.env.local`で設定されている:
```env
DISABLE_SUPABASE_MIDDLEWARE=true
```

これにより、ミドルウェアでのSupabaseセッション確認がスキップされます。
ただし、ログイン機能自体は動作しません。

## 確認コマンド

Supabase接続を確認:

```powershell
# DNS解決テスト
nslookup your-project-ref.supabase.co

# 接続テスト
Test-NetConnection -ComputerName your-project-ref.supabase.co -Port 443

# HTTPSヘルスチェック（curlが必要）
curl https://your-project-ref.supabase.co/auth/v1/health
```

## 次のステップ

1. ✅ Supabaseプロジェクトを作成または既存のプロジェクトURLを確認
2. ✅ `.env.local`に正しいURLとキーを設定
3. ✅ データベースマイグレーションを実行
4. ✅ `npm run dev`で開発サーバーを再起動
5. ✅ ブラウザのコンソールでSupabase Client Initログを確認

## トラブルシューティング

### エラー: "Failed to fetch"

**原因**:
- Supabase URLが正しくない
- ネットワーク接続の問題
- CORSの設定ミス
- Supabaseプロジェクトが一時停止中

**対処法**:
1. Supabaseダッシュボードでプロジェクトが「Active」であることを確認
2. ブラウザの開発者ツール > Console でエラーメッセージを確認
3. ブラウザの開発者ツール > Network タブでリクエストの詳細を確認

### Supabaseプロジェクトが無い場合

開発を進めるには、実際のSupabaseプロジェクトが必要です。
無料プランで2つのプロジェクトまで作成可能です。
