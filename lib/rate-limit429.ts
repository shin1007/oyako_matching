import { NextResponse } from 'next/server';

/**
 * レートリミット超過時の統一レスポンス
 * @param message エラーメッセージ
 * @param retryAfter 再試行可能時刻（ISO文字列）
 */
export function rateLimit429(message: string = 'Too many requests', retryAfter?: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (retryAfter) {
    headers['Retry-After'] = retryAfter;
  }
  return new NextResponse(
    JSON.stringify({ error: message, retryAfter }),
    { status: 429, headers }
  );
}
