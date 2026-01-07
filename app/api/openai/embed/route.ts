import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createEmbedding } from '@/lib/openai';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { text } = body;

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    // Create embedding
    const embedding = await createEmbedding(text);

    return NextResponse.json({ embedding });
  } catch (error: any) {
    console.error('Embedding error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create embedding' },
      { status: 500 }
    );
  }
}
