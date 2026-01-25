
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { getCsrfSecretFromCookie, getCsrfTokenFromHeader, verifyCsrfToken } from '@/lib/utils/csrf';

import { writeAuditLog } from '@/lib/audit-log';

export async function POST(request: NextRequest) {
  // CSRFトークン検証
  const secret = getCsrfSecretFromCookie(request);
  const token = getCsrfTokenFromHeader(request);
  if (!verifyCsrfToken(secret, token)) {
    await writeAuditLog({
      userId: null,
      eventType: 'logout',
      detail: 'CSRF token invalid',
      ip: request.headers.get('x-forwarded-for') || 'unknown',
    });
    return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
  }
  try {
    const supabase = await createClient();
    
    // Sign out the user
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('[SignOut] Error:', error);
      await writeAuditLog({
        userId: user?.id ?? null,
        eventType: 'logout',
        detail: 'signout failed',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        meta: { error: error.message },
      });
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    await writeAuditLog({
      userId: user?.id ?? null,
      eventType: 'logout',
      detail: 'signout success',
      ip: request.headers.get('x-forwarded-for') || 'unknown',
    });

    // Create response with cleared auth cookie
    const response = NextResponse.json(
      { message: 'サインアウトしました' },
      { status: 200 }
    );
    return response;
  } catch (error: any) {
    console.error('[SignOut] Unexpected error:', error);
    await writeAuditLog({
      userId: null,
      eventType: 'logout',
      detail: 'unexpected error',
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      meta: { error: error?.message },
    });
    return NextResponse.json(
      { error: 'サインアウトに失敗しました' },
      { status: 500 }
    );
  }
}
