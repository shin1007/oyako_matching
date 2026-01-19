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
          .select('last_name_kanji, first_name_kanji, profile_image_url')
          .eq('user_id', otherUserId)
          .single();

        // 探している子どもの写真を取得
        const { data: searchingChildren } = await admin
          .from('searching_children')
          .select('id')
          .eq('user_id', otherUserId)
          .order('display_order', { ascending: true });

        let searchingChildPhotos = [];
        if (searchingChildren && searchingChildren.length > 0) {
          console.log('[Messages API] Found searching children:', searchingChildren);
          const childIds = searchingChildren.map((c: any) => c.id);
          const { data: photos } = await admin
            .from('searching_children_photos')
            .select('searching_child_id, photo_url')
            .in('searching_child_id', childIds)
            .order('display_order', { ascending: true });

          console.log('[Messages API] Found photos:', photos);
          if (photos && photos.length > 0) {
            // 最初の子どもの最初の写真を取得
            const firstChildPhoto = photos.find((p: any) => p.searching_child_id === childIds[0]);
            if (firstChildPhoto) {
              searchingChildPhotos = [firstChildPhoto.photo_url];
            }
          }
        }

        // 現在のユーザーが申請者か判定
        // 親がマッチング申請する場合が多いため、parent_id === user.id なら申請者
        const is_requester = match.parent_id === user.id;

        // 未読メッセージ数を取得
        let unread_count = 0;
        let last_message = null;
        if (match.status === 'accepted') {
          const { data: unreadMessages } = await admin
            .from('messages')
            .select('id', { count: 'exact', head: true })
            .eq('match_id', match.id)
            .neq('sender_id', user.id)
            .is('read_at', null);

          unread_count = unreadMessages?.length || 0;

          // 最後のメッセージを取得
          const { data: lastMsg } = await admin
            .from('messages')
            .select('content, created_at, sender_id')
            .eq('match_id', match.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (lastMsg) {
            last_message = {
              content: lastMsg.content,
              created_at: lastMsg.created_at,
              is_own: lastMsg.sender_id === user.id,
            };
          }
        }

        return {
          ...match,
          other_user_name: (profile?.last_name_kanji || '') + (profile?.first_name_kanji || '') || '名前なし',
          other_user_role: userData?.role || 'unknown',
          other_user_image: profile?.profile_image_url || null,
          searching_child_photos: searchingChildPhotos,
          is_requester,
          unread_count,
          last_message,
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
