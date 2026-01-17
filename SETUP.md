# セットアップガイド

親子マッチングプラットフォームのセットアップ手順です。

## 前提条件

- Node.js 18以上
- npm または yarn
- Supabase アカウント
- Stripe アカウント
- OpenAI API アカウント
- xID API アカウント（マイナンバーカード認証用）

## 1. リポジトリのクローン

```bash
git clone https://github.com/shin1007/oyako_matching.git
cd oyako_matching
```

## 2. 依存関係のインストール

```bash
npm install
```

## 3. Supabase セットアップ

### 3.1 Supabase プロジェクトの作成

1. [Supabase](https://supabase.com) にログイン
2. 新しいプロジェクトを作成
3. プロジェクトの URL と API キーを取得

### 3.2 データベースマイグレーション

Supabase SQL エディターで以下のファイルを順番に実行:

1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_rls_policies.sql`

### 3.3 pgvector 拡張機能の有効化

Supabase ダッシュボードの Database > Extensions から `vector` 拡張機能を有効化してください。

## 4. Stripe セットアップ

### 4.1 Stripe アカウント設定

1. [Stripe](https://stripe.com) にログイン
2. API キーを取得（Publishable key と Secret key）
3. Webhook エンドポイントを設定

### 4.2 サブスクリプション商品の作成

1. Stripe ダッシュボードで新しい商品を作成
2. 月額 ¥1,000 の料金を設定
3. Price ID を取得

### 4.3 Webhook の設定

Webhook URL: `https://your-domain.com/api/stripe/webhook`

監視するイベント:
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_failed`

Webhook 署名シークレットを取得してください。

## 5. OpenAI API セットアップ

1. [OpenAI](https://platform.openai.com) にログイン
2. API キーを作成
3. 請求情報を設定

使用するモデル:
- `gpt-4` または `gpt-3.5-turbo` (モデレーション)
- `dall-e-3` (AI成長写真生成)

## 6. xID API セットアップ

1. xID API の利用申請を行う
2. API キーとシークレットを取得
3. コールバック URL を設定: `https://your-domain.com/api/auth/verify/callback`

## 7. 環境変数の設定

`.env.local` ファイルを作成し、以下の環境変数を設定:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# xID API (マイナンバーカード認証)
XID_API_KEY=jJXw/gLhxZ+F2H3Bh3nRBOpJzNzpK3BsVv6QvG0Umgg=
XID_API_SECRET=g+C4yQO/9dC5Otdrx7v56q0tUei/b0h0ayYnfoBvksE=
XID_API_URL=https://api.xid.inc

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_webhook_secret
STRIPE_PRICE_ID=your_subscription_price_id

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 8. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) にアクセスしてください。

## 9. 本番環境へのデプロイ

### Vercel へのデプロイ (推奨)

1. GitHub リポジトリを Vercel にインポート
2. 環境変数を Vercel ダッシュボードで設定
3. デプロイを実行

```bash
npm run build
```

### その他のホスティングサービス

- Docker コンテナ化
- AWS / GCP / Azure へのデプロイ
- 自己ホスティング

## 10. セキュリティ設定

### Supabase Row Level Security (RLS)

マイグレーションで設定済みですが、以下を確認してください:

- すべてのテーブルで RLS が有効化されている
- 適切なポリシーが設定されている
- サービスロールキーは厳重に管理

### CORS 設定

本番環境では適切な CORS ポリシーを設定してください。

### Webhook セキュリティ

Stripe Webhook は署名検証を必ず実装してください（実装済み）。

## トラブルシューティング

### ビルドエラー

```bash
# キャッシュをクリア
rm -rf .next
npm run build
```

### データベース接続エラー

- Supabase の URL と API キーを確認
- ネットワーク接続を確認
- Supabase プロジェクトが起動していることを確認

### Stripe Webhook エラー

- Webhook URL が正しいことを確認
- Webhook 署名シークレットが正しいことを確認
- Stripe ダッシュボードでイベントログを確認

## サポート

問題が発生した場合は、GitHub Issues でお問い合わせください。
