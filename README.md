# 親子マッチング (Oyako Matching)

親子断絶・実子誘拐後の再会を支援するマッチングプラットフォーム

## 概要

親子断絶から救うためのアプリケーション。離別した親と、自ら親を探す12歳以上の子どもをマッチングします。

### ターゲット
- **離別した親**: 有料会員（月額1,000円）
- **子ども**: 自ら親を探す12歳以上の子（無料）

### 技術スタック
- **Frontend**: Next.js 15 (App Router)
- **Backend/Auth/DB**: Supabase (PostgreSQL, Row Level Security)
- **Authentication**: xID API（マイナンバーカード認証）+ Passkeys
- **Payments**: Stripe (サブスクリプションモデル)
- **AI**: OpenAI API（エピソードベクトル化、成長シミュレーション、投稿モデレーション）

### コア機能
- マイナンバー連携による厳格な本人確認
- 生年月日とエピソード類似度によるマッチング（Vector Search）
- AI成長写真生成とタイムカプセル・メッセージ機能
- ストーカー規制法に配慮した非公開照合・モデレーション

## セットアップ

### 環境変数

`.env.local`ファイルを作成し、以下の環境変数を設定してください：

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# xID API (マイナンバーカード認証)
XID_API_KEY=your_xid_api_key
XID_API_SECRET=your_xid_api_secret

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# WebAuthn/Passkey (パスキー認証)
RP_NAME=親子マッチング
RP_ID=localhost  # 本番環境ではドメイン名
NEXT_PUBLIC_ORIGIN=http://localhost:3000  # 本番環境では https://your-domain.com
```

### インストールと起動

```bash
# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いてアプリケーションを確認してください。

## プロジェクト構成

```
/app                 # Next.js App Router
  /api               # APIルート
    /auth            # 認証API
      /passkey       # パスキー認証エンドポイント
  /auth              # 認証ページ
    /login           # ログインページ
    /passkey-login   # パスキーログインページ
    /register        # 新規登録ページ
  /components        # Reactコンポーネント
    /passkey         # パスキー関連コンポーネント
  /dashboard         # ダッシュボード
    /security        # セキュリティ設定（パスキー管理）
  /matching          # マッチング機能
  /messages          # メッセージ機能
  /payments          # 決済ページ
/lib                 # ユーティリティとヘルパー
  /supabase          # Supabase設定
  /stripe            # Stripe設定
  /openai            # OpenAI設定
  /webauthn          # WebAuthn/パスキー設定
/types               # TypeScript型定義
/supabase            # Supabaseマイグレーション
/docs                # ドキュメント
  WEBAUTHN_PASSKEY.md # パスキー機能ドキュメント
```

## 主要機能

### 認証機能
- **メール/パスワード認証**: 従来の認証方式
- **パスキー認証**: 生体認証（指紋、顔認証）による安全なログイン
  - パスワード不要でフィッシング攻撃に強い
  - Chrome、Safari、Firefox、Edgeに対応
  - 詳細は [WebAuthnドキュメント](docs/WEBAUTHN_PASSKEY.md) を参照
- **マイナンバーカード認証**: xID APIによる厳格な本人確認

### マッチング機能
- 生年月日による絞り込み
- エピソード類似度検索（OpenAI embeddings + pgvector）
- AIによる成長写真生成

### その他の機能
- メッセージング
- タイムカプセル
- サブスクリプション決済（Stripe）

## セキュリティとコンプライアンス

- Row Level Security (RLS) による厳格なデータアクセス制御
- WebAuthn/パスキーによるフィッシング耐性のある認証
- マイナンバーカードによる本人確認
- ストーカー規制法に準拠した非公開照合
- AIによる投稿コンテンツのモデレーション
- HTTPS強制（本番環境）

## License

Private
