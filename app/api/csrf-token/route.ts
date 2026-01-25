import { NextRequest, NextResponse } from 'next/server';
import { createCsrfSecretAndToken, CSRF_SECRET_COOKIE_NAME } from '@/lib/utils/csrf';

export async function GET(req: NextRequest) {
  // 新しいCSRF SecretとTokenを生成
  const { secret, token } = createCsrfSecretAndToken();
  // httpOnly, secure属性付きでCookieにセット
  const res = NextResponse.json({ csrfToken: token });
  res.cookies.set(CSRF_SECRET_COOKIE_NAME, secret, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60, // 1時間
  });
  return res;
}
