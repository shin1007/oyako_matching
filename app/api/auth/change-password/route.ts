
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, recordRateLimitAction } from '@/lib/rate-limit';
import { getCsrfTokenFromCookie, getCsrfTokenFromHeader, verifyCsrfToken } from '@/lib/utils/csrf';

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
  const cookieToken = getCsrfTokenFromCookie(request);
  const headerToken = getCsrfTokenFromHeader(request);
  if (!verifyCsrfToken(cookieToken, headerToken)) {
    return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
  }
  try {
    const body = await request.json();
    const { currentPassword, newPassword } = body;

    // バリデーション
    if (!currentPassword || typeof currentPassword !== 'string') {
      return NextResponse.json(
        { error: '現在のパスワードが必要です' },
        { status: 400 }
      );
    }

    if (!newPassword || typeof newPassword !== 'string') {
      return NextResponse.json(
        { error: '新しいパスワードが必要です' },
        { status: 400 }
      );
    }

    // パスワードの強度チェック（最小8文字）
    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'パスワードは8文字以上である必要があります' },
        { status: 400 }
      );
    }

    // 現在のパスワードと新しいパスワードが同じでないか確認
    if (currentPassword === newPassword) {
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
      return NextResponse.json(
        { error: rateLimitResult.message || 'リクエストが多すぎます。しばらくしてから再度お試しください。', retryAfter: rateLimitResult.retryAfter?.toISOString() },
        { status: 429 }
      );
    }

    // 現在のユーザーを取得
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'ユーザー情報を取得できません。もう一度ログインしてください。' },
        { status: 401 }
      );
    }

    // ユーザーのメールアドレスを取得
    if (!user.email) {
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
      return NextResponse.json(
        { error: 'パスワードの更新に失敗しました' },
        { status: 400 }
      );
    }

    // レートリミットアクション記録
    await recordRateLimitAction(supabase, userIp, 'change_password');

    return NextResponse.json(
      { 
        success: true, 
        message: 'パスワードが正常に変更されました' 
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error('Unexpected error in change-password:', err);
    return NextResponse.json(
      { error: 'エラーが発生しました' },
      { status: 500 }
    );
  }
}
