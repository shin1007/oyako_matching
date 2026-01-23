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

  // blocked_byが自分のIDのときのみ解除可能
  const { data: matchRecords, error: fetchError } = await supabase
    .from('matches')
    .select('id, blocked_by')
    .or(
      `and(parent_id.eq.${user.id},child_id.eq.${targetUserId}),and(parent_id.eq.${targetUserId},child_id.eq.${user.id})`
    );

  if (fetchError) {
    console.error('ブロック解除レコード取得エラー:', fetchError);
    return NextResponse.json({ error: 'ブロック解除レコード取得に失敗しました', details: fetchError.message || fetchError }, { status: 500 });
  }

  // 自分がblocked_byでない場合は解除不可
  const canUnblock = matchRecords?.some((rec: any) => rec.blocked_by === user.id);
  if (!canUnblock) {
    return NextResponse.json({ error: 'ブロックを解除できるのはブロックした本人のみです' }, { status: 403 });
  }

  // 解除処理（blocked_byもnullに戻す）
  const { error } = await supabase
    .from('matches')
    .update({ status: 'accepted', blocked_by: null })
    .or(
      `and(parent_id.eq.${user.id},child_id.eq.${targetUserId}),and(parent_id.eq.${targetUserId},child_id.eq.${user.id})`
    )
    .eq('blocked_by', user.id)
    .select();

  if (error) {
    console.error('ブロック解除処理エラー:', error);
    return NextResponse.json({ error: 'ブロック解除処理に失敗しました', details: error.message || error }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
