
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyPasskeyAuthentication } from '@/lib/webauthn/server';
import { logAuditEvent } from '@/lib/utils/auditLogger';
import type { AuthenticationResponseJSON } from '@simplewebauthn/types';
import { getCsrfSecretFromCookie, getCsrfTokenFromHeader, verifyCsrfToken } from '@/lib/utils/csrf';

/**
 * POST /api/auth/passkey/login-verify
 * Verify passkey authentication and sign in the user
 */
export async function POST(request: NextRequest) {
  // CSRFトークン検証
  const secret = getCsrfSecretFromCookie(request);
  const token = getCsrfTokenFromHeader(request);
  if (!verifyCsrfToken(secret, token)) {
    return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
  }
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { credential } = body;

    if (!credential) {
      // 監査ログ: 認証情報不足
      await logAuditEvent({
        event_type: 'login_passkey_failed',
        description: '認証情報が不足しています',
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
        user_agent: request.headers.get('user-agent') ?? null,
      });
      return NextResponse.json(
        { error: '認証情報が不足しています' },
        { status: 400 }
      );
    }

    // Retrieve challenge from cookie
    const challenge = request.cookies.get('passkey_challenge')?.value;

    if (!challenge) {
      // 監査ログ: チャレンジ無効
      await logAuditEvent({
        event_type: 'login_passkey_failed',
        description: 'チャレンジが無効です',
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
        user_agent: request.headers.get('user-agent') ?? null,
      });
      return NextResponse.json(
        { error: 'チャレンジが無効です' },
        { status: 400 }
      );
    }

    const credentialId = Buffer.from(
      (credential as AuthenticationResponseJSON).id,
      'base64url'
    ).toString('base64url');

    // Find the passkey credential
    const { data: passkey, error: passkeyError } = await supabase
      .from('passkeys')
      .select('*')
      .eq('credential_id', credentialId)
      .single();

    if (passkeyError || !passkey) {
      // 監査ログ: パスキーが見つからない
      await logAuditEvent({
        event_type: 'login_passkey_failed',
        description: 'パスキーが見つかりません',
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
        user_agent: request.headers.get('user-agent') ?? null,
      });
      return NextResponse.json(
        { error: 'パスキーが見つかりません' },
        { status: 404 }
      );
    }

    // Verify the authentication response
    const verification = await verifyPasskeyAuthentication(
      credential as AuthenticationResponseJSON,
      challenge,
      passkey
    );

    if (!verification.verified) {
      // 監査ログ: パスキー検証失敗
      await logAuditEvent({
        user_id: passkey.user_id,
        event_type: 'login_passkey_failed',
        target_table: 'users',
        target_id: passkey.user_id,
        description: 'パスキーの検証に失敗しました',
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
        user_agent: request.headers.get('user-agent') ?? null,
      });
      return NextResponse.json(
        { error: 'パスキーの検証に失敗しました' },
        { status: 400 }
      );
    }

    // Update passkey counter and last_used_at
    await supabase
      .from('passkeys')
      .update({
        counter: verification.authenticationInfo.newCounter,
        last_used_at: new Date().toISOString(),
      })
      .eq('id', passkey.id);

    // Get user information from public.users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('email')
      .eq('id', passkey.user_id)
      .single();

    if (userError || !userData) {
      // 監査ログ: ユーザーが見つからない
      await logAuditEvent({
        user_id: passkey.user_id,
        event_type: 'login_passkey_failed',
        target_table: 'users',
        target_id: passkey.user_id,
        description: 'ユーザーが見つかりません',
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
        user_agent: request.headers.get('user-agent') ?? null,
      });
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      );
    }

    // TODO: Implement proper session creation
    // 監査ログ記録（成功）
    await logAuditEvent({
      user_id: passkey.user_id,
      event_type: 'login_passkey',
      target_table: 'users',
      target_id: passkey.user_id,
      description: 'パスキーによるログイン成功',
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
      user_agent: request.headers.get('user-agent') ?? null,
    });
    // Currently, this endpoint only verifies the passkey but doesn't create a Supabase session
    // For a production implementation, consider one of these approaches:
    // 1. Use Supabase Auth hooks to create a session after passkey verification
    // 2. Implement a custom JWT token exchange mechanism
    // 3. Use Supabase's custom auth flow with a verified token
    // For now, return success and let the client handle the limitation

    const response = NextResponse.json({
      success: true,
      user: {
        id: passkey.user_id,
        email: userData.email,
      },
      // TODO: Include session token when proper session creation is implemented
    });

    // Clear the challenge cookie
    response.cookies.delete('passkey_challenge');

    return response;
  } catch (error) {
    console.error('Login verify error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'ログインの検証に失敗しました',
      },
      { status: 500 }
    );
  }
}
