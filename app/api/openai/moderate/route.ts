import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { moderateContent, createEmbedding } from '@/lib/openai';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { content } = body;

    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    // Moderate content
    const moderation = await moderateContent(content);

    return NextResponse.json({
      flagged: moderation.flagged,
      categories: moderation.categories,
    });
  } catch (error: any) {
    console.error('Moderation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to moderate content' },
      { status: 500 }
    );
  }
}
