import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

import { writeAuditLog } from '@/lib/audit-log';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: matchId } = await params;

    const { data: { user } } = await supabase.auth.getUser();


    if (!user) {
      await writeAuditLog({
        userId: null,
        eventType: 'message_view',
        detail: 'Unauthorized',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // このユーザーが受信者である未読メッセージを既読にする
    const { error } = await supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('match_id', matchId)
      .neq('sender_id', user.id)
      .is('read_at', null);


    if (error) {
      await writeAuditLog({
        userId: user.id,
        eventType: 'message_view',
        detail: 'Failed to mark as read',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        meta: { error: error.message },
      });
      throw error;
    }

    await writeAuditLog({
      userId: user.id,
      eventType: 'message_view',
      detail: 'Marked messages as read',
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      meta: { matchId },
    });
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('Failed to mark messages as read:', error);
    await writeAuditLog({
      userId: null,
      eventType: 'message_view',
      detail: 'Unexpected error',
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      meta: { error: error?.message },
    });
    return NextResponse.json(
      { error: error.message || 'Failed to mark messages as read' },
      { status: 500 }
    );
  }
}
