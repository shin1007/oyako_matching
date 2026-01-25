import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { moderateContent } from '@/lib/openai';
import { checkRateLimit, recordRateLimitAction, COMMENT_RATE_LIMITS } from '@/lib/rate-limit';
import { extractAuditMeta } from '@/lib/utils/extractAuditMeta';

import { writeAuditLog } from '@/lib/audit-log';

export async function POST(request: NextRequest) {
  // レートリミット（IPアドレス単位: 1分10回・1時間50回）
  const ipRaw = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip');
  const ip = typeof ipRaw === 'string' ? ipRaw : '';
  const supabase = await createClient();
  const rateLimitResult = await checkRateLimit(
    supabase,
    ip,
    'forum_comment',
    [
      { windowSeconds: 60, maxActions: 10 },
      { windowSeconds: 3600, maxActions: 50 }
    ]
  );
  if (!rateLimitResult.allowed) {
    return NextResponse.json({ error: rateLimitResult.message, retryAfter: rateLimitResult.retryAfter?.toISOString() }, { status: 429 });
  }
  await recordRateLimitAction(supabase, ip, 'forum_comment');
  try {
    const { data: { user } } = await supabase.auth.getUser();


    if (!user) {
      await writeAuditLog({
        userId: null,
        eventType: 'forum_comment_create',
        detail: 'Unauthorized',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ユーザーのロールを取得
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();


    if (userData?.role !== 'parent' && userData?.role !== 'child') {
      await writeAuditLog({
        userId: user.id,
        eventType: 'forum_comment_create',
        detail: 'Only parents or children can create comments',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
      });
      return NextResponse.json(
        { error: 'Only parents or children can create comments' },
        { status: 403 }
      );
    }

    const userType = userData.role as 'parent' | 'child';

    const body = await request.json();
    const { post_id, content } = body;


    if (!post_id || !content) {
      await writeAuditLog({
        userId: user.id,
        eventType: 'forum_comment_create',
        detail: 'Post ID and content are required',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
      });
      return NextResponse.json(
        { error: 'Post ID and content are required' },
        { status: 400 }
      );
    }

    // 投稿のuser_typeを確認して、同じタイプのユーザーのみコメント可能
    const { data: post, error: postError } = await supabase
      .from('forum_posts')
      .select('user_type')
      .eq('id', post_id)
      .single();


    if (postError || !post) {
      await writeAuditLog({
        userId: user.id,
        eventType: 'forum_comment_create',
        detail: 'Post not found',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        meta: { post_id },
      });
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }


    if (post.user_type !== userType) {
      await writeAuditLog({
        userId: user.id,
        eventType: 'forum_comment_create',
        detail: `Only ${post.user_type}s can comment on this post`,
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        meta: { post_id },
      });
      return NextResponse.json(
        { error: `Only ${post.user_type}s can comment on this post` },
        { status: 403 }
      );
    }

    // Check rate limit
    const rateLimitResult = await checkRateLimit(
      supabase,
      user.id,
      'comment',
      COMMENT_RATE_LIMITS,
      post_id
    );


    if (!rateLimitResult.allowed) {
      await writeAuditLog({
        userId: user.id,
        eventType: 'forum_comment_create',
        detail: 'Rate limit exceeded',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        meta: { post_id },
      });
      return NextResponse.json(
        { 
          error: rateLimitResult.message,
          retryAfter: rateLimitResult.retryAfter?.toISOString()
        },
        { status: 429 }
      );
    }

    // Moderate content
    const moderation = await moderateContent(content);

    if (moderation.flagged) {
      await writeAuditLog({
        userId: user.id,
        eventType: 'forum_comment_create',
        detail: 'Moderation flagged',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        meta: { post_id },
      });
      return NextResponse.json(
        { error: moderation.message || '不適切な内容が含まれています' },
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
      .select('*')
      .single();


    if (error) {
      await writeAuditLog({
        userId: user.id,
        eventType: 'forum_comment_create',
        detail: 'Failed to create comment',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        meta: { post_id, error: error.message },
      });
      throw error;
    }

    // Record rate limit action
    await recordRateLimitAction(supabase, user.id, 'comment', post_id);

    // Fetch author profile
    const { data: authorProfile } = await supabase
      .from('profiles')
      .select('forum_display_name, last_name_kanji, first_name_kanji, profile_image_url')
      .eq('user_id', user.id)
      .single();

    // フォールバック: forum_display_nameがない場合はフルネームを使用
    const displayName = authorProfile?.forum_display_name || 
      `${authorProfile?.last_name_kanji || ''}${authorProfile?.first_name_kanji || '名無し'}`;

    // Enrich comment with profile
    const enrichedComment = {
      ...comment,
      author_profile: {
        forum_display_name: displayName,
        profile_image_url: authorProfile?.profile_image_url
      }
    };

    // 監査ログ記録
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null;
    const userAgent = request.headers.get('user-agent') || null;
    const { logAuditEventServer } = await import('@/lib/utils/auditLoggerServer');
    await logAuditEventServer({
      user_id: user.id,
      event_type: 'forum_comment_create',
      target_table: 'forum_comments',
      target_id: comment.id,
      description: `Comment created: ${content}`,
      ip_address: ip,
      user_agent: userAgent,
      event_timestamp: new Date().toISOString(),
    });
    await writeAuditLog({
      userId: user.id,
      eventType: 'forum_comment_create',
      detail: 'Comment created',
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      meta: { post_id },
    });
    return NextResponse.json({ comment: enrichedComment }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating comment:', error);
    await writeAuditLog({
      userId: null,
      eventType: 'forum_comment_create',
      detail: 'Unexpected error',
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      meta: { error: error?.message },
    });
    return NextResponse.json(
      { error: error.message || 'Failed to create comment' },
      { status: 500 }
    );
  }
}
