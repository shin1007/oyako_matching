import { NextRequest, NextResponse } from 'next/server';

import { getCsrfSecretFromCookie, getCsrfTokenFromHeader, verifyCsrfToken } from '@/lib/utils/csrf';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  // CSRFトークン検証
  const secret = getCsrfSecretFromCookie(req);
  const token = getCsrfTokenFromHeader(req);
  if (!verifyCsrfToken(secret, token)) {
    return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
  }
  const supabase = await createClient();
  const { userId, role } = await req.json();
  if (!userId || !role) {
    return NextResponse.json({ error: 'userIdとroleは必須です' }, { status: 400 });
  }
  // profilesテーブルに初期データをINSERT
  const { error } = await supabase
    .from('profiles')
    .insert({ user_id: userId, role });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
