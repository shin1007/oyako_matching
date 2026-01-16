import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Rate limit: 3 attempts per hour
const RATE_LIMIT_ATTEMPTS = 3;
const RATE_LIMIT_WINDOW_HOURS = 1;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    // Check if email is already verified
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('email_verified_at')
      .eq('id', user.id)
      .single();

    if (userError) {
      console.error('Error fetching user data:', userError);
      return NextResponse.json(
        { error: 'ユーザー情報の取得に失敗しました' },
        { status: 500 }
      );
    }

    if (userData?.email_verified_at) {
      return NextResponse.json(
        { error: 'メールアドレスは既に確認済みです' },
        { status: 400 }
      );
    }

    // Check rate limit - get attempts in the last hour
    const oneHourAgo = new Date(Date.now() - RATE_LIMIT_WINDOW_HOURS * 60 * 60 * 1000);
    const { data: attempts, error: attemptsError } = await supabase
      .from('email_verification_attempts')
      .select('*')
      .eq('user_id', user.id)
      .gte('attempted_at', oneHourAgo.toISOString())
      .order('attempted_at', { ascending: false });

    if (attemptsError) {
      console.error('Error checking rate limit:', attemptsError);
      return NextResponse.json(
        { error: 'レート制限の確認に失敗しました' },
        { status: 500 }
      );
    }

    if (attempts && attempts.length >= RATE_LIMIT_ATTEMPTS) {
      // Calculate when the next attempt is allowed
      const oldestAttempt = attempts[attempts.length - 1];
      const nextAllowedTime = new Date(
        new Date(oldestAttempt.attempted_at).getTime() + 
        RATE_LIMIT_WINDOW_HOURS * 60 * 60 * 1000
      );
      const waitMinutes = Math.ceil((nextAllowedTime.getTime() - Date.now()) / (60 * 1000));

      return NextResponse.json(
        { 
          error: `送信回数の上限に達しました。${waitMinutes}分後に再試行してください`,
          nextAllowedAt: nextAllowedTime.toISOString(),
          attemptsRemaining: 0
        },
        { status: 429 }
      );
    }

    // Get client info
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Record this attempt
    const { error: insertError } = await supabase
      .from('email_verification_attempts')
      .insert({
        user_id: user.id,
        attempted_at: new Date().toISOString(),
        ip_address: ip,
        user_agent: userAgent
      });

    if (insertError) {
      console.error('Error recording attempt:', insertError);
      // Continue anyway - don't block the user
    }

    // Resend verification email using Supabase Auth
    const { error: resendError } = await supabase.auth.resend({
      type: 'signup',
      email: user.email!,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_ORIGIN || 'http://localhost:3000'}/api/auth/verify-email`
      }
    });

    if (resendError) {
      console.error('Error resending verification email:', resendError);
      return NextResponse.json(
        { error: '認証メールの送信に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '認証メールを送信しました',
      attemptsRemaining: RATE_LIMIT_ATTEMPTS - (attempts?.length || 0) - 1
    });

  } catch (error) {
    console.error('Unexpected error in send-verification-email:', error);
    return NextResponse.json(
      { error: '予期しないエラーが発生しました' },
      { status: 500 }
    );
  }
}
