
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

import { getCsrfSecretFromCookie, getCsrfTokenFromHeader, verifyCsrfToken } from '@/lib/utils/csrf';

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

    const body = await request.json();
    const { 
      reported_content_type, 
      reported_content_id, 
      report_reason, 
      report_details 
    }: {
      reported_content_type: string;
      reported_content_id: string;
      report_reason: string;
      report_details?: string;
    } = body;

    if (!reported_content_type || !reported_content_id || !report_reason) {
      return NextResponse.json(
        { error: '通報内容タイプ、ID、理由は必須です' },
        { status: 400 }
      );
    }

    // 通報内容が存在するか確認
    if (reported_content_type === 'post') {
      const { data: post, error: postError } = await supabase
        .from('forum_posts')
        .select('id')
        .eq('id', reported_content_id)
        .single();

      if (postError || !post) {
        return NextResponse.json(
          { error: '投稿が見つかりません' },
          { status: 404 }
        );
      }
    } else if (reported_content_type === 'comment') {
      const { data: comment, error: commentError } = await supabase
        .from('forum_comments')
        .select('id')
        .eq('id', reported_content_id)
        .single();

      if (commentError || !comment) {
        return NextResponse.json(
          { error: 'コメントが見つかりません' },
          { status: 404 }
        );
      }
    }

    // 重複通報をチェック
    const { data: existingReports } = await supabase
      .from('forum_reports')
      .select('id')
      .eq('reporter_id', user.id)
      .eq('reported_content_type', reported_content_type)
      .eq('reported_content_id', reported_content_id)
      .in('status', ['pending', 'reviewed']);

    if (existingReports && existingReports.length > 0) {
      return NextResponse.json(
        { error: 'すでにこのコンテンツを通報しています' },
        { status: 400 }
      );
    }

    // 通報を作成
    const { data: report, error } = await supabase
      .from('forum_reports')
      .insert({
        reporter_id: user.id,
        reported_content_type,
        reported_content_id,
        report_reason,
        report_details: report_details || null,
        status: 'pending'
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ report }, { status: 201 });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Error creating report:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to create report' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const contentType = searchParams.get('content_type');
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = 20;
    const offset = (page - 1) * perPage;

    // 自分の通報のみ取得
    let query = supabase
      .from('forum_reports')
      .select('*', { count: 'exact' })
      .eq('reporter_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + perPage - 1);

    if (status) {
      query = query.eq('status', status);
    }

    if (contentType) {
      query = query.eq('reported_content_type', contentType);
    }

    const { data: reports, error, count } = await query;

    if (error) throw error;

    return NextResponse.json({
      reports: reports || [],
      pagination: {
        page,
        perPage,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / perPage)
      }
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Error fetching reports:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch reports' },
      { status: 500 }
    );
  }
}
