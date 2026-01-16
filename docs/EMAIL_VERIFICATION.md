# Email Verification Feature

## Overview

This feature implements email verification for new user registrations with automatic email sending, verification link handling, and email resend functionality with rate limiting.

## Features

### 1. Automatic Email Verification on Registration
- When users register, Supabase automatically sends a verification email
- Users are redirected to a pending verification page
- Email contains a verification link that redirects to the application

### 2. Email Verification Callback
- Handles verification link clicks from email
- Updates `email_verified_at` in the users table
- Syncs with Supabase Auth's `email_confirmed_at` flag
- Redirects users to dashboard after successful verification

### 3. Email Resend Functionality
- Users can resend verification emails if needed
- Rate limiting: 3 attempts per hour
- Real-time countdown timer showing when next resend is available
- Database tracking of all resend attempts for audit purposes

### 4. Login Flow Integration
- Checks email verification status on login
- Redirects unverified users to verification pending page
- Link on login page for users who need to verify email

## API Endpoints

### POST `/api/auth/send-verification-email`

Resends the verification email with rate limiting.

**Authentication:** Required (user must be logged in)

**Rate Limit:** 3 attempts per hour per user

**Request:**
```json
POST /api/auth/send-verification-email
Content-Type: application/json
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "認証メールを送信しました",
  "attemptsRemaining": 2
}
```

**Error Response (429 - Rate Limited):**
```json
{
  "error": "送信回数の上限に達しました。45分後に再試行してください",
  "nextAllowedAt": "2024-01-16T07:45:00.000Z",
  "attemptsRemaining": 0
}
```

**Error Response (400 - Already Verified):**
```json
{
  "error": "メールアドレスは既に確認済みです"
}
```

**Error Response (401 - Unauthorized):**
```json
{
  "error": "認証が必要です"
}
```

### GET `/api/auth/verify-email`

Callback endpoint for email verification links. This is called automatically when users click the verification link in their email.

**Parameters:**
- `token_hash` - Verification token from Supabase
- `type` - Verification type (e.g., 'signup')
- `next` - Optional redirect URL after verification

**Success:** Redirects to `/auth/verify-email-pending?verified=true`

**Error:** Redirects to `/auth/verify-email-pending?error=<error_type>`

## Pages

### `/auth/verify-email-pending`

Displays email verification status and allows users to resend verification emails.

**Features:**
- Shows user's email address
- Instructions for verifying email
- Resend button with rate limit enforcement
- Real-time countdown timer showing time until next resend is allowed
- Displays remaining attempts (X/3)
- Success/error messages
- Automatic redirect to dashboard after successful verification

**URL Parameters:**
- `verified=true` - Shows success message and redirects to dashboard
- `error=verification_failed` - Invalid or expired verification link
- `error=missing_params` - Missing required parameters
- `error=unexpected` - Unexpected error occurred

## Database Schema

### Table: `email_verification_attempts`

Tracks email verification resend attempts for rate limiting.

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

**Indexes:**
- `idx_email_verification_attempts_user_id` - For user queries
- `idx_email_verification_attempts_attempted_at` - For time-based queries

**RLS Policies:**
- Users can view their own verification attempts
- Users can insert their own attempts

### Column: `users.email_verified_at`

Added timestamp column to track when email was verified.

```sql
ALTER TABLE users 
ADD COLUMN email_verified_at TIMESTAMP WITH TIME ZONE;
```

## Configuration

### Environment Variables

Ensure these are set in your environment:

```env
# Required for email redirect URLs
NEXT_PUBLIC_ORIGIN=http://localhost:3000  # or your production URL

# Supabase credentials (required for email functionality)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### Supabase Email Configuration

1. **Enable Email Authentication:**
   - Go to Supabase Dashboard > Authentication > Settings
   - Enable "Email" provider
   - Configure email templates if desired

2. **Email Templates:**
   - Navigate to Authentication > Email Templates
   - Customize "Confirm signup" template as needed
   - The default template works out of the box

3. **Email Provider:**
   - By default, Supabase uses their built-in email service
   - For production, configure a custom SMTP provider or email service (SendGrid, AWS SES, etc.)

## User Flow

### Registration Flow
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

4. **Configure Supabase:**
   - Enable email authentication
   - Set redirect URLs in Supabase Dashboard
   - Test email delivery

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
