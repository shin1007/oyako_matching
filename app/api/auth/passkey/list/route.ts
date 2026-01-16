import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/auth/passkey/list
 * Get list of user's registered passkeys
 */
export async function GET() {
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

    // Get user's passkeys (without sensitive data)
    const { data: passkeys, error: passkeyError } = await supabase
      .from('passkeys')
      .select('id, device_name, created_at, last_used_at, transports')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (passkeyError) {
      console.error('Failed to fetch passkeys:', passkeyError);
      return NextResponse.json(
        { error: 'パスキーの取得に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({ passkeys: passkeys || [] });
  } catch (error) {
    console.error('List passkeys error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'パスキーの取得に失敗しました',
      },
      { status: 500 }
    );
  }
}
