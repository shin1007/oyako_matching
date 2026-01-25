import { randomBytes, timingSafeEqual } from 'crypto';
import { NextRequest } from 'next/server';

const CSRF_TOKEN_LENGTH = 32;
const CSRF_COOKIE_NAME = 'csrf_token';

// トークン生成
export function generateCsrfToken(): string {
  return randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
}

// CookieからCSRFトークンを取得
export function getCsrfTokenFromCookie(req: NextRequest): string | null {
  const cookie = req.cookies.get(CSRF_COOKIE_NAME);
  return cookie?.value || null;
}

// リクエストヘッダーからCSRFトークンを取得
export function getCsrfTokenFromHeader(req: NextRequest): string | null {
  return req.headers.get('x-csrf-token');
}

// トークン検証
export function verifyCsrfToken(cookieToken: string | null, headerToken: string | null): boolean {
  if (!cookieToken || !headerToken) return false;
  try {
    return timingSafeEqual(Buffer.from(cookieToken), Buffer.from(headerToken));
  } catch {
    return false;
  }
}

export { CSRF_COOKIE_NAME };
