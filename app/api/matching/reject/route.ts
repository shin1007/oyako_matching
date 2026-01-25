import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCsrfSecretFromCookie, getCsrfTokenFromHeader, verifyCsrfToken } from '@/lib/utils/csrf';

import { writeAuditLog } from '@/lib/audit-log';
export async function POST(req: NextRequest) {
  // CSRFトークン検証
  const secret = getCsrfSecretFromCookie(req);
  const token = getCsrfTokenFromHeader(req);
  if (!verifyCsrfToken(secret, token)) {
    await writeAuditLog({
      userId: null,
      eventType: 'matching_cancel',
      detail: 'CSRF token invalid',
      ip: req.headers.get('x-forwarded-for') || 'unknown',
    });
    return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    await writeAuditLog({
      userId: null,
      eventType: 'matching_cancel',
      detail: 'Unauthorized',
      ip: req.headers.get('x-forwarded-for') || 'unknown',
    });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { matchId } = await req.json();
  if (!matchId) {
    await writeAuditLog({
      userId: user.id,
      eventType: 'matching_cancel',
      detail: 'matchId is required',
      ip: req.headers.get('x-forwarded-for') || 'unknown',
    });
    return NextResponse.json({ error: 'matchId is required' }, { status: 400 });
  }
  // matchesテーブルで該当レコードを検索
  const { data: match, error: fetchError } = await supabase
    .from('matches')
    .select('*')
    .eq('id', matchId)
    .eq('status', 'pending')
    .single();
  if (fetchError || !match) {
    await writeAuditLog({
      userId: user.id,
      eventType: 'matching_cancel',
      detail: 'No pending match found',
      ip: req.headers.get('x-forwarded-for') || 'unknown',
      meta: { matchId },
    });
    return NextResponse.json({ error: 'No pending match found' }, { status: 404 });
  }
  // statusをrejectedに更新
  const { error: updateError } = await supabase
    .from('matches')
    .update({ status: 'rejected' })
    .eq('id', match.id);
  if (updateError) {
    await writeAuditLog({
      userId: user.id,
      eventType: 'matching_cancel',
      detail: 'Failed to reject match',
      ip: req.headers.get('x-forwarded-for') || 'unknown',
      meta: { matchId },
    });
    return NextResponse.json({ error: 'Failed to reject match' }, { status: 500 });
  }
  await writeAuditLog({
    userId: user.id,
    eventType: 'matching_cancel',
    detail: 'Match rejected',
    ip: req.headers.get('x-forwarded-for') || 'unknown',
    meta: { matchId },
  });
  return NextResponse.json({ success: true });
}
