import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { moderateContent } from '@/lib/openai/index';

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
    const { content } = body;

    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    // Verify ownership
    const { data: comment } = await supabase
      .from('forum_comments')
      .select('author_id')
      .eq('id', id)
      .single();

    if (!comment || comment.author_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Moderate content
    const moderation = await moderateContent(content);
    if (moderation.flagged) {
      return NextResponse.json(
        { error: moderation.message || '不適切な内容が含まれています' },
        { status: 400 }
      );
    }

    const { data: updatedComment, error } = await supabase
      .from('forum_comments')
      .update({ content })
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;

    // Fetch author profile
    const { data: authorProfile } = await supabase
      .from('profiles')
      .select('forum_display_name, last_name_kanji, first_name_kanji, profile_image_url')
      .eq('user_id', updatedComment.author_id)
      .single();

    // フォールバック: forum_display_nameがない場合はフルネームを使用
    const displayName = authorProfile?.forum_display_name || 
      `${authorProfile?.last_name_kanji || ''}${authorProfile?.first_name_kanji || '名無し'}`;

    // Enrich comment with profile
    const enrichedComment = {
      ...updatedComment,
      author_profile: {
        forum_display_name: displayName,
        profile_image_url: authorProfile?.profile_image_url
      }
    };

    return NextResponse.json({ comment: enrichedComment });
  } catch (error: any) {
    console.error('Error updating comment:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update comment' },
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

    // コメント内容取得
    const { data: commentData } = await supabase
      .from('forum_comments')
      .select('author_id, content')
      .eq('id', id)
      .single();

    if (!commentData || commentData.author_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 削除前に内容を記録
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || request.ip || null;
    const userAgent = request.headers.get('user-agent') || null;
    const { logAuditEventServer } = await import('@/lib/utils/auditLoggerServer');
    await logAuditEventServer({
      user_id: user.id,
      event_type: 'forum_comment_delete',
      target_table: 'forum_comments',
      target_id: id,
      description: `Comment deleted: ${commentData.content}`,
      ip_address: ip,
      user_agent: userAgent,
      event_timestamp: new Date().toISOString(),
    });

    const { error } = await supabase
      .from('forum_comments')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting comment:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete comment' },
      { status: 500 }
    );
  }
}
