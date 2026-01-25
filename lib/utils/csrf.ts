
import csrf from 'csrf';
import { NextRequest } from 'next/server';

const tokens = new csrf();
export const CSRF_SECRET_COOKIE_NAME = 'csrfSecret';

// CookieからCSRF Secretを取得
export function getCsrfSecretFromCookie(req: NextRequest): string | null {
  const cookie = req.cookies.get(CSRF_SECRET_COOKIE_NAME);
  return cookie?.value || null;
}

// リクエストヘッダーからCSRFトークンを取得
export function getCsrfTokenFromHeader(req: NextRequest): string | null {
  return req.headers.get('x-csrf-token');
}

// トークン検証
export function verifyCsrfToken(secret: string | null, token: string | null): boolean {
  if (!secret || !token) return false;
  try {
    return tokens.verify(secret, token);
  } catch {
    return false;
  }
}

// 新しいCSRF SecretとTokenを生成
export function createCsrfSecretAndToken(): { secret: string; token: string } {
  const secret = tokens.secretSync();
  const token = tokens.create(secret);
  return { secret, token };
}
