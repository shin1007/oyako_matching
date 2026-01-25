
import { getCsrfSecretFromCookie, getCsrfTokenFromHeader, verifyCsrfToken } from '@/lib/utils/csrf';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { maskSensitive } from '@/lib/utils/maskSensitive';
import { logAuditEventServer } from '@/lib/utils/auditLoggerServer';

// 監査ログ用: IPアドレスとUserAgentをNextRequestから抽出
function extractAuditMeta(request?: NextRequest) {
  if (!request) return { ip_address: null, user_agent: null };
  const ip = request.headers?.get('x-forwarded-for') || (request as any).ip || null;
  const userAgent = request.headers?.get('user-agent') || null;
  return { ip_address: ip, user_agent: userAgent };
}

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
    const meta = extractAuditMeta((globalThis as any).currentRequest);
    await logAuditEventServer({
      event_type: 'verify_email_failed',
      description: `メール認証リンクの有効期限切れまたはアクセス拒否: error=${error}, errorCode=${errorCode}`,
      ...meta,
    });
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
      await logAuditEventServer({
        user_id: sessionUser.user.id,
        event_type: 'verify_email_already_confirmed',
        description: 'メールが既に確認済み',
        ip_address: null,
        user_agent: null,
      });
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
    const meta = extractAuditMeta((globalThis as any).currentRequest);
    // 監査ログ: PKCEフロー失敗
    await logAuditEventServer({
      event_type: 'verify_email_pkce_failed',
      description: `PKCEフロー失敗: ${error.message || error.name}`,
      ...meta,
    });
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
          await logAuditEventServer({
            user_id: sessionUser.user.id,
            event_type: 'verify_email_already_confirmed',
            description: 'PKCEフロー: 既にメール確認済み',
            ...meta,
          });
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
    const meta = extractAuditMeta((globalThis as any).currentRequest);
    await logAuditEventServer({
      event_type: 'verify_email_pkce_failed',
      description: 'PKCEフロー: ユーザー情報取得失敗',
      ...meta,
    });
    return NextResponse.redirect(
      new URL('/auth/login?message=メール認証に失敗しました。もう一度お試しください。', requestUrl.origin)
    );
  }

  console.log('[VerifyEmail] Email verified successfully for user (PKCE):', data.user.id);
  
  try {
    const admin = createAdminClient();
    await ensureUserRecord(admin, data.user);
    await updateEmailVerified(admin, data.user.id, new Date().toISOString());
    const meta = extractAuditMeta((globalThis as any).currentRequest);
    await logAuditEventServer({
      user_id: data.user.id,
      event_type: 'verify_email_success',
      description: 'PKCEフロー: メール認証成功',
      ...meta,
    });
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
    const meta = extractAuditMeta((globalThis as any).currentRequest);
    await logAuditEventServer({
      event_type: 'verify_email_failed',
      description: 'トークン検証: メール情報取得失敗',
      ...meta,
    });
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
    const meta = extractAuditMeta((globalThis as any).currentRequest);
    await logAuditEventServer({
      event_type: 'verify_email_failed',
      description: `トークン検証: メール認証失敗: ${error.message}`,
      ...meta,
    });
    return NextResponse.redirect(
      new URL('/auth/verify-email-pending?error=verification_failed', requestUrl.origin)
    );
  }

  // 早期リターン: ユーザーが取得できない場合
  if (!data.user) {
    const meta = extractAuditMeta((globalThis as any).currentRequest);
    await logAuditEventServer({
      event_type: 'verify_email_failed',
      description: 'トークン検証: ユーザー情報取得失敗',
      ...meta,
    });
    return NextResponse.redirect(
      new URL('/auth/verify-email-pending?error=verification_failed', requestUrl.origin)
    );
  }

  console.log('[VerifyEmail] Email verified successfully for user:', data.user.id);
  
  try {
    const admin = createAdminClient();
    await ensureUserRecord(admin, data.user);
    await updateEmailVerified(admin, data.user.id, new Date().toISOString());
    const meta = extractAuditMeta((globalThis as any).currentRequest);
    await logAuditEventServer({
      user_id: data.user.id,
      event_type: 'verify_email_success',
      description: 'トークン検証: メール認証成功',
      ...meta,
    });
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
      const meta = extractAuditMeta((globalThis as any).currentRequest);
      await logAuditEventServer({
        user_id: sessionUser.user.id,
        event_type: 'verify_email_already_confirmed',
        description: 'フォールバック: 既にメール確認済み',
        ...meta,
      });
    } catch (adminErr) {
      console.error('[VerifyEmail] Fallback admin client failed:', adminErr);
    }
    return NextResponse.redirect(
      new URL('/auth/login?verified=true', requestUrl.origin)
    );
  }

  console.log('[VerifyEmail] Missing token or type parameters');
  const meta = extractAuditMeta((globalThis as any).currentRequest);
  await logAuditEventServer({
    event_type: 'verify_email_failed',
    description: 'フォールバック: パラメータ不足',
    ...meta,
  });
  return NextResponse.redirect(
    new URL('/auth/verify-email-pending?error=missing_params', requestUrl.origin)
  );
}

export async function POST(request: NextRequest) {
  // CSRFトークン検証
  const secret = getCsrfSecretFromCookie(request);
  const token = getCsrfTokenFromHeader(request);
  if (!verifyCsrfToken(secret, token)) {
    return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
  }
  try {
    const requestUrl = new URL(request.url);
    const allParams = Object.fromEntries(requestUrl.searchParams.entries());
    if (process.env.DEBUG_SHOW_SENSITIVE_DATA === 'true') {
      console.log('[VerifyEmail] All query parameters:', maskSensitive(allParams));
    }
    // Check for code parameter (PKCE flow)
    const code = requestUrl.searchParams.get('code');
    const token_hash = requestUrl.searchParams.get('token_hash') || requestUrl.searchParams.get('token');
    const type = requestUrl.searchParams.get('type');
    const next = requestUrl.searchParams.get('next') ?? '/dashboard';
    // デバッグモード時のみ検証リクエスト内容を出力
    if (process.env.DEBUG_SHOW_SENSITIVE_DATA === 'true') {
      console.log('[VerifyEmail] Processing verification request:', maskSensitive({ code, token_hash, type }));
    }
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
    const meta = extractAuditMeta(request);
    await logAuditEventServer({
      event_type: 'verify_email_failed',
      description: `予期せぬ例外: ${error instanceof Error ? error.message : String(error)}`,
      ...meta,
    });
    return NextResponse.redirect(
      new URL('/auth/verify-email-pending?error=unexpected', requestUrl.origin)
    );
  } finally {
    delete (globalThis as any).currentRequest;
  }
}

