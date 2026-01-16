import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { initiateVerification } from '@/lib/xid';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { userId, callbackUrl } = body;

    // Verify the userId matches the authenticated user
    if (userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Initiate xID verification
    const result = await initiateVerification(userId, callbackUrl);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Verification initiation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to initiate verification' },
      { status: 500 }
    );
  }
}
