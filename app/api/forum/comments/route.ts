import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { moderateContent } from '@/lib/openai';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is a parent
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userData?.role !== 'parent') {
      return NextResponse.json(
        { error: 'Only parents can create comments' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { post_id, content } = body;

    if (!post_id || !content) {
      return NextResponse.json(
        { error: 'Post ID and content are required' },
        { status: 400 }
      );
    }

    // Moderate content
    const moderation = await moderateContent(content);
    if (moderation.flagged) {
      return NextResponse.json(
        { error: 'Content contains inappropriate material' },
        { status: 400 }
      );
    }

    const { data: comment, error } = await supabase
      .from('forum_comments')
      .insert({
        post_id,
        author_id: user.id,
        content,
        moderation_status: 'approved'
      })
      .select(`
        *,
        author:users!forum_comments_author_id_fkey(id, role),
        author_profile:profiles!forum_comments_author_id_fkey(full_name, profile_image_url)
      `)
      .single();

    if (error) throw error;

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating comment:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create comment' },
      { status: 500 }
    );
  }
}
