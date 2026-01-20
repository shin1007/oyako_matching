import { NextRequest, NextResponse } from 'next/server';
import { logAuditEventServer } from '@/lib/utils/auditLoggerServer';

/**
 * POST /api/log-audit
 * 監査ログをサーバーサイドで記録するAPI
 * body: { user_id, event_type, target_table, target_id, description }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const ip = request.headers.get('x-forwarded-for') || request.ip || null;
    const userAgent = request.headers.get('user-agent') || null;

    // サービスロールでSupabase管理クライアントを利用
    await logAuditEventServer({
      user_id: body.user_id,
      event_type: body.event_type,
      target_table: body.target_table,
      target_id: body.target_id,
      description: body.description,
      ip_address: ip,
      user_agent: userAgent,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('監査ログAPIエラー', error);
    return NextResponse.json({ error: '監査ログ記録に失敗しました' }, { status: 500 });
  }
}
