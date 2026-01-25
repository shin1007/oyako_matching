
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
      eventType: 'matching_create',
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
      eventType: 'matching_create',
      detail: 'Unauthorized',
      ip: req.headers.get('x-forwarded-for') || 'unknown',
    });
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  // blocked_byが自分のIDのときのみ解除可能
  const { data: matchRecords, error: fetchError } = await supabase
    .from('matches')
    .select('id, blocked_by, previous_status')
    .or(
      `and(parent_id.eq.${user.id},child_id.eq.${targetUserId}),and(parent_id.eq.${targetUserId},child_id.eq.${user.id})`
    );

  if (fetchError) {
    console.error('ブロック解除レコード取得エラー:', fetchError);
    await writeAuditLog({
      userId: user.id,
      eventType: 'matching_create',
      detail: 'Failed to fetch unblock record',
      ip: req.headers.get('x-forwarded-for') || 'unknown',
      meta: { targetUserId },
    });
    return NextResponse.json({ error: 'ブロック解除レコード取得に失敗しました', details: fetchError.message || fetchError }, { status: 500 });
  }

  // 自分がblocked_byでない場合は解除不可
  const canUnblock = matchRecords?.some((rec: any) => rec.blocked_by === user.id);
  if (!canUnblock) {
    await writeAuditLog({
      userId: user.id,
      eventType: 'matching_create',
      detail: 'Unblock not permitted',
      ip: req.headers.get('x-forwarded-for') || 'unknown',
      meta: { targetUserId },
    });
    return NextResponse.json({ error: 'ブロックを解除できるのはブロックした本人のみです' }, { status: 403 });
  }


  // 解除処理（previous_statusをstatusに戻し、previous_statusをnullに、blocked_byもnullに）
  let newStatus = 'accepted';
  if (matchRecords && matchRecords.length > 0 && matchRecords[0].previous_status) {
    newStatus = matchRecords[0].previous_status;
  }
  const { error } = await supabase
    .from('matches')
    .update({ status: newStatus, blocked_by: null, previous_status: null })
    .or(
      `and(parent_id.eq.${user.id},child_id.eq.${targetUserId}),and(parent_id.eq.${targetUserId},child_id.eq.${user.id})`
    )
    .eq('blocked_by', user.id)
    .select();

  if (error) {
    console.error('ブロック解除処理エラー:', error);
    await writeAuditLog({
      userId: user.id,
      eventType: 'matching_create',
      detail: 'Unblock failed',
      ip: req.headers.get('x-forwarded-for') || 'unknown',
      meta: { targetUserId },
    });
    return NextResponse.json({ error: 'ブロック解除処理に失敗しました', details: error.message || error }, { status: 500 });
  }

  await writeAuditLog({
    userId: user.id,
    eventType: 'matching_create',
    detail: 'User unblocked',
    ip: req.headers.get('x-forwarded-for') || 'unknown',
    meta: { targetUserId },
  });

  return NextResponse.json({ success: true });
}
