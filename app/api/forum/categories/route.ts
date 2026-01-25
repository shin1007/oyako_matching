import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

import { writeAuditLog } from '@/lib/audit-log';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: categories, error } = await supabase
      .from('forum_categories')
      .select('*')
      .order('order_index', { ascending: true });


    if (error) {
      await writeAuditLog({
        userId: null,
        eventType: 'forum_category_view',
        detail: 'Failed to fetch categories',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        meta: { error: error.message },
      });
      throw error;
    }

    // 同名カテゴリの重複を排除（最初に現れるものを採用）
    const uniqueCategories = [] as Array<{ id: string; name: string; description?: string; icon?: string; order_index?: number }>;
    const seen = new Set<string>();
    for (const c of categories || []) {
      if (!seen.has(c.name)) {
        uniqueCategories.push(c);
        seen.add(c.name);
      }
    }

    await writeAuditLog({
      userId: null,
      eventType: 'forum_category_view',
      detail: 'Fetched categories',
      ip: request.headers.get('x-forwarded-for') || 'unknown',
    });
    return NextResponse.json({ categories: uniqueCategories });
  } catch (error: any) {
    console.error('Error fetching categories:', error);
    await writeAuditLog({
      userId: null,
      eventType: 'forum_category_view',
      detail: 'Unexpected error',
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      meta: { error: error?.message },
    });
    return NextResponse.json(
      { error: error.message || 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}
