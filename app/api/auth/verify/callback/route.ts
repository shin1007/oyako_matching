import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getVerificationResult, verifyAge } from '@/lib/xid';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }

    const searchParams = request.nextUrl.searchParams;
    const verificationId = searchParams.get('verificationId');

    if (!verificationId) {
      return NextResponse.redirect(new URL('/auth/verification?error=missing_id', request.url));
    }

    // Get verification result from xID
    const result = await getVerificationResult(verificationId);

    if (!result.verified) {
      return NextResponse.redirect(new URL('/auth/verification?error=verification_failed', request.url));
    }

    // Verify age if this is a child user
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userData?.role === 'child' && result.birthDate) {
      const ageCheck = verifyAge(result.birthDate);
      if (!ageCheck.isValid) {
        return NextResponse.redirect(
          new URL('/auth/verification?error=age_requirement', request.url)
        );
      }
    }

    // Update user verification status
    await supabase
      .from('users')
      .update({
        verification_status: 'verified',
        mynumber_verified: true,
      })
      .eq('id', user.id);

    // Create or update profile
    if (result.fullName && result.birthDate) {
      await supabase.from('profiles').upsert({
        user_id: user.id,
        full_name: result.fullName,
        birth_date: result.birthDate,
      });
    }

    // Redirect to dashboard
    return NextResponse.redirect(new URL('/dashboard', request.url));
  } catch (error: any) {
    console.error('Verification callback error:', error);
    return NextResponse.redirect(
      new URL('/auth/verification?error=callback_failed', request.url)
    );
  }
}
