import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// Supabase OTP types (email-related only)
type EmailOtpType = 'signup' | 'magiclink' | 'recovery' | 'invite' | 'email' | 'email_change';

function isValidEmailOtpType(type: string): type is EmailOtpType {
  return ['signup', 'magiclink', 'recovery', 'invite', 'email', 'email_change'].includes(type);
}

// Ensure the public.users row exists with a normalized parent/child role
async function ensureUserRecord(admin: any, user: any) {
  const normalizedRole = user?.user_metadata?.role === 'child' ? 'child' : 'parent';
  const email = user?.email ?? '';

  try {
    const { data: existing, error: fetchError } = await admin
      .from('users')
      .select('id, role, email')
      .eq('id', user.id)
      .maybeSingle();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('[VerifyEmail] Failed to fetch existing user record:', fetchError);
      return;
    }

    if (!existing) {
      const { error: insertError } = await admin.from('users').insert({
        id: user.id,
        email,
        role: normalizedRole,
        verification_status: 'pending',
        mynumber_verified: false,
      });

      if (insertError) {
        console.error('[VerifyEmail] Failed to insert missing user record:', insertError);
      }
      return;
    }

    if (existing.role !== normalizedRole || existing.email !== email) {
      const { error: updateError } = await admin
        .from('users')
        .update({ role: normalizedRole, email })
        .eq('id', user.id);

      if (updateError) {
        console.error('[VerifyEmail] Failed to normalize user record:', updateError);
      }
    }
  } catch (err) {
    console.error('[VerifyEmail] ensureUserRecord threw:', err);
  }
}

async function updateEmailVerified(admin: any, userId: string, timestamp: string) {
  const { error: updateError } = await admin
    .from('users')
    .update({ email_verified_at: timestamp })
    .eq('id', userId);

  if (updateError) {
    console.error('[VerifyEmail] Error updating email_verified_at:', updateError);
  }
}

/**
 * Supabaseからのエラーを処理
 */
async function handleSupabaseError(
  error: string | null,
  errorCode: string | null,
  requestUrl: URL
): Promise<NextResponse> {
  console.log('[VerifyEmail] Supabase returned error:', { error, errorCode });
  
  // 早期リターン: トークンが期限切れまたはアクセス拒否
  if (errorCode === 'otp_expired' || error === 'access_denied') {
    console.log('[VerifyEmail] Token expired or access denied - likely already verified, redirecting to login');
    return NextResponse.redirect(
      new URL('/auth/login?message=メール認証リンクの有効期限が切れています。既に認証済みの場合はログインしてください。', requestUrl.origin)
    );
  }
  
  // Check if user session exists with confirmed email
  const supabase = await createClient();
  const { data: sessionUser } = await supabase.auth.getUser();
  
  console.log('[VerifyEmail] User session check:', { 
    hasUser: !!sessionUser?.user, 
    hasConfirmed: !!sessionUser?.user?.email_confirmed_at 
  });
  
  // 早期リターン: メールが既に確認済み
  if (sessionUser?.user?.id && sessionUser.user.email_confirmed_at) {
    console.log('[VerifyEmail] Email already confirmed, updating database');
    
    try {
      const admin = createAdminClient();
      await ensureUserRecord(admin, sessionUser.user);
      await updateEmailVerified(
        admin,
        sessionUser.user.id,
        sessionUser.user.email_confirmed_at
      );
    } catch (adminErr) {
      console.error('[VerifyEmail] Admin client failed:', adminErr);
    }

    return NextResponse.redirect(
      new URL('/auth/login?verified=true', requestUrl.origin)
    );
  }
  
  // デフォルト: ログインにリダイレクト
  console.log('[VerifyEmail] No active session, redirecting to login');
  return NextResponse.redirect(
    new URL('/auth/login?message=メール認証が必要な場合は、再度確認メールを送信してください。', requestUrl.origin)
  );
}

/**
 * PKCEフローを処理
 */
async function handlePKCEFlow(code: string, requestUrl: URL): Promise<NextResponse> {
  console.log('[VerifyEmail] Using PKCE flow with code parameter');
  const supabase = await createClient();
  
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  
  if (error) {
    console.error('[VerifyEmail] Error exchanging code for session:', error);
    
    // 早期リターン: PKCEコード検証子が見つからない
    if (error.code === 'pkce_code_verifier_not_found' || error.name === 'AuthPKCECodeVerifierMissingError') {
      console.log('[VerifyEmail] PKCE verifier missing, checking for existing session...');
      
      const { data: sessionUser } = await supabase.auth.getUser();
      
      if (sessionUser?.user?.id && sessionUser.user.email_confirmed_at) {
        console.log('[VerifyEmail] User already has confirmed session, updating database');
        
        try {
          const admin = createAdminClient();
          await ensureUserRecord(admin, sessionUser.user);
          await updateEmailVerified(
            admin,
            sessionUser.user.id,
            sessionUser.user.email_confirmed_at
          );
        } catch (adminErr) {
          console.error('[VerifyEmail] Admin client failed:', adminErr);
        }
        
        return NextResponse.redirect(
          new URL('/auth/login?verified=true', requestUrl.origin)
        );
      }
      
      console.log('[VerifyEmail] No existing session, redirecting to login with message');
      return NextResponse.redirect(
        new URL('/auth/login?message=メール認証リンクは、登録したブラウザで開く必要があります。同じブラウザで開いてください。', requestUrl.origin)
      );
    }
    
    // その他のエラー
    return NextResponse.redirect(
      new URL('/auth/login?message=メール認証に失敗しました。もう一度お試しください。', requestUrl.origin)
    );
  }
  
  if (!data.user) {
    return NextResponse.redirect(
      new URL('/auth/login?message=メール認証に失敗しました。もう一度お試しください。', requestUrl.origin)
    );
  }

  console.log('[VerifyEmail] Email verified successfully for user (PKCE):', data.user.id);
  
  try {
    const admin = createAdminClient();
    await ensureUserRecord(admin, data.user);
    await updateEmailVerified(admin, data.user.id, new Date().toISOString());
  } catch (adminErr) {
    console.error('[VerifyEmail] Admin client update failed:', adminErr);
  }

  return NextResponse.redirect(
    new URL('/auth/login?verified=true', requestUrl.origin)
  );
}

/**
 * トークンベースの検証を処理
 */
async function handleTokenVerification(
  token_hash: string,
  type: string,
  requestUrl: URL
): Promise<NextResponse> {
  const supabase = await createClient();
  const emailParam = requestUrl.searchParams.get('email');

  let verifyEmail = emailParam ?? undefined;
  if (!verifyEmail) {
    const { data: sessionUser } = await supabase.auth.getUser();
    verifyEmail = sessionUser?.user?.email ?? undefined;
  }

  // 早期リターン: メールが取得できない場合
  if (!verifyEmail) {
    return NextResponse.redirect(
      new URL('/auth/login?message=メール認証リンクにメール情報が含まれていません。リンクを同じブラウザで開いてください。', requestUrl.origin)
    );
  }

  const { data, error } = await supabase.auth.verifyOtp({
    token_hash,
    type: type as any,
    email: verifyEmail,
  });

  // 早期リターン: 検証エラー
  if (error) {
    console.error('[VerifyEmail] Error verifying email:', error);
    return NextResponse.redirect(
      new URL('/auth/verify-email-pending?error=verification_failed', requestUrl.origin)
    );
  }

  // 早期リターン: ユーザーが取得できない場合
  if (!data.user) {
    return NextResponse.redirect(
      new URL('/auth/verify-email-pending?error=verification_failed', requestUrl.origin)
    );
  }

  console.log('[VerifyEmail] Email verified successfully for user:', data.user.id);
  
  try {
    const admin = createAdminClient();
    await ensureUserRecord(admin, data.user);
    await updateEmailVerified(admin, data.user.id, new Date().toISOString());
  } catch (adminErr) {
    console.error('[VerifyEmail] Admin client update failed:', adminErr);
  }

  console.log('[VerifyEmail] Redirecting to login with verified=true');
  return NextResponse.redirect(
    new URL('/auth/login?verified=true', requestUrl.origin)
  );
}

/**
 * フォールバック検証を処理（既存セッションの確認）
 */
async function handleFallbackVerification(requestUrl: URL): Promise<NextResponse> {
  const supabase = await createClient();
  const { data: sessionUser } = await supabase.auth.getUser();
  
  if (sessionUser?.user?.id && sessionUser.user.email_confirmed_at) {
    try {
      const admin = createAdminClient();
      await ensureUserRecord(admin, sessionUser.user);
      await updateEmailVerified(
        admin,
        sessionUser.user.id,
        sessionUser.user.email_confirmed_at
      );
    } catch (adminErr) {
      console.error('[VerifyEmail] Fallback admin client failed:', adminErr);
    }

    return NextResponse.redirect(
      new URL('/auth/login?verified=true', requestUrl.origin)
    );
  }

  console.log('[VerifyEmail] Missing token or type parameters');
  return NextResponse.redirect(
    new URL('/auth/verify-email-pending?error=missing_params', requestUrl.origin)
  );
}

export async function GET(request: NextRequest) {
  try {
    const requestUrl = new URL(request.url);
    
    // Log all query parameters for debugging
    const allParams: Record<string, string | null> = {};
    requestUrl.searchParams.forEach((value, key) => {
      allParams[key] = value;
    });
    console.log('[VerifyEmail] All query parameters:', allParams);
    
    // Check for code parameter (PKCE flow)
    const code = requestUrl.searchParams.get('code');
    const token_hash = requestUrl.searchParams.get('token_hash') || requestUrl.searchParams.get('token');
    const type = requestUrl.searchParams.get('type');
    const next = requestUrl.searchParams.get('next') ?? '/dashboard';

    console.log('[VerifyEmail] Processing verification request:', { code: !!code, token_hash: !!token_hash, type });

    // 早期リターン: Supabaseからのエラーを処理
    const error = requestUrl.searchParams.get('error');
    const errorCode = requestUrl.searchParams.get('error_code');
    
    if (error || errorCode) {
      return await handleSupabaseError(error, errorCode, requestUrl);
    }

    // 早期リターン: PKCEフローを処理
    if (code) {
      return await handlePKCEFlow(code, requestUrl);
    }

    // 早期リターン: トークンベースの検証を処理
    if (token_hash && type && isValidEmailOtpType(type)) {
      return await handleTokenVerification(token_hash, type, requestUrl);
    }

    // 早期リターン: 既存セッションの確認（フォールバック）
    return await handleFallbackVerification(requestUrl);

  } catch (error) {
    console.error('[VerifyEmail] Unexpected error in verify-email:', error);
    const requestUrl = new URL(request.url);
    return NextResponse.redirect(
      new URL('/auth/verify-email-pending?error=unexpected', requestUrl.origin)
    );
  }
}
