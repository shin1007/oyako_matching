import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateGrowthPhoto } from '@/lib/openai';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is a parent with active subscription
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userData?.role !== 'parent') {
      return NextResponse.json(
        { error: 'Only parents can generate growth photos' },
        { status: 403 }
      );
    }

    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('status')
      .eq('user_id', user.id)
      .single();

    if (!subscription || subscription.status !== 'active') {
      return NextResponse.json(
        { error: 'Active subscription required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { prompt, age } = body;

    if (!prompt || !age) {
      return NextResponse.json(
        { error: 'Prompt and age are required' },
        { status: 400 }
      );
    }

    // Generate AI photo
    const imageUrl = await generateGrowthPhoto(prompt, age);

    return NextResponse.json({ imageUrl });
  } catch (error: any) {
    console.error('Generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate photo' },
      { status: 500 }
    );
  }
}
