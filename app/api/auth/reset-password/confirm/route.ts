import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, recordRateLimitAction } from '@/lib/rate-limit';

/**
 * POST /api/auth/reset-password/confirm
 * 
 * パスワードリセットトークンを使用して新しいパスワードを設定
 * 
 * Request:
 * {
 *   "code": "reset_token_from_email",
 *   "password": "new_password"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "パスワードが正常にリセットされました"
 * }
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, password } = body;

    // バリデーション
    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { error: 'リセットコードが無効です' },
        { status: 400 }
      );
    }

    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { error: 'パスワードが必要です' },
        { status: 400 }
      );
    }

    // パスワードの強度チェック（最小8文字）
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'パスワードは8文字以上である必要があります' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // レートリミット（1時間に3回まで）
    const userIp = request.headers.get('x-forwarded-for') || request.ip || 'unknown';
    const rateLimitResult = await checkRateLimit(
      supabase,
      userIp,
      'reset_password_confirm',
      [
        { windowSeconds: 3600, maxActions: 3 }
      ]
    );
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: rateLimitResult.message || 'リクエストが多すぎます。しばらくしてから再度お試しください。', retryAfter: rateLimitResult.retryAfter?.toISOString() },
        { status: 429 }
      );
    }

    // リセットコードでセッションを取得
    const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);

    if (sessionError || !sessionData.session) {
      console.error('Session exchange error:', sessionError);
      return NextResponse.json(
        { error: 'リセットリンクが無効または期限切れです' },
        { status: 400 }
      );
    }

    // パスワードを更新
    const { error: updateError } = await supabase.auth.updateUser({
      password: password,
    });

    if (updateError) {
      console.error('Password update error:', updateError);
      return NextResponse.json(
        { error: 'パスワードの更新に失敗しました' },
        { status: 400 }
      );
    }

    // レートリミットアクション記録
    await recordRateLimitAction(supabase, userIp, 'reset_password_confirm');

    // 監査ログ記録
    // サーバーサイドなので直接logAuditEventServerを使う
    const { logAuditEventServer } = await import('@/lib/utils/auditLoggerServer');
    await logAuditEventServer({
      user_id: sessionData.user?.id ?? null,
      event_type: 'reset_password',
      target_table: 'users',
      target_id: sessionData.user?.id ?? null,
      description: 'パスワードリセット成功',
      ip_address: request.ip ?? null,
      user_agent: request.headers.get('user-agent') ?? null,
    });

    return NextResponse.json(
      { 
        success: true, 
        message: 'パスワードが正常にリセットされました。ログインしてください。' 
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error('Unexpected error in reset-password/confirm:', err);
    return NextResponse.json(
      { error: 'エラーが発生しました' },
      { status: 500 }
    );
  }
}
