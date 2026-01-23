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

  // matchesテーブルでstatusをblockedに更新
  // parent_id/child_idの両方向で一致するレコードをブロック
  // 自分がブロックしたことを記録するためblocked_byもセット
  const { error } = await supabase
    .from('matches')
    .update({ status: 'blocked', blocked_by: user.id })
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
