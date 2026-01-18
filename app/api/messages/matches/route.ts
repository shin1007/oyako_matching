import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get matches where user is involved
    const { data: matchesData, error: matchesError } = await admin
      .from('matches')
      .select('*')
      .or(`parent_id.eq.${user.id},child_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (matchesError) throw matchesError;

    // Get profiles and user info for other users
    const matchesWithProfiles = await Promise.all(
      (matchesData || []).map(async (match: any) => {
        const otherUserId = match.parent_id === user.id ? match.child_id : match.parent_id;
        
        const { data: userData } = await admin
          .from('users')
          .select('role')
          .eq('id', otherUserId)
          .single();

        const { data: profile } = await admin
          .from('profiles')
          .select('last_name_kanji, first_name_kanji')
          .eq('user_id', otherUserId)
          .single();

        // 現在のユーザーが申請者か判定
        // 親がマッチング申請する場合が多いため、parent_id === user.id なら申請者
        const is_requester = match.parent_id === user.id;

        return {
          ...match,
          other_user_name: (profile?.last_name_kanji || '') + (profile?.first_name_kanji || '') || '名前なし',
          other_user_role: userData?.role || 'unknown',
          is_requester,
        };
      })
    );

    return NextResponse.json({ matches: matchesWithProfiles }, { status: 200 });
  } catch (error: any) {
    console.error('Failed to fetch matches:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch matches' },
      { status: 500 }
    );
  }
}
