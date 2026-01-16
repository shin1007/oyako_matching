import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generatePasskeyRegistrationOptions } from '@/lib/webauthn/server';

/**
 * POST /api/auth/passkey/register-challenge
 * Generate registration options for a new passkey
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

    // Get user's profile for display name
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', user.id)
      .single();

    // Get existing passkeys to exclude from registration
    const { data: existingPasskeys } = await supabase
      .from('passkeys')
      .select('credential_id, transports')
      .eq('user_id', user.id);

    // Generate registration options
    const options = await generatePasskeyRegistrationOptions({
      userId: user.id,
      userName: user.email || user.id,
      userDisplayName: profile?.full_name || user.email || 'ユーザー',
      excludeCredentials: existingPasskeys?.map((pk) => ({
        id: '',
        user_id: user.id,
        credential_id: pk.credential_id,
        public_key: '',
        counter: 0,
        transports: pk.transports || [],
        created_at: '',
      })),
    });

    // Store challenge in session for verification
    // Using a simple in-memory store for now, consider Redis for production
    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        passkey_challenge: options.challenge,
        passkey_challenge_expires: Date.now() + 5 * 60 * 1000, // 5 minutes
      },
    });

    if (updateError) {
      console.error('Failed to store challenge:', updateError);
    }

    return NextResponse.json({ options });
  } catch (error) {
    console.error('Register challenge error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : '登録チャレンジの生成に失敗しました',
      },
      { status: 500 }
    );
  }
}
