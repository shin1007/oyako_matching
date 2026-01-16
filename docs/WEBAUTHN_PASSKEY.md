# WebAuthn パスキー認証機能 ドキュメント

## 概要

このドキュメントは、親子マッチングプラットフォームに実装されたWebAuthn（パスキー）認証機能について説明します。

## 機能

### 1. パスキー登録
- ユーザーは既存アカウントにパスキーを追加登録できます
- 複数のデバイス（iPhone、MacBook、セキュリティキーなど）にパスキーを登録可能
- 各パスキーにデバイス名を設定して管理しやすくできます

### 2. パスキーログイン
- パスワード不要で、生体認証（指紋、顔認証）またはデバイスのロック解除でログイン
- 従来のメール/パスワード認証も引き続き利用可能（フォールバック）

### 3. パスキー管理
- ダッシュボードからパスキーの一覧を確認
- 不要なパスキーを削除可能
- 最終使用日時を確認できます

## 技術仕様

### 使用ライブラリ
- **@simplewebauthn/server**: サーバーサイドのWebAuthn実装
- **@simplewebauthn/browser**: クライアントサイドのWebAuthn実装

### データベーススキーマ

```sql
CREATE TABLE public.passkeys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credential_id TEXT UNIQUE NOT NULL,
  public_key TEXT NOT NULL,
  counter BIGINT DEFAULT 0 NOT NULL,
  device_name TEXT,
  transports TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  last_used_at TIMESTAMPTZ
);
```

### APIエンドポイント

#### 1. POST /api/auth/passkey/register-challenge
パスキー登録のチャレンジを生成します。

**認証**: 必要（ログイン済みユーザー）

**レスポンス**:
```json
{
  "options": {
    "challenge": "base64url-encoded-challenge",
    "rp": { "name": "親子マッチング", "id": "localhost" },
    "user": {
      "id": "user-id",
      "name": "user@example.com",
      "displayName": "ユーザー名"
    },
    ...
  }
}
```

#### 2. POST /api/auth/passkey/register-verify
パスキー登録を検証し、データベースに保存します。

**認証**: 必要（ログイン済みユーザー）

**リクエスト**:
```json
{
  "credential": { /* WebAuthn credential response */ },
  "deviceName": "iPhone"
}
```

**レスポンス**:
```json
{
  "success": true,
  "passkey": {
    "id": "uuid",
    "device_name": "iPhone",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

#### 3. POST /api/auth/passkey/login-challenge
パスキーログインのチャレンジを生成します。

**認証**: 不要

**リクエスト**:
```json
{
  "email": "user@example.com" // 任意
}
```

**レスポンス**:
```json
{
  "options": {
    "challenge": "base64url-encoded-challenge",
    "rpId": "localhost",
    "allowCredentials": [ /* user's passkeys if email provided */ ],
    ...
  }
}
```

#### 4. POST /api/auth/passkey/login-verify
パスキーログインを検証し、ユーザー情報を返します。

**認証**: 不要

**リクエスト**:
```json
{
  "credential": { /* WebAuthn authentication response */ }
}
```

**レスポンス**:
```json
{
  "success": true,
  "user": {
    "id": "user-id",
    "email": "user@example.com"
  }
}
```

#### 5. GET /api/auth/passkey/list
ユーザーの登録済みパスキー一覧を取得します。

**認証**: 必要（ログイン済みユーザー）

**レスポンス**:
```json
{
  "passkeys": [
    {
      "id": "uuid",
      "device_name": "iPhone",
      "created_at": "2024-01-01T00:00:00Z",
      "last_used_at": "2024-01-02T00:00:00Z",
      "transports": ["internal"]
    }
  ]
}
```

#### 6. DELETE /api/auth/passkey/[id]
特定のパスキーを削除します。

**認証**: 必要（ログイン済みユーザー）

**レスポンス**:
```json
{
  "success": true
}
```

## セットアップ手順

### 1. 環境変数の設定

`.env.local`ファイルに以下の環境変数を追加してください：

```env
# WebAuthn/Passkey Configuration
RP_NAME=親子マッチング
RP_ID=localhost  # 本番環境ではドメイン名（例: oyako-matching.com）
NEXT_PUBLIC_ORIGIN=http://localhost:3000  # 本番環境では https://your-domain.com
```

### 2. データベースマイグレーション

Supabaseダッシュボードまたはマイグレーションツールを使用して、以下のマイグレーションファイルを実行してください：

1. `supabase/migrations/006_passkeys_table.sql` - passkeyテーブルの作成
2. `supabase/migrations/007_passkeys_rls_policies.sql` - RLSポリシーの設定

### 3. HTTPS の確認

WebAuthnはセキュリティ上の理由から、本番環境ではHTTPSが必須です。
開発環境では`localhost`で動作しますが、本番環境では必ずHTTPSを使用してください。

## 使用方法

### パスキーの登録

1. ログイン後、ダッシュボードの「セキュリティ設定」ページ（`/dashboard/security`）にアクセス
2. 「新しいパスキーを登録」セクションで、デバイス名を入力（任意）
3. 「パスキーを登録」ボタンをクリック
4. ブラウザまたはOSのパスキー登録ダイアログが表示されるので、指紋認証や顔認証などで認証
5. 登録完了後、一覧に表示されます

### パスキーでログイン

#### 方法1: ログインページから
1. ログインページ（`/auth/login`）にアクセス
2. 「パスキーでログイン」ボタンをクリック
3. パスキーログインページに遷移
4. メールアドレスを入力（任意）
5. 「パスキーでログイン」ボタンをクリック
6. ブラウザまたはOSのパスキー認証ダイアログで認証

#### 方法2: 直接パスキーログインページへ
1. `/auth/passkey-login`に直接アクセス
2. 上記の手順4〜6を実行

### パスキーの管理

1. ダッシュボードの「セキュリティ設定」ページ（`/dashboard/security`）にアクセス
2. 「登録済みのパスキー」セクションで、登録されているパスキーを確認
3. 不要なパスキーは「削除」ボタンで削除可能

## セキュリティ

### フィッシング対策
パスキーは公開鍵暗号化を使用し、秘密鍵はデバイス内に安全に保存されます。
攻撃者がフィッシングサイトを作成しても、正しいドメイン以外では認証できません。

### リプレイ攻撃対策
各認証リクエストは一意のチャレンジを使用し、署名カウンターで検証されます。

### Row Level Security (RLS)
データベースレベルで、ユーザーは自分のパスキーのみにアクセスできるように制限されています。

## ブラウザ対応

### デスクトップ
- ✅ Chrome 67+
- ✅ Safari 13+
- ✅ Firefox 60+
- ✅ Edge 18+

### モバイル
- ✅ Safari (iOS 14+)
- ✅ Chrome (Android)
- ✅ Samsung Internet

## トラブルシューティング

### パスキーが登録できない

**原因1**: ブラウザがWebAuthnに対応していない
- **解決策**: 最新版のChrome、Safari、またはFirefoxを使用してください

**原因2**: HTTPSではない（本番環境）
- **解決策**: HTTPSを有効にしてください。開発環境では`localhost`を使用してください

**原因3**: 生体認証が設定されていない
- **解決策**: デバイスで指紋認証や顔認証を設定してください

### パスキーでログインできない

**原因1**: 別のデバイスで登録したパスキーを使用しようとしている
- **解決策**: 各デバイスでパスキーを個別に登録する必要があります

**原因2**: パスキーが削除されている
- **解決策**: セキュリティ設定ページで新しいパスキーを登録してください

**原因3**: チャレンジの期限切れ
- **解決策**: もう一度ログインを試してください（チャレンジは5分間有効）

### "パスキーの使用が許可されていません"エラー

**原因**: ブラウザの設定でパスキーがブロックされている
- **解決策**: ブラウザの設定で、サイトに対してパスキーの使用を許可してください

## 今後の改善点

1. **セッション管理の改善**: 現在はパスキー検証後にSupabase OTPを使用していますが、よりシームレスな方法を検討
2. **クロスデバイス認証**: クラウド同期されたパスキー（iCloud Keychain、Google Password Managerなど）のサポート
3. **ユーザビリティ向上**: パスキー登録の誘導フローの改善
4. **監査ログ**: パスキーの使用履歴をより詳細に記録

## 参考資料

- [WebAuthn Specification (W3C)](https://www.w3.org/TR/webauthn/)
- [SimpleWebAuthn Documentation](https://simplewebauthn.dev/)
- [FIDO Alliance](https://fidoalliance.org/)
- [Passkeys.dev](https://passkeys.dev/)
