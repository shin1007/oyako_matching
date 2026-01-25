import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const supabase = await createClient();
  const { targetUserId } = await req.json();

  // 認証チェック
  const { data, error: authError } = await supabase.auth.getUser();
  const user = data?.user;
  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  // ブロック対象レコードのparent_id/child_id/blocked_byを事前にログ出力
  const { data: matchRecords, error: fetchError } = await supabase
    .from('matches')
    .select('id, parent_id, child_id, blocked_by')
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
    return NextResponse.json({ error: 'ブロック処理に失敗しました', details: error.message || error }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
