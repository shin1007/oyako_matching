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

    let query = supabase
      .from('forum_posts')
      .select(`
        *,
        author:users!forum_posts_author_id_fkey(id, role),
        author_profile:profiles!forum_posts_author_id_fkey(full_name, profile_image_url),
        category:forum_categories(id, name, icon),
        comment_count:forum_comments(count)
      `, { count: 'exact' })
      .eq('moderation_status', 'approved')
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + perPage - 1);

    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    const { data: posts, error, count } = await query;

    if (error) throw error;

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
