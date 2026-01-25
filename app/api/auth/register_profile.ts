import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { userId, role } = await req.json();

  if (!userId || !role) {
    return NextResponse.json({ error: 'userIdとroleは必須です' }, { status: 400 });
  }

  // profilesテーブルに初期データをINSERT
  const { error } = await supabase
    .from('profiles')
    .insert({ user_id: userId, role });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
