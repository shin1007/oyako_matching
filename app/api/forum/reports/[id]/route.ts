import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { ReportStatus } from '@/types/database';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // TODO: 将来的には管理者権限のチェックを追加
    // 現状は通報者本人のみが自分の通報を閲覧可能

    const { id } = await params;
    const body = await request.json();
    const { status }: { status: ReportStatus } = body;

    if (!status) {
      return NextResponse.json(
        { error: 'ステータスは必須です' },
        { status: 400 }
      );
    }

    const { data: report, error } = await supabase
      .from('forum_reports')
      .update({
        status,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    if (!report) {
      return NextResponse.json(
        { error: '通報が見つかりません' },
        { status: 404 }
      );
    }

    return NextResponse.json({ report });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Error updating report:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to update report' },
      { status: 500 }
    );
  }
}

export async function GET(
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

    const { data: report, error } = await supabase
      .from('forum_reports')
      .select('*')
      .eq('id', id)
      .eq('reporter_id', user.id)
      .single();

    if (error) throw error;

    if (!report) {
      return NextResponse.json(
        { error: '通報が見つかりません' },
        { status: 404 }
      );
    }

    return NextResponse.json({ report });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Error fetching report:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch report' },
      { status: 500 }
    );
  }
}
