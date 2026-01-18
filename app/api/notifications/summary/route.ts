import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ユーザーの role を取得
    const { data: userData } = await admin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 受信したマッチング申請を取得
    let pendingMatchesCount = 0;

    if (userData.role === 'parent') {
      // 子から申請を受け取った親の場合
      const { data: matches } = await admin
        .from('matches')
        .select('id')
        .eq('status', 'pending')
        .eq('child_id', user.id);
      pendingMatchesCount = matches?.length || 0;
    } else {
      // 親から申請を受け取った子の場合
      const { data: matches } = await admin
        .from('matches')
        .select('id')
        .eq('status', 'pending')
        .eq('parent_id', user.id)
        .neq('child_id', user.id);
      pendingMatchesCount = matches?.length || 0;
    }

    // 未読メッセージ数を取得
    const { data: unreadMessages } = await admin
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .neq('sender_id', user.id)
      .is('read_at', null);

    const unreadCount = unreadMessages?.length || 0;

    return NextResponse.json(
      {
        pending_matches_count: pendingMatchesCount,
        unread_messages_count: unreadCount,
        total_notifications: pendingMatchesCount + unreadCount,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Failed to fetch notifications:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}
