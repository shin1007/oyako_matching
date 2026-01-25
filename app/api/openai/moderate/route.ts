import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { moderateContent } from '@/lib/openai';

import { writeAuditLog } from '@/lib/audit-log';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();


    if (!user) {
      await writeAuditLog({
        userId: null,
        eventType: 'content_moderation',
        detail: 'Unauthorized',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { content } = body;


    if (!content) {
      await writeAuditLog({
        userId: user.id,
        eventType: 'content_moderation',
        detail: 'Content is required',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
      });
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    // Moderate content
    const moderation = await moderateContent(content);

    await writeAuditLog({
      userId: user.id,
      eventType: 'content_moderation',
      detail: 'Moderation result',
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      meta: { flagged: moderation.flagged, categories: moderation.categories },
    });
    return NextResponse.json({
      flagged: moderation.flagged,
      categories: moderation.categories,
    });
  } catch (error: any) {
    console.error('Moderation error:', error);
    await writeAuditLog({
      userId: null,
      eventType: 'content_moderation',
      detail: 'Unexpected error',
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      meta: { error: error?.message },
    });
    return NextResponse.json(
      { error: error.message || 'Failed to moderate content' },
      { status: 500 }
    );
  }
}
