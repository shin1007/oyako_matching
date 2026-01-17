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
    
    // Supabase may send either `token_hash` or `token` depending on the email template / flow (PKCE links include `token`).
    const token_hash = requestUrl.searchParams.get('token_hash') || requestUrl.searchParams.get('token');
    const type = requestUrl.searchParams.get('type');
    const next = requestUrl.searchParams.get('next') ?? '/dashboard';

    console.log('[VerifyEmail] Processing verification request:', { code: !!code, token_hash: !!token_hash, type });

    // Check if Supabase sent an error (e.g., token already used/expired)
    // In this case, the verification may have already succeeded on Supabase side
    const error = requestUrl.searchParams.get('error');
    const errorCode = requestUrl.searchParams.get('error_code');
    
    if (error || errorCode) {
      console.log('[VerifyEmail] Supabase returned error:', { error, errorCode });
      
      // For expired/invalid tokens, redirect to login page
      // The token being expired often means verification already succeeded
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
      
      // If no session but error exists, redirect to login anyway
      console.log('[VerifyEmail] No active session, redirecting to login');
      return NextResponse.redirect(
        new URL('/auth/login?message=メール認証が必要な場合は、再度確認メールを送信してください。', requestUrl.origin)
      );
    }

    // Handle PKCE flow with code parameter
    if (code) {
      console.log('[VerifyEmail] Using PKCE flow with code parameter');
      const supabase = await createClient();
      
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      
      if (error) {
        console.error('[VerifyEmail] Error exchanging code for session:', error);
        
        // PKCE code verifier missing - this happens when email link is opened in different browser/device
        // or when using SSR without proper cookie handling
        // Fallback: Check if user is already authenticated via existing session
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
          
          // No existing session - user needs to click the link in the same browser
          console.log('[VerifyEmail] No existing session, redirecting to login with message');
          return NextResponse.redirect(
            new URL('/auth/login?message=メール認証リンクは、登録したブラウザで開く必要があります。同じブラウザで開いてください。', requestUrl.origin)
          );
        }
        
        // Other errors
        return NextResponse.redirect(
          new URL('/auth/login?message=メール認証に失敗しました。もう一度お試しください。', requestUrl.origin)
        );
      }
      
      if (data.user) {
        console.log('[VerifyEmail] Email verified successfully for user (PKCE):', data.user.id);
        
        // Update the email_verified_at timestamp using admin client to bypass RLS
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
    }

    if (token_hash && type && isValidEmailOtpType(type)) {
      const supabase = await createClient();

      // For token_hash verification via email, Supabase requires the email value
      const emailParam = requestUrl.searchParams.get('email');

      let verifyEmail = emailParam ?? undefined;
      if (!verifyEmail) {
        // Try to get email from current session as a fallback
        const { data: sessionUser } = await supabase.auth.getUser();
        verifyEmail = sessionUser?.user?.email ?? undefined;
      }

      if (!verifyEmail) {
        // Without email, we cannot call verifyOtp(token_hash) for email types
        return NextResponse.redirect(
          new URL('/auth/login?message=メール認証リンクにメール情報が含まれていません。リンクを同じブラウザで開いてください。', requestUrl.origin)
        );
      }

      // Verify the email using the token and email
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash,
        type,
        email: verifyEmail,
      });

      if (error) {
        console.error('[VerifyEmail] Error verifying email:', error);
        return NextResponse.redirect(
          new URL('/auth/verify-email-pending?error=verification_failed', requestUrl.origin)
        );
      }

      if (data.user) {
        console.log('[VerifyEmail] Email verified successfully for user:', data.user.id);
        
        // Update the email_verified_at timestamp using admin client to bypass RLS
        try {
          const admin = createAdminClient();
          await ensureUserRecord(admin, data.user);
          await updateEmailVerified(admin, data.user.id, new Date().toISOString());
        } catch (adminErr) {
          console.error('[VerifyEmail] Admin client update failed:', adminErr);
        }

        // Create a response with redirect
        // Don't try to access auth session immediately - just redirect to the success page
        // The browser will have the session cookie set by verifyOtp
        const response = NextResponse.redirect(
          new URL('/auth/login?verified=true', requestUrl.origin)
        );

        console.log('[VerifyEmail] Redirecting to login with verified=true');
        return response;
      }
    }

    // Fallback: if token params are missing but user session already has confirmed email, mark verified
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
    // If no token or type, redirect to verification pending page
    return NextResponse.redirect(
      new URL('/auth/verify-email-pending?error=missing_params', requestUrl.origin)
    );

  } catch (error) {
    console.error('[VerifyEmail] Unexpected error in verify-email:', error);
    const requestUrl = new URL(request.url);
    return NextResponse.redirect(
      new URL('/auth/verify-email-pending?error=unexpected', requestUrl.origin)
    );
  }
}
