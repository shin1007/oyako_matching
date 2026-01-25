import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, recordRateLimitAction } from '@/lib/rate-limit';

/**
 * POST /api/auth/reset-password/request
 * 
 * パスワードリセットリンクをメールで送信
 * 
 * Request:
 * {
 *   "email": "user@example.com"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "パスワードリセットリンクをメールアドレスに送信しました"
 * }
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    // バリデーション
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'メールアドレスが必要です' },
        { status: 400 }
      );
    }

    // メールアドレスの形式チェック
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'メールアドレスの形式が正しくありません' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // レートリミット（1時間に3回まで）
    const userIp = request.headers.get('x-forwarded-for') || request.ip || 'unknown';
    const rateLimitResult = await checkRateLimit(
      supabase,
      userIp,
      'reset_password_request',
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

    // パスワードリセットメールを送信
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password-confirm`,
    });

    // レートリミットアクション記録
    await recordRateLimitAction(supabase, userIp, 'reset_password_request');

    // 監査ログ記録
    const { logAuditEventServer } = await import('@/lib/utils/auditLoggerServer');
    await logAuditEventServer({
      event_type: 'reset_password_request',
      target_table: 'users',
      target_id: email,
      description: 'パスワードリセットリクエスト',
      ip_address: request.ip ?? null,
      user_agent: request.headers.get('user-agent') ?? null,
    });

    if (error) {
      console.error('Password reset error:', error);
      // セキュリティ上、ユーザーが存在するかどうかを明かさない
      return NextResponse.json(
        { 
          success: true, 
          message: 'パスワードリセットリンクをメールアドレスに送信しました。メールボックスを確認してください。' 
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { 
        success: true, 
        message: 'パスワードリセットリンクをメールアドレスに送信しました。メールボックスを確認してください。' 
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error('Unexpected error in reset-password/request:', err);
    return NextResponse.json(
      { error: 'エラーが発生しました' },
      { status: 500 }
    );
  }
}
