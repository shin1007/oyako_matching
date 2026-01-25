
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { moderateContent } from '@/lib/openai';
import { checkRateLimit, recordRateLimitAction, POST_RATE_LIMITS } from '@/lib/rate-limit';
import { logAuditEventServer } from '@/lib/utils/auditLoggerServer';
import { extractAuditMeta } from '@/lib/utils/extractAuditMeta';
import { getCsrfSecretFromCookie, getCsrfTokenFromHeader, verifyCsrfToken } from '@/lib/utils/csrf';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;
    const categoryId = searchParams.get('category_id');
    const userType = searchParams.get('userType'); // 'parent' or 'child'
    console.log('API userType param:', userType);
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = 20;
    const offset = (page - 1) * perPage;

    // 投稿データを取得
    let postsQuery = supabase
      .from('forum_posts')
      .select('*', { count: 'exact' })
      .eq('moderation_status', 'approved')
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + perPage - 1);

    if (categoryId) {
      postsQuery = postsQuery.eq('category_id', categoryId);
    }

    // userTypeでフィルタリング（親と子のフォーラムを分離）
    if (userType === 'parent' || userType === 'child') {
      postsQuery = postsQuery.eq('user_type', userType);
    }

    console.log('postsQuery params:', {
      moderation_status: 'approved',
      user_type: userType,
      category_id: categoryId
    });
    const { data: postsData, error: postsError, count } = await postsQuery;
    console.log('postsData:', postsData);
    if (postsError) {
      console.error('postsError:', postsError);
      throw postsError;
    }

    // 投稿がない場合は空の結果を返す
    if (!postsData || postsData.length === 0) {
      return NextResponse.json({
        posts: [],
        pagination: {
          page,
          perPage,
          total: 0,
          totalPages: 0
        }
      });
    }

    // 投稿がある場合はデータを返す
    return NextResponse.json({
      posts: postsData,
      pagination: {
        page,
        perPage,
        total: count || 0,
        totalPages: count ? Math.ceil(count / perPage) : 0
      }
    });
  } catch (error: any) {
    console.error('Error fetching posts:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch posts' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // CSRFトークン検証
  const secret = getCsrfSecretFromCookie(request);
  const token = getCsrfTokenFromHeader(request);
  if (!verifyCsrfToken(secret, token)) {
    return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
  }
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ユーザーのロールを取得
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    // 親または子のみが投稿を作成できる
    if (userData?.role !== 'parent' && userData?.role !== 'child') {
      return NextResponse.json(
        { error: 'Only parents or children can create forum posts' },
        { status: 403 }
      );
    }

    const userType = userData.role as 'parent' | 'child';

    const body = await request.json();
    const { title, content, category_id } = body;

    if (!title || !content) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      );
    }

    // Check rate limit
    const rateLimitResult = await checkRateLimit(
      supabase,
      user.id,
      'post',
      POST_RATE_LIMITS
    );

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { 
          error: rateLimitResult.message,
          retryAfter: rateLimitResult.retryAfter?.toISOString()
        },
        { status: 429 }
      );
    }

    // Moderate content
    const moderation = await moderateContent(`${title} ${content}`);
    if (moderation.flagged) {
      return NextResponse.json(
        { error: moderation.message || '不適切な内容が含まれています' },
        { status: 400 }
      );
    }

    const { data: post, error } = await supabase
      .from('forum_posts')
      .insert({
        author_id: user.id,
        category_id: category_id || null,
        title,
        content,
        user_type: userType,
        moderation_status: 'approved'
      })
      .select()
      .single();

    if (error) throw error;

    // Record rate limit action
    await recordRateLimitAction(supabase, user.id, 'post');

    // 監査ログ記録
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null;
    const userAgent = request.headers.get('user-agent') || null;
    await logAuditEventServer({
      user_id: user.id,
      event_type: 'forum_post_create',
      target_table: 'forum_posts',
      target_id: post.id,
      description: `Post created: ${title} ${content}`,
      ip_address: ip,
      user_agent: userAgent,
      event_timestamp: new Date().toISOString(),
    });
    return NextResponse.json({ post }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating post:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create post' },
      { status: 500 }
    );
  }
}
