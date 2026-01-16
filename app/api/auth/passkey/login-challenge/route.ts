import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generatePasskeyAuthenticationOptions } from '@/lib/webauthn/server';

/**
 * POST /api/auth/passkey/login-challenge
 * Generate authentication options for passkey login
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { email } = body;

    let allowCredentials = undefined;

    // If email is provided, get user's passkeys
    if (email) {
      // Find user by email
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single();

      if (userData) {
        // Get user's passkeys
        const { data: passkeys } = await supabase
          .from('passkeys')
          .select('credential_id, transports')
          .eq('user_id', userData.id);

        if (passkeys && passkeys.length > 0) {
          allowCredentials = passkeys.map((pk) => ({
            id: '',
            user_id: userData.id,
            credential_id: pk.credential_id,
            public_key: '',
            counter: 0,
            transports: pk.transports || [],
            created_at: '',
          }));
        }
      }
    }

    // Generate authentication options
    const options = await generatePasskeyAuthenticationOptions({
      allowCredentials,
    });

    // Store challenge temporarily (using cookies in production)
    // For now, we'll return it and have the client send it back
    const response = NextResponse.json({ options });
    
    // Set challenge in a secure, httpOnly cookie
    response.cookies.set('passkey_challenge', options.challenge, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 5 * 60, // 5 minutes
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login challenge error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'ログインチャレンジの生成に失敗しました',
      },
      { status: 500 }
    );
  }
}
