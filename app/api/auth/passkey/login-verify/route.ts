import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyPasskeyAuthentication } from '@/lib/webauthn/server';
import type { AuthenticationResponseJSON } from '@simplewebauthn/server/script/deps';

/**
 * POST /api/auth/passkey/login-verify
 * Verify passkey authentication and sign in the user
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { credential } = body;

    if (!credential) {
      return NextResponse.json(
        { error: '認証情報が不足しています' },
        { status: 400 }
      );
    }

    // Retrieve challenge from cookie
    const challenge = request.cookies.get('passkey_challenge')?.value;

    if (!challenge) {
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

    // Get user information
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('email')
      .eq('id', passkey.user_id)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      );
    }

    // Sign in the user using Supabase Auth
    // Note: We need to create a session for the user
    // Since we can't directly create a session, we'll use a magic link approach
    // or return user info for the client to handle

    // For now, return success with user ID
    // The client should handle the session creation
    const response = NextResponse.json({
      success: true,
      user: {
        id: passkey.user_id,
        email: userData.email,
      },
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
