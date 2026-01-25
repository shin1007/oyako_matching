import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

import { writeAuditLog } from '@/lib/audit-log';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();

    const { data: { user } } = await supabase.auth.getUser();


    if (!user) {
      await writeAuditLog({
        userId: null,
        eventType: 'notification_view',
        detail: 'Unauthorized',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ユーザーの role を取得
    const { data: userData } = await admin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();


    if (!userData) {
      await writeAuditLog({
        userId: user.id,
        eventType: 'notification_view',
        detail: 'User not found',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
      });
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 受信したマッチング申請を取得
    // 親の場合: child_id === user.id で status === 'pending'
    // 子の場合: parent_id === user.id で status === 'pending'
    let receivedMatches: any[] = [];

    if (userData.role === 'parent') {
      // 子から申請を受け取った親の場合
      const { data: matches } = await admin
        .from('matches')
        .select('id')
        .eq('status', 'pending')
        .eq('child_id', user.id);
      receivedMatches = matches || [];
    } else {
      // 親から申請を受け取った子の場合
      const { data: matches } = await admin
        .from('matches')
        .select('id')
        .eq('status', 'pending')
        .eq('parent_id', user.id)
        .neq('child_id', user.id);
      receivedMatches = matches || [];
    }

    await writeAuditLog({
      userId: user.id,
      eventType: 'notification_view',
      detail: 'Fetched pending matches',
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      meta: { pending_count: receivedMatches.length || 0 },
    });
    return NextResponse.json(
      {
        pending_count: receivedMatches.length || 0,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Failed to fetch notifications:', error);
    await writeAuditLog({
      userId: null,
      eventType: 'notification_view',
      detail: 'Unexpected error',
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      meta: { error: error?.message },
    });
    return NextResponse.json(
      { error: error.message || 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}
