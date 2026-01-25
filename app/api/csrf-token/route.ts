import { NextRequest, NextResponse } from 'next/server';
import { generateCsrfToken, CSRF_COOKIE_NAME } from '@/lib/utils/csrf';

export async function GET(req: NextRequest) {
  // 新しいCSRFトークンを生成
  const token = generateCsrfToken();
  // httpOnly, secure属性付きでCookieにセット
  const res = NextResponse.json({ csrfToken: token });
  res.cookies.set(CSRF_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60, // 1時間
  });
  return res;
}
