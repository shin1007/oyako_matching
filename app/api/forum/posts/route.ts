import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { moderateContent } from '@/lib/openai';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;
    const categoryId = searchParams.get('category_id');
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

    const { data: postsData, error: postsError, count } = await postsQuery;
    if (postsError) throw postsError;

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

    // 著者IDを取得してプロフィールをフェッチ
    const authorIds = [...new Set(postsData.map(post => post.author_id))];
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('user_id, forum_display_name, profile_image_url')
      .in('user_id', authorIds);

    if (profilesError) throw profilesError;

    // カテゴリIDを取得してカテゴリをフェッチ
    const categoryIds = [...new Set(postsData.map(post => post.category_id).filter(Boolean))];
    const { data: categories, error: categoriesError } = await supabase
      .from('forum_categories')
      .select('id, name, icon')
      .in('id', categoryIds);

    if (categoriesError) throw categoriesError;

    // 各投稿のコメント数をフェッチ
    const postIds = postsData.map(post => post.id);
    const { data: commentCounts, error: commentsError } = await supabase
      .from('forum_comments')
      .select('post_id')
      .in('post_id', postIds);

    if (commentsError) throw commentsError;

    // コメント数を集計
    const commentCountMap = commentCounts?.reduce((acc, comment) => {
      acc[comment.post_id] = (acc[comment.post_id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    // プロフィールとカテゴリをマップに変換
    const profileMap = profiles?.reduce((acc, profile) => {
      acc[profile.user_id] = profile;
      return acc;
    }, {} as Record<string, any>) || {};

    const categoryMap = categories?.reduce((acc, category) => {
      acc[category.id] = category;
      return acc;
    }, {} as Record<string, any>) || {};

    // データを結合
    const posts = postsData.map(post => ({
      ...post,
      author_profile: profileMap[post.author_id] || null,
      category: categoryMap[post.category_id] || null,
      comment_count: [{ count: commentCountMap[post.id] || 0 }]
    }));

    return NextResponse.json({ 
      posts,
      pagination: {
        page,
        perPage,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / perPage)
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
        { error: 'Only parents can create forum posts' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { title, content, category_id } = body;

    if (!title || !content) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      );
    }

    // Moderate content
    const moderation = await moderateContent(`${title} ${content}`);
    if (moderation.flagged) {
      return NextResponse.json(
        { error: 'Content contains inappropriate material' },
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
        moderation_status: 'approved'
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ post }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating post:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create post' },
      { status: 500 }
    );
  }
}
