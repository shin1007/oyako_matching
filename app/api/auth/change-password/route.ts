
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, recordRateLimitAction } from '@/lib/rate-limit';
import { getCsrfSecretFromCookie, getCsrfTokenFromHeader, verifyCsrfToken } from '@/lib/utils/csrf';

import { writeAuditLog } from '@/lib/audit-log';

/**
 * POST /api/auth/change-password
 * 
 * 既存パスワード確認後、新しいパスワードに変更
 * 認証済みユーザーのみが使用可能
 * 
 * Request:
 * {
 *   "currentPassword": "current_password",
 *   "newPassword": "new_password"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "パスワードが正常に変更されました"
 * }
 */

export async function POST(request: NextRequest) {
  // CSRFトークン検証
  const secret = getCsrfSecretFromCookie(request);
  const token = getCsrfTokenFromHeader(request);
  if (!verifyCsrfToken(secret, token)) {
    // 監査ログ: CSRFトークン不正
    await writeAuditLog({
      userId: null,
      eventType: 'change_password',
      detail: 'CSRF token invalid',
      ip: request.headers.get('x-forwarded-for') || 'unknown',
    });
    return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
  }
  try {
    const body = await request.json();
    const { currentPassword, newPassword } = body;

    // バリデーション

    if (!currentPassword || typeof currentPassword !== 'string') {
      await writeAuditLog({
        userId: null,
        eventType: 'change_password',
        detail: 'currentPassword missing',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
      });
      return NextResponse.json(
        { error: '現在のパスワードが必要です' },
        { status: 400 }
      );
    }


    if (!newPassword || typeof newPassword !== 'string') {
      await writeAuditLog({
        userId: null,
        eventType: 'change_password',
        detail: 'newPassword missing',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
      });
      return NextResponse.json(
        { error: '新しいパスワードが必要です' },
        { status: 400 }
      );
    }

    // パスワードの強度チェック（最小8文字）

    if (newPassword.length < 8) {
      await writeAuditLog({
        userId: null,
        eventType: 'change_password',
        detail: 'newPassword too short',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
      });
      return NextResponse.json(
        { error: 'パスワードは8文字以上である必要があります' },
        { status: 400 }
      );
    }

    // 現在のパスワードと新しいパスワードが同じでないか確認

    if (currentPassword === newPassword) {
      await writeAuditLog({
        userId: null,
        eventType: 'change_password',
        detail: 'newPassword same as currentPassword',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
      });
      return NextResponse.json(
        { error: '新しいパスワードは現在のパスワードと異なる必要があります' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // レートリミット（1時間に5回まで）
    const userIp = request.headers.get('x-forwarded-for') || 'unknown';
    const rateLimitResult = await checkRateLimit(
      supabase,
      userIp,
      'change_password',
      [
        { windowSeconds: 3600, maxActions: 5 }
      ]
    );

    if (!rateLimitResult.allowed) {
      await writeAuditLog({
        userId: null,
        eventType: 'change_password',
        detail: 'rate limit exceeded',
        ip: userIp,
      });
      return NextResponse.json(
        { error: rateLimitResult.message || 'リクエストが多すぎます。しばらくしてから再度お試しください。', retryAfter: rateLimitResult.retryAfter?.toISOString() },
        { status: 429 }
      );
    }

    // 現在のユーザーを取得
    const { data: { user }, error: userError } = await supabase.auth.getUser();


    if (userError || !user) {
      await writeAuditLog({
        userId: null,
        eventType: 'change_password',
        detail: 'user not found',
        ip: userIp,
      });
      return NextResponse.json(
        { error: 'ユーザー情報を取得できません。もう一度ログインしてください。' },
        { status: 401 }
      );
    }

    // ユーザーのメールアドレスを取得

    if (!user.email) {
      await writeAuditLog({
        userId: user.id,
        eventType: 'change_password',
        detail: 'user email not found',
        ip: userIp,
      });
      return NextResponse.json(
        { error: 'メールアドレスが見つかりません' },
        { status: 400 }
      );
    }

    // 現在のパスワードで認証を試みる
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });


    if (signInError) {
      console.error('Current password verification error:', signInError);
      await writeAuditLog({
        userId: user.id,
        eventType: 'change_password',
        detail: 'current password incorrect',
        ip: userIp,
        meta: { error: signInError.message },
      });
      return NextResponse.json(
        { error: '現在のパスワードが正しくありません' },
        { status: 401 }
      );
    }

    // 新しいパスワードに更新
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });


    if (updateError) {
      console.error('Password update error:', updateError);
      await writeAuditLog({
        userId: user.id,
        eventType: 'change_password',
        detail: 'password update failed',
        ip: userIp,
        meta: { error: updateError.message },
      });
      return NextResponse.json(
        { error: 'パスワードの更新に失敗しました' },
        { status: 400 }
      );
    }

    // レートリミットアクション記録
    await recordRateLimitAction(supabase, userIp, 'change_password');

    // 監査ログ: パスワード変更成功
    await writeAuditLog({
      userId: user.id,
      eventType: 'change_password',
      detail: 'password changed successfully',
      ip: userIp,
    });

    return NextResponse.json(
      { 
        success: true, 
        message: 'パスワードが正常に変更されました' 
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error('Unexpected error in change-password:', err);
    await writeAuditLog({
      userId: null,
      eventType: 'change_password',
      detail: 'unexpected error',
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      meta: { error: err?.message },
    });
    return NextResponse.json(
      { error: 'エラーが発生しました' },
      { status: 500 }
    );
  }
}
