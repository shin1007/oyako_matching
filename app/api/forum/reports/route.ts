
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

import { writeAuditLog } from '@/lib/audit-log';

import { getCsrfSecretFromCookie, getCsrfTokenFromHeader, verifyCsrfToken } from '@/lib/utils/csrf';
import { checkRateLimit, recordRateLimitAction } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  // レートリミット（IPアドレス単位: 1分5回・1時間20回）
  const ipRaw = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip');
  const ip = typeof ipRaw === 'string' ? ipRaw : '';
  const supabase = await createClient();
  const rateLimitResult = await checkRateLimit(
    supabase,
    ip,
    'forum_report',
    [
      { windowSeconds: 60, maxActions: 5 },
      { windowSeconds: 3600, maxActions: 20 }
    ]
  );
  if (!rateLimitResult.allowed) {
    return NextResponse.json({ error: rateLimitResult.message, retryAfter: rateLimitResult.retryAfter?.toISOString() }, { status: 429 });
  }
  await recordRateLimitAction(supabase, ip, 'forum_report');

  // CSRFトークン検証
  const secret = getCsrfSecretFromCookie(request);
  const token = getCsrfTokenFromHeader(request);
  if (!verifyCsrfToken(secret, token)) {
    await writeAuditLog({
      userId: null,
      eventType: 'forum_report_create',
      detail: 'CSRF token invalid',
      ip,
    });
    return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
  }
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();


    if (!user) {
      await writeAuditLog({
        userId: null,
        eventType: 'forum_report_create',
        detail: 'Unauthorized',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
      });
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
      await writeAuditLog({
        userId: user.id,
        eventType: 'forum_report_create',
        detail: 'Missing required fields',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
      });
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
        await writeAuditLog({
          userId: user.id,
          eventType: 'forum_report_create',
          detail: 'Post not found',
          ip: request.headers.get('x-forwarded-for') || 'unknown',
          meta: { reported_content_id },
        });
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
        await writeAuditLog({
          userId: user.id,
          eventType: 'forum_report_create',
          detail: 'Comment not found',
          ip: request.headers.get('x-forwarded-for') || 'unknown',
          meta: { reported_content_id },
        });
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
      await writeAuditLog({
        userId: user.id,
        eventType: 'forum_report_create',
        detail: 'Already reported',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        meta: { reported_content_id },
      });
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

    if (error) {
      await writeAuditLog({
        userId: user.id,
        eventType: 'forum_report_create',
        detail: 'Failed to create report',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        meta: { reported_content_id, error: error.message },
      });
      throw error;
    }

    await writeAuditLog({
      userId: user.id,
      eventType: 'forum_report_create',
      detail: 'Report created',
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      meta: { reported_content_id },
    });
    return NextResponse.json({ report }, { status: 201 });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Error creating report:', err);
    await writeAuditLog({
      userId: null,
      eventType: 'forum_report_create',
      detail: 'Unexpected error',
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      meta: { error: err?.message },
    });
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
      await writeAuditLog({
        userId: null,
        eventType: 'forum_report_view',
        detail: 'Unauthorized',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
      });
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

    if (error) {
      await writeAuditLog({
        userId: user.id,
        eventType: 'forum_report_view',
        detail: 'Failed to fetch reports',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        meta: { error: error.message },
      });
      throw error;
    }

    await writeAuditLog({
      userId: user.id,
      eventType: 'forum_report_view',
      detail: 'Fetched reports',
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      meta: { page, perPage, status, contentType },
    });
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
    await writeAuditLog({
      userId: null,
      eventType: 'forum_report_view',
      detail: 'Unexpected error',
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      meta: { error: err?.message },
    });
    return NextResponse.json(
      { error: err.message || 'Failed to fetch reports' },
      { status: 500 }
    );
  }
}
