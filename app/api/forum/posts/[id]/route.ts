import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    // Increment view count
    await supabase.rpc('increment_post_view_count', { post_id: id });

    // Fetch post with author details
    const { data: post, error } = await supabase
      .from('forum_posts')
      .select(`
        *,
        author:users!forum_posts_author_id_fkey(id, role),
        author_profile:profiles!forum_posts_author_id_fkey(full_name, profile_image_url),
        category:forum_categories(id, name, icon)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    // Fetch comments
    const { data: comments } = await supabase
      .from('forum_comments')
      .select(`
        *,
        author:users!forum_comments_author_id_fkey(id, role),
        author_profile:profiles!forum_comments_author_id_fkey(full_name, profile_image_url)
      `)
      .eq('post_id', id)
      .eq('moderation_status', 'approved')
      .order('created_at', { ascending: true });

    return NextResponse.json({ post, comments: comments || [] });
  } catch (error: any) {
    console.error('Error fetching post:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch post' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { title, content } = body;

    // Verify ownership
    const { data: post } = await supabase
      .from('forum_posts')
      .select('author_id')
      .eq('id', id)
      .single();

    if (!post || post.author_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: updatedPost, error } = await supabase
      .from('forum_posts')
      .update({ title, content })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ post: updatedPost });
  } catch (error: any) {
    console.error('Error updating post:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update post' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership
    const { data: post } = await supabase
      .from('forum_posts')
      .select('author_id')
      .eq('id', id)
      .single();

    if (!post || post.author_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { error } = await supabase
      .from('forum_posts')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting post:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete post' },
      { status: 500 }
    );
  }
}
