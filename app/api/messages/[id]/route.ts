import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();
    const { id: matchId } = await params;

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Messages API] Fetching match:', matchId, 'for user:', user.id);

    // マッチ情報を取得
    const { data: match, error: matchError } = await admin
      .from('matches')
      .select('*')
      .eq('id', matchId)
      .single();

    console.log('[Messages API] Match result:', match, 'error:', matchError);

    if (matchError || !match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    // ユーザーがこのマッチに関与しているか確認
    if (match.parent_id !== user.id && match.child_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // マッチが承認されているか確認
    if (match.status !== 'accepted') {
      return NextResponse.json(
        { error: 'Match is not accepted yet' },
        { status: 400 }
      );
    }

    // 相手のユーザー情報を取得
    const otherUserId = match.parent_id === user.id ? match.child_id : match.parent_id;

    const { data: userData } = await admin
      .from('users')
      .select('role')
      .eq('id', otherUserId)
      .single();

    const { data: profile } = await admin
      .from('profiles')
      .select('last_name_kanji, first_name_kanji, profile_image_url')
      .eq('user_id', otherUserId)
      .single();

    // 探している子どもの写真を取得
    const { data: searchingChildren } = await admin
      .from('searching_children')
      .select('id, last_name_kanji, first_name_kanji')
      .eq('user_id', otherUserId)
      .order('display_order', { ascending: true });

    let searchingChildrenWithPhotos = [];
    if (searchingChildren && searchingChildren.length > 0) {
      searchingChildrenWithPhotos = await Promise.all(
        searchingChildren.map(async (child: any) => {
          const { data: photos } = await admin
            .from('searching_children_photos')
            .select('photo_url')
            .eq('searching_child_id', child.id)
            .order('display_order', { ascending: true })
            .limit(1);

          return {
            ...child,
            photo_url: photos && photos.length > 0 ? photos[0].photo_url : null,
          };
        })
      );
    }

    // メッセージを取得
    const { data: messages, error: messagesError } = await admin
      .from('messages')
      .select('*')
      .eq('match_id', matchId)
      .order('created_at', { ascending: true });

    if (messagesError) {
      console.error('Failed to fetch messages:', messagesError);
    }

    return NextResponse.json(
      {
        match: {
          ...match,
          other_user_name: (profile?.last_name_kanji || '') + (profile?.first_name_kanji || '') || '名前なし',
          other_user_role: userData?.role || 'unknown',
          other_user_image: profile?.profile_image_url || null,
          searching_children: searchingChildrenWithPhotos,
        },
        messages: messages || [],
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Failed to fetch match details:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch match details' },
      { status: 500 }
    );
  }
}
