import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: matchId } = await params;
    const { content } = await request.json();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: 'Message content is required' },
        { status: 400 }
      );
    }

    // マッチ情報を取得して検証
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('*')
      .eq('id', matchId)
      .single();

    if (matchError || !match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    // ユーザーがこのマッチに関与しているか確認
    if (match.parent_id !== user.id && match.child_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // マッチが承認されているか確認
    if (match.status !== 'accepted') {
      return NextResponse.json(
        { error: 'Match is not accepted yet' },
        { status: 400 }
      );
    }

    // メッセージを作成
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert({
        match_id: matchId,
        sender_id: user.id,
        content: content.trim(),
      })
      .select()
      .single();

    if (messageError) {
      throw messageError;
    }

    // 監査ログ記録
    const { logAuditEventServer } = await import('@/lib/utils/auditLoggerServer');
    const { extractAuditMeta } = await import('@/lib/utils/extractAuditMeta');
    await logAuditEventServer({
      user_id: user.id,
      event_type: 'message_send',
      target_table: 'messages',
      target_id: message.id,
      description: `Message sent: ${content.trim()}`,
      ...extractAuditMeta(request),
      event_timestamp: new Date().toISOString(),
    });
    return NextResponse.json({ message }, { status: 201 });
  } catch (error: any) {
    console.error('Failed to send message:', error);
    const { logAuditEventServer } = await import('@/lib/utils/auditLoggerServer');
    const { extractAuditMeta } = await import('@/lib/utils/extractAuditMeta');
    await logAuditEventServer({
      event_type: 'message_send_failed',
      description: `メッセージ送信失敗: ${error instanceof Error ? error.message : String(error)}`,
      ...extractAuditMeta(request),
    });
    return NextResponse.json(
      { error: error.message || 'Failed to send message' },
      { status: 500 }
    );
  }
}
