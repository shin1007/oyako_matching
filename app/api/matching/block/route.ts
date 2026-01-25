
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
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
  const { targetUserId } = await req.json();

  // 認証チェック
  const { data, error: authError } = await supabase.auth.getUser();
  const user = data?.user;
  if (!user) {
    await writeAuditLog({
      userId: null,
      eventType: 'matching_cancel',
      detail: 'Unauthorized',
      ip: req.headers.get('x-forwarded-for') || 'unknown',
    });
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  // ブロック対象レコードのparent_id/child_id/blocked_byを事前にログ出力
  const { data: matchRecords, error: fetchError } = await supabase
    .from('matches')
    .select('id, parent_id, child_id, blocked_by, status')
    .or(
      `and(parent_id.eq.${user.id},child_id.eq.${targetUserId}),and(parent_id.eq.${targetUserId},child_id.eq.${user.id})`
    );
  if (fetchError) {
    console.error('matches取得エラー:', fetchError);
  } else {
    console.log('ブロック対象matches:', matchRecords);
  }

  // 既存のstatusを保存し、previous_statusに格納してからblockedに
  let currentStatus = null;
  if (matchRecords && matchRecords.length > 0) {
    currentStatus = matchRecords[0].status;
  }
  const { error } = await supabase
    .from('matches')
    .update({ status: 'blocked', blocked_by: user.id, previous_status: currentStatus })
    .or(
      `and(parent_id.eq.${user.id},child_id.eq.${targetUserId}),and(parent_id.eq.${targetUserId},child_id.eq.${user.id})`
    )
    .select();

  if (error) {
    console.error('ブロック処理エラー:', error);
    await writeAuditLog({
      userId: user.id,
      eventType: 'matching_cancel',
      detail: 'Block failed',
      ip: req.headers.get('x-forwarded-for') || 'unknown',
      meta: { targetUserId },
    });
    return NextResponse.json({ error: 'ブロック処理に失敗しました', details: error.message || error }, { status: 500 });
  }

  await writeAuditLog({
    userId: user.id,
    eventType: 'matching_cancel',
    detail: 'User blocked',
    ip: req.headers.get('x-forwarded-for') || 'unknown',
    meta: { targetUserId },
  });

  return NextResponse.json({ success: true });
}
