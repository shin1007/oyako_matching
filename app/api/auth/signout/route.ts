
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { getCsrfSecretFromCookie, getCsrfTokenFromHeader, verifyCsrfToken } from '@/lib/utils/csrf';

export async function POST(request: NextRequest) {
  // CSRFトークン検証
  const secret = getCsrfSecretFromCookie(request);
  const token = getCsrfTokenFromHeader(request);
  if (!verifyCsrfToken(secret, token)) {
    return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
  }
  try {
    const supabase = await createClient();
    
    // Sign out the user
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('[SignOut] Error:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    // Create response with cleared auth cookie
    const response = NextResponse.json(
      { message: 'サインアウトしました' },
      { status: 200 }
    );
    
    return response;
  } catch (error) {
    console.error('[SignOut] Unexpected error:', error);
    return NextResponse.json(
      { error: 'サインアウトに失敗しました' },
      { status: 500 }
    );
  }
}
