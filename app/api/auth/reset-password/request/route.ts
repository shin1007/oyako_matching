import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

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

    // パスワードリセットメールを送信
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password-confirm`,
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
