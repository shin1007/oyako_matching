# メール認証機能（Email Verification）

## 概要

新規ユーザー登録時のメール認証機能について説明します。自動メール送信、認証リンク処理、再送信（レート制限付き）などを実装しています。

## 主な機能

### 1. 登録時の自動メール認証
- ユーザー登録時、Supabaseが自動で認証メールを送信
- ユーザーは「認証待ち」ページにリダイレクトされる
- メール内の認証リンクからアプリに戻る

### 2. 認証リンクコールバック
- メール内リンククリック時にコールバックAPIが呼ばれる
- usersテーブルの`email_verified_at`を更新
- Supabase Authの`email_confirmed_at`とも同期
- 認証成功後はダッシュボードへリダイレクト

### 3. 認証メール再送信
- 必要に応じて認証メールを再送信可能
- レート制限：1時間あたり3回まで
- 次回再送信可能までのカウントダウン表示
- すべての再送信履歴をDBで監査

### 4. ログインフロー連携
- ログイン時にメール認証済みかチェック
- 未認証の場合は認証待ちページへリダイレクト
- ログイン画面から認証メール再送リンクあり

## APIエンドポイント

### POST `/api/auth/send-verification-email`

認証メールをレート制限付きで再送信します。

**認証:** 必須（ログイン済みユーザーのみ）
**レート制限:** 1ユーザーあたり1時間3回まで

**リクエスト例:**
```json
POST /api/auth/send-verification-email
Content-Type: application/json
```

**成功レスポンス（200）:**
```json
{
   "success": true,
   "message": "認証メールを送信しました",
   "attemptsRemaining": 2
}
```

**エラーレスポンス（429 - レート制限超過）:**
```json
{
   "error": "送信回数の上限に達しました。45分後に再試行してください",
   "nextAllowedAt": "2024-01-16T07:45:00.000Z",
   "attemptsRemaining": 0
}
```

**エラーレスポンス（400 - 既に認証済み）:**
```json
{
   "error": "メールアドレスは既に確認済みです"
}
```

**エラーレスポンス（401 - 未認証）:**
```json
{
   "error": "認証が必要です"
}
```

### GET `/api/auth/verify-email`

メール認証リンクから自動で呼ばれるコールバックAPIです。

**パラメータ:**
- `token_hash` - Supabaseから渡される認証トークン
- `type` - 認証種別（例: 'signup'）
- `next` - 認証後のリダイレクト先（任意）

**成功:** `/auth/verify-email-pending?verified=true` へリダイレクト
**エラー:** `/auth/verify-email-pending?error=<error_type>` へリダイレクト

## ページ構成

### `/auth/verify-email-pending`

メール認証状況の表示と再送信機能を提供します。

**主な機能:**
- ユーザーのメールアドレス表示
- 認証手順の案内
- レート制限付き再送ボタン
- 次回再送可能までのカウントダウン
- 残り送信回数（X/3）表示
- 成功・エラーメッセージ表示
- 認証成功時は自動でダッシュボードへ遷移

**URLパラメータ:**
- `verified=true` : 認証成功メッセージ表示＆ダッシュボード遷移
- `error=verification_failed` : 無効または期限切れリンク
- `error=missing_params` : 必須パラメータ不足
- `error=unexpected` : その他エラー

## データベース設計

### テーブル: `email_verification_attempts`

認証メール再送信の履歴・レート制限管理用テーブル。

```sql
CREATE TABLE email_verification_attempts (
   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
   user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
   attempted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
   ip_address TEXT,
   user_agent TEXT,
   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**インデックス:**
- `idx_email_verification_attempts_user_id` : ユーザー検索用
- `idx_email_verification_attempts_attempted_at` : 時間検索用

**RLSポリシー:**
- ユーザー自身のみ閲覧・追加可能

### カラム: `users.email_verified_at`

メール認証日時を記録するカラムを追加。

```sql
ALTER TABLE users 
ADD COLUMN email_verified_at TIMESTAMP WITH TIME ZONE;
```

## 設定・構成

### 環境変数

以下を必ず設定してください：

```env
# メール認証リダイレクト用
NEXT_PUBLIC_ORIGIN=http://localhost:3000  # 本番は本番URL

# Supabase認証用
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### Supabaseメール認証設定

1. **メール認証プロバイダ有効化**
    - Supabaseダッシュボード > Authentication > Settings
    - 「Email」プロバイダを有効化
    - 必要に応じてメールテンプレートを編集

2. **メールテンプレート編集**
    - Authentication > Email Templates
    - 「Confirm signup」テンプレートを編集（任意）
    - デフォルトでも動作可

3. **メール送信プロバイダ**
    - デフォルトはSupabase内蔵メール
    - 本番運用時はSMTPやSendGrid, AWS SES等の外部サービス推奨

## ユーザーフロー

### 登録フロー
1. User fills out registration form
2. User submits form
3. System creates account in Supabase Auth
4. System creates user record in `users` table
5. Supabase automatically sends verification email
6. User is redirected to `/auth/verify-email-pending`
7. User receives email with verification link

### Verification Flow
1. User clicks verification link in email
2. Browser navigates to `/api/auth/verify-email?token_hash=...&type=signup`
3. API verifies the token with Supabase
4. API updates `email_verified_at` in users table
5. User is redirected to `/auth/verify-email-pending?verified=true`
6. Success message is shown
7. User is automatically redirected to dashboard after 3 seconds

### Resend Flow
1. User is on `/auth/verify-email-pending` page
2. User clicks "確認メールを再送信" button
3. System checks rate limit (3 per hour)
4. If allowed:
   - Records attempt in database
   - Sends new verification email via Supabase
   - Shows success message and updates remaining attempts
5. If rate limited:
   - Shows error message with countdown timer
   - Countdown displays time remaining until next attempt allowed

### Login Flow with Unverified Email
1. User enters credentials on login page
2. System authenticates credentials
3. System checks `email_confirmed_at` from Supabase Auth
4. If not verified:
   - User is redirected to `/auth/verify-email-pending`
   - User can resend verification email
5. If verified:
   - User proceeds to dashboard

## Rate Limiting Details

### Implementation
- **Limit:** 3 attempts per hour per user
- **Window:** Rolling 1-hour window
- **Storage:** Database (`email_verification_attempts` table)
- **Cleanup:** Automatic cleanup function for attempts older than 24 hours

### Rate Limit Logic
```typescript
// Get attempts in the last hour
const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
const attempts = await supabase
  .from('email_verification_attempts')
  .select('*')
  .eq('user_id', user.id)
  .gte('attempted_at', oneHourAgo.toISOString());

if (attempts.length >= 3) {
  // Rate limited - calculate wait time
  const oldestAttempt = attempts[attempts.length - 1];
  const nextAllowedTime = new Date(
    new Date(oldestAttempt.attempted_at).getTime() + 60 * 60 * 1000
  );
  // Show countdown
}
```

### Countdown Timer
- Updates every second
- Displays in MM:SS format (e.g., "45:23")
- Automatically enables resend button when countdown reaches 0
- Persists across page refreshes by querying database

## Security Considerations

### Rate Limiting
- Prevents abuse of email sending functionality
- Protects against spam and DoS attacks
- Tracks IP address and user agent for audit trail

### Token Security
- Verification tokens are generated by Supabase
- Tokens are single-use and time-limited
- Tokens are validated server-side before updating verification status

### Database Security
- RLS policies ensure users can only access their own attempts
- All email verification operations require authentication
- IP and user agent logging for security audit

## Testing

### Manual Testing Checklist

1. **Registration:**
   - [ ] Register a new user
   - [ ] Verify email is sent
   - [ ] Check redirection to `/auth/verify-email-pending`
   - [ ] Verify email content contains correct verification link

2. **Email Verification:**
   - [ ] Click verification link in email
   - [ ] Verify redirection to success page
   - [ ] Verify `email_verified_at` is set in database
   - [ ] Verify automatic redirect to dashboard after 3 seconds

3. **Resend Functionality:**
   - [ ] Click resend button
   - [ ] Verify new email is received
   - [ ] Verify attempt is recorded in database
   - [ ] Verify remaining attempts counter decreases

4. **Rate Limiting:**
   - [ ] Send 3 verification emails
   - [ ] Verify 4th attempt is blocked
   - [ ] Verify countdown timer displays correctly
   - [ ] Wait for countdown to reach 0
   - [ ] Verify resend button becomes enabled
   - [ ] Verify can resend after cooldown period

5. **Login Flow:**
   - [ ] Login with unverified account
   - [ ] Verify redirection to verification pending page
   - [ ] Verify can resend from this page
   - [ ] Verify link on login page works

6. **Edge Cases:**
   - [ ] Try to resend after already verified (should show error)
   - [ ] Try to verify with invalid token (should show error)
   - [ ] Try to verify with expired token (should show error)
   - [ ] Check page refresh during countdown (should maintain countdown)

## Troubleshooting

### Emails Not Sending

**Problem:** Users not receiving verification emails

**Solutions:**
1. Check Supabase email configuration
2. Verify SMTP settings if using custom provider
3. Check spam/junk folders
4. Verify email provider rate limits haven't been exceeded
5. Check Supabase logs for email sending errors

### Rate Limit Not Working

**Problem:** Rate limit not enforcing properly

**Solutions:**
1. Verify database migration was applied
2. Check `email_verification_attempts` table exists
3. Verify RLS policies are enabled
4. Check server timezone matches expected behavior

### Countdown Timer Not Showing

**Problem:** Countdown timer not displaying wait time

**Solutions:**
1. Check browser console for JavaScript errors
2. Verify attempts are being recorded in database
3. Check system clock synchronization
4. Verify calculation logic in frontend code

### Verification Link Not Working

**Problem:** Clicking verification link shows error

**Solutions:**
1. Verify `NEXT_PUBLIC_ORIGIN` environment variable is set correctly
2. Check Supabase Auth settings for redirect URLs
3. Verify token hasn't expired (default: 24 hours)
4. Check API route is accessible (`/api/auth/verify-email`)

## Migration Instructions

To apply this feature to an existing project:

1. **Run Database Migration:**
   ```sql
   -- Apply migration file: supabase/migrations/010_email_verification.sql
   -- Or run the SQL directly in Supabase SQL Editor
   ```

2. **Install Dependencies:**
   ```bash
   npm install  # All dependencies are already in package.json
   ```

3. **Configure Environment:**
   ```bash
   # Add to .env.local
   NEXT_PUBLIC_ORIGIN=http://localhost:3000
   ```

4. **Supabase の設定（詳細手順）:**

   **4.1. メール認証を有効化:**
   1. [Supabase Dashboard](https://supabase.com/dashboard) にアクセス
   2. 対象プロジェクトを選択
   3. 左サイドバーから **Authentication** をクリック
   4. **Providers** タブを選択
   5. **Email** プロバイダーを探す
   6. **Enabled** のトグルをオンにする
   7. **Confirm email** オプションを **有効** にする（重要！）
      - これにより、登録時に自動的に確認メールが送信されます
   8. **Save** をクリック

   **4.2. リダイレクト URL を設定:**
   1. **Authentication** → **URL Configuration** に移動
   2. **Redirect URLs** セクションを探す
   3. 以下の URL を追加:
      ```
      http://localhost:3000/api/auth/verify-email
      http://localhost:3000/auth/verify-email-pending
      ```
   4. 本番環境用の URL も追加:
      ```
      https://your-production-domain.com/api/auth/verify-email
      https://your-production-domain.com/auth/verify-email-pending
      ```
   5. **Save** をクリック

   **4.3. メールテンプレートの確認（オプション）:**
   1. **Authentication** → **Email Templates** に移動
   2. **Confirm signup** テンプレートを選択
   3. テンプレートの確認:
      - 件名とメール本文をカスタマイズ可能
      - `{{ .ConfirmationURL }}` がメール確認用のリンク
      - デフォルトのテンプレートでも動作します
   4. カスタマイズした場合は **Save** をクリック

   **4.4. メール配信のテスト:**
   1. アプリケーションで新規ユーザー登録を実行
   2. 登録したメールアドレスの受信トレイを確認
   3. Supabase からの確認メールが届いているか確認
   4. 届かない場合:
      - 迷惑メールフォルダを確認
      - Supabase Dashboard の **Logs** → **Auth Logs** でエラーを確認
      - **Settings** → **API** でメール送信の制限に達していないか確認
   
   **4.5. 本番環境用のメール設定（推奨）:**
   
   Supabase の無料メールサービスには制限があるため、本番環境では専用のメールサービスの使用を推奨:
   
   1. **Authentication** → **Settings** に移動
   2. **SMTP Settings** セクションまでスクロール
   3. **Enable Custom SMTP** をオンにする
   4. 以下の情報を入力:
      - **SMTP Host**: 例 `smtp.sendgrid.net` (SendGrid使用時)
      - **SMTP Port**: 通常は `587` (TLS) または `465` (SSL)
      - **SMTP User**: メールサービスのユーザー名
      - **SMTP Pass**: メールサービスのパスワード/APIキー
      - **SMTP Sender Email**: 送信元メールアドレス（例: `noreply@yourdomain.com`）
      - **SMTP Sender Name**: 送信元表示名（例: `親子マッチング`）
   5. **Save** をクリック
   6. テストメールを送信して動作確認

   **推奨メールサービス:**
   - **SendGrid**: 無料で月100通まで、設定が簡単
   - **AWS SES**: 大量送信に適している、コストパフォーマンスが高い
   - **Resend**: 開発者フレンドリー、Next.js との相性が良い

5. **Deploy:**
   - Build and test locally
   - Deploy to your environment
   - Update `NEXT_PUBLIC_ORIGIN` for production

## Future Enhancements

### Potential Improvements
- [ ] Email verification reminder after X days
- [ ] Support for changing email address
- [ ] Email verification via code (in addition to link)
- [ ] Admin panel to view verification statistics
- [ ] Webhook notifications for verification events
- [ ] Multi-language email templates
- [ ] Custom email templates per user role
- [ ] Integration with external email analytics services

## Related Documentation

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)
- [Supabase RLS Policies](https://supabase.com/docs/guides/auth/row-level-security)
