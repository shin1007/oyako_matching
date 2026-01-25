import { NextRequest, NextResponse } from 'next/server';
import { createCsrfSecretAndToken, CSRF_SECRET_COOKIE_NAME } from '@/lib/utils/csrf';

export async function GET(req: NextRequest) {
  // 新しいCSRF SecretとTokenを発行
  const { secret, token } = createCsrfSecretAndToken();

  // セキュアなCookieとしてsecretを保存（HttpOnly, SameSite, Secure推奨）
  const response = NextResponse.json({ csrfToken: token });
  response.cookies.set(CSRF_SECRET_COOKIE_NAME, secret, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60, // 1時間
  });
  return response;
}
