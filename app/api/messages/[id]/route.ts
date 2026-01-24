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

    // ページネーションパラメータを取得
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');
    const sortParam = searchParams.get('sort') || 'desc'; // デフォルトは降順（新しい順）

    // limitのバリデーション（デフォルト50、最大100）
    let limit = 50;
    if (limitParam) {
      const parsedLimit = parseInt(limitParam, 10);
      if (!isNaN(parsedLimit) && parsedLimit > 0) {
        limit = Math.min(parsedLimit, 100); // 最大100件に制限
      }
    }

    // offsetのバリデーション（デフォルト0）
    let offset = 0;
    if (offsetParam) {
      const parsedOffset = parseInt(offsetParam, 10);
      if (!isNaN(parsedOffset) && parsedOffset >= 0) {
        offset = parsedOffset;
      }
    }

    // sortのバリデーション（asc または desc のみ許可）
    const sortOrder = sortParam === 'asc' ? 'asc' : 'desc';
    const ascending = sortOrder === 'asc';

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

    // マッチが承認済みまたはブロック状態ならメッセージ一覧を表示可能
    if (match.status !== 'accepted' && match.status !== 'blocked') {
      return NextResponse.json(
        { error: 'Match is not accepted or blocked' },
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
      .select('last_name_kanji, first_name_kanji, profile_image_url, birth_date, birthplace_prefecture, birthplace_municipality, gender')
      .eq('user_id', otherUserId)
      .single();

    // 探している子どもの写真を取得
    const { data: searchingChildren } = await admin
      .from('target_people')
      .select('id, last_name_kanji, first_name_kanji')
      .eq('user_id', otherUserId)
      .order('display_order', { ascending: true });

    let searchingChildrenWithPhotos = [];
    if (searchingChildren && searchingChildren.length > 0) {
      searchingChildrenWithPhotos = await Promise.all(
        searchingChildren.map(async (child: any) => {
          const { data: photos } = await admin
            .from('target-people-photos')
            .select('photo_url')
            .eq('target_person_id', child.id)
            .order('display_order', { ascending: true })
            .limit(1);

          return {
            ...child,
            photo_url: photos && photos.length > 0 ? photos[0].photo_url : null,
          };
        })
      );
    }

    // メッセージを取得（ページネーション付き）
    // まず総件数を取得
    const { count: totalCount, error: countError } = await admin
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('match_id', matchId);

    if (countError) {
      console.error('Failed to count messages:', countError);
    }

    // メッセージをページネーションで取得
    const { data: messages, error: messagesError } = await admin
      .from('messages')
      .select('*')
      .eq('match_id', matchId)
      .order('created_at', { ascending })
      .range(offset, offset + limit - 1);

    if (messagesError) {
      console.error('Failed to fetch messages:', messagesError);
    }

    const total = totalCount ?? 0;
    const hasMore = offset + limit < total;

    return NextResponse.json(
      {
        match: {
          ...match,
          other_user_name: (profile?.last_name_kanji || '') + (profile?.first_name_kanji || '') || '名前なし',
          other_user_role: userData?.role || 'unknown',
          other_user_image: profile?.profile_image_url || null,
          other_user_birth_date: profile?.birth_date || null,
          other_user_birthplace_prefecture: profile?.birthplace_prefecture || null,
          other_user_birthplace_municipality: profile?.birthplace_municipality || null,
          other_user_gender: profile?.gender || null,
          target_people: searchingChildrenWithPhotos,
        },
        messages: messages || [],
        pagination: {
          total,
          limit,
          offset,
          hasMore,
        },
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
