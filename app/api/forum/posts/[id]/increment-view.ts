import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCsrfSecretFromCookie, getCsrfTokenFromHeader, verifyCsrfToken } from '@/lib/utils/csrf';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // CSRFトークン検証
  const secret = getCsrfSecretFromCookie(request);
  const token = getCsrfTokenFromHeader(request);
  if (!verifyCsrfToken(secret, token)) {
    return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
  }
  try {
    const supabase = await createClient();
    const { id } = await params;
    await supabase.rpc('increment_post_view_count', { post_id: id });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error incrementing post view:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to increment post view' },
      { status: 500 }
    );
  }
}
