import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyPasskeyRegistration } from '@/lib/webauthn/server';
import type { RegistrationResponseJSON } from '@simplewebauthn/types';

/**
 * POST /api/auth/passkey/register-verify
 * Verify and store a new passkey credential
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check if user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'ログインが必要です' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { credential, deviceName } = body;

    if (!credential) {
      return NextResponse.json(
        { error: '認証情報が不足しています' },
        { status: 400 }
      );
    }

    // Retrieve stored challenge
    const challenge = user.user_metadata?.passkey_challenge;
    const challengeExpires = user.user_metadata?.passkey_challenge_expires;

    if (!challenge || !challengeExpires || Date.now() > challengeExpires) {
      return NextResponse.json(
        { error: 'チャレンジが無効または期限切れです' },
        { status: 400 }
      );
    }

    // Verify the registration response
    const verification = await verifyPasskeyRegistration(
      credential as RegistrationResponseJSON,
      challenge
    );

    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json(
        { error: 'パスキーの検証に失敗しました' },
        { status: 400 }
      );
    }

    const { credential: credentialInfo } = verification.registrationInfo;

    // Store the passkey in database
    const { data: passkey, error: insertError } = await supabase
      .from('passkeys')
      .insert({
        user_id: user.id,
        credential_id: Buffer.from(credentialInfo.id).toString('base64url'),
        public_key: Buffer.from(credentialInfo.publicKey).toString('base64url'),
        counter: credentialInfo.counter,
        device_name: deviceName || 'パスキー',
        transports: credential.response?.transports || [],
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to store passkey:', insertError);
      return NextResponse.json(
        { error: 'パスキーの保存に失敗しました' },
        { status: 500 }
      );
    }

    // Clear the challenge from user metadata
    await supabase.auth.updateUser({
      data: {
        passkey_challenge: null,
        passkey_challenge_expires: null,
      },
    });

    return NextResponse.json({
      success: true,
      passkey: {
        id: passkey.id,
        device_name: passkey.device_name,
        created_at: passkey.created_at,
      },
    });
  } catch (error) {
    console.error('Register verify error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'パスキーの検証に失敗しました',
      },
      { status: 500 }
    );
  }
}
