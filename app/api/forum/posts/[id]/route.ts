import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { moderateContent } from '@/lib/openai/index';
import { logAuditEventServer } from '@/lib/utils/auditLoggerServer';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
  // ...existing code...
    const supabase = await createClient();
    const { id } = await params;

    console.log('[POST DETAIL] Fetching post:', id);

    // Increment view count
    await supabase.rpc('increment_post_view_count', { post_id: id });

    // Fetch post with basic info
    const { data: post, error: postError } = await supabase
      .from('forum_posts')
      .select('*')
      .eq('id', id)
      .single();

    console.log('[POST DETAIL] Post data:', post);
    console.log('[POST DETAIL] Error:', postError);

    if (postError) throw postError;
    if (!post) throw new Error('Post not found');

    // Fetch author profile
    const { data: authorProfile } = await supabase
      .from('profiles')
      .select('forum_display_name, last_name_kanji, first_name_kanji, profile_image_url')
      .eq('user_id', post.author_id)
      .single();

    // フォールバック: forum_display_nameがない場合はフルネームを使用
    const displayName = authorProfile?.forum_display_name || 
      `${authorProfile?.last_name_kanji || ''}${authorProfile?.first_name_kanji || '名無し'}`;

    // Fetch category if exists
    let category = null;
    if (post.category_id) {
      const { data: categoryData } = await supabase
        .from('forum_categories')
        .select('id, name, icon')
        .eq('id', post.category_id)
        .single();
      category = categoryData;
    }

    // Construct post with profile
    const enrichedPost = {
      ...post,
      author_profile: {
        forum_display_name: displayName,
        profile_image_url: authorProfile?.profile_image_url
      },
      category
    };

    // Fetch comments
    const { data: comments } = await supabase
      .from('forum_comments')
      .select('*')
      .eq('post_id', id)
      .eq('moderation_status', 'approved')
      .order('created_at', { ascending: true });

    // Fetch comment authors' profiles
    const authorIds = [...new Set((comments || []).map(c => c.author_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, forum_display_name, last_name_kanji, first_name_kanji, profile_image_url')
      .in('user_id', authorIds);

    // Create profile map with fallback
    const profileMap = (profiles || []).reduce((acc, profile) => {
      const displayName = profile.forum_display_name || 
        `${profile.last_name_kanji || ''}${profile.first_name_kanji || '名無し'}`;
      
      acc[profile.user_id] = {
        forum_display_name: displayName,
        profile_image_url: profile.profile_image_url
      };
      return acc;
    }, {} as Record<string, any>);

    // Enrich comments with profiles
    const enrichedComments = (comments || []).map(comment => ({
      ...comment,
      author_profile: profileMap[comment.author_id] || { forum_display_name: '名無し' }
    }));

    return NextResponse.json({ post: enrichedPost, comments: enrichedComments });
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

    if (!title || !content) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      );
    }

    // Verify ownership
    const { data: post } = await supabase
      .from('forum_posts')
      .select('author_id')
      .eq('id', id)
      .single();

    if (!post || post.author_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 監査ログ記録
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || request.ip || null;
    const userAgent = request.headers.get('user-agent') || null;
    await logAuditEventServer({
      user_id: user.id,
      event_type: 'forum_post_update',
      target_table: 'forum_posts',
      target_id: id,
      description: 'Post updated',
      ip_address: ip,
      user_agent: userAgent,
    });

    // Moderate content
    const moderation = await moderateContent(`${title} ${content}`);
    if (moderation.flagged) {
      return NextResponse.json(
        { error: moderation.message || '不適切な内容が含まれています' },
        { status: 400 }
      );
    }

    const { data: updatedPost, error } = await supabase
      .from('forum_posts')
      .update({ title, content })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Fetch author profile
    const { data: authorProfile } = await supabase
      .from('profiles')
      .select('forum_display_name, last_name_kanji, first_name_kanji, profile_image_url')
      .eq('user_id', updatedPost.author_id)
      .single();

    // フォールバック: forum_display_nameがない場合はフルネームを使用
    const displayName = authorProfile?.forum_display_name || 
      `${authorProfile?.last_name_kanji || ''}${authorProfile?.first_name_kanji || '名無し'}`;

    // Fetch category if exists
    let category = null;
    if (updatedPost.category_id) {
      const { data: categoryData } = await supabase
        .from('forum_categories')
        .select('id, name, icon')
        .eq('id', updatedPost.category_id)
        .single();
      category = categoryData;
    }

    // Construct post with profile
    const enrichedPost = {
      ...updatedPost,
      author_profile: {
        forum_display_name: displayName,
        profile_image_url: authorProfile?.profile_image_url
      },
      category
    };

    return NextResponse.json({ post: enrichedPost });
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

    // 監査ログ記録
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || request.ip || null;
    const userAgent = request.headers.get('user-agent') || null;
    await logAuditEventServer({
      user_id: user.id,
      event_type: 'forum_post_delete',
      target_table: 'forum_posts',
      target_id: id,
      description: 'Post deleted',
      ip_address: ip,
      user_agent: userAgent,
      event_timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting post:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete post' },
      { status: 500 }
    );
  }
}
