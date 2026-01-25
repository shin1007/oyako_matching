// 監査ログ用: NextRequestからIPアドレス・UserAgentを抽出する共通ユーティリティ
// usage: import { extractAuditMeta } from '@/lib/utils/extractAuditMeta';
import type { NextRequest } from 'next/server';

export function extractAuditMeta(request?: NextRequest | { headers?: any; ip?: string | null }): {
  ip_address: string | null;
  user_agent: string | null;
} {
  if (!request) return { ip_address: null, user_agent: null };
  // x-forwarded-for優先、なければrequest.ip
  const ip = request.headers?.get?.('x-forwarded-for') || request.headers?.get?.('x-real-ip') || (request as any).ip || null;
  const userAgent = request.headers?.get?.('user-agent') || null;
  return { ip_address: ip, user_agent: userAgent };
}
