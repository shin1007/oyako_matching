import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Supabase OTP types
type OtpType = 'signup' | 'magiclink' | 'recovery' | 'invite' | 'email' | 'sms' | 'phone_change';

function isValidOtpType(type: string): type is OtpType {
  return ['signup', 'magiclink', 'recovery', 'invite', 'email', 'sms', 'phone_change'].includes(type);
}

export async function GET(request: NextRequest) {
  try {
    const requestUrl = new URL(request.url);
    const token_hash = requestUrl.searchParams.get('token_hash');
    const type = requestUrl.searchParams.get('type');
    const next = requestUrl.searchParams.get('next') ?? '/dashboard';

    if (token_hash && type && isValidOtpType(type)) {
      const supabase = await createClient();

      // Verify the email using the token
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash,
        type,
      });

      if (error) {
        console.error('Error verifying email:', error);
        return NextResponse.redirect(
          new URL('/auth/verify-email-pending?error=verification_failed', requestUrl.origin)
        );
      }

      if (data.user) {
        // Update the email_verified_at timestamp in our users table
        const { error: updateError } = await supabase
          .from('users')
          .update({ 
            email_verified_at: new Date().toISOString() 
          })
          .eq('id', data.user.id);

        if (updateError) {
          console.error('Error updating email_verified_at:', updateError);
          // Continue anyway - the Supabase auth email is verified
        }

        // Redirect to success page or dashboard
        return NextResponse.redirect(
          new URL('/auth/verify-email-pending?verified=true', requestUrl.origin)
        );
      }
    }

    // If no token or type, redirect to verification pending page
    return NextResponse.redirect(
      new URL('/auth/verify-email-pending?error=missing_params', requestUrl.origin)
    );

  } catch (error) {
    console.error('Unexpected error in verify-email:', error);
    const requestUrl = new URL(request.url);
    return NextResponse.redirect(
      new URL('/auth/verify-email-pending?error=unexpected', requestUrl.origin)
    );
  }
}
