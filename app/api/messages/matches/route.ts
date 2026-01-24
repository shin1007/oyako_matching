import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// デフォルトのページネーション設定
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ページネーションパラメータを取得
    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get('page') || String(DEFAULT_PAGE)));
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(searchParams.get('limit') || String(DEFAULT_LIMIT))));
    const offset = (page - 1) * limit;

    // 総マッチ数を取得（ページネーション情報のため）
    const { count: totalCount } = await admin
      .from('matches')
      .select('*', { count: 'exact', head: true })
      .or(`parent_id.eq.${user.id},child_id.eq.${user.id}`);

    // マッチデータをビューから取得（JOINで一括取得）
    const { data: matchesData, error: matchesError } = await admin
      .from('matches_with_details')
      .select('*')
      .or(`parent_id.eq.${user.id},child_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (matchesError) throw matchesError;

    if (!matchesData || matchesData.length === 0) {
      return NextResponse.json({ 
        matches: [],
        pagination: {
          page,
          limit,
          total: totalCount || 0,
          total_pages: 0
        }
      }, { status: 200 });
    }

    // 全マッチIDを収集
    const matchIds = matchesData.map((m: any) => m.id);
    const otherUserIds = matchesData.map((m: any) => 
      m.parent_id === user.id ? m.child_id : m.parent_id
    );
      // デバッグ: otherUserIds
      console.log('[Messages API] otherUserIds:', otherUserIds);

      // 相手ユーザーのプロフィール情報を一括取得
      const { data: profilesData, error: profilesError } = await admin
        .from('profiles')
        .select('user_id, birth_date, birthplace_prefecture, birthplace_municipality, gender')
        .in('user_id', otherUserIds);
      if (profilesError) throw profilesError;
      // デバッグ: profilesData
      console.log('[Messages API] profilesData:', profilesData);

      // user_idでマッピング
      const profilesMap = new Map<string, any>();
      if (profilesData) {
        profilesData.forEach((profile: any) => {
          profilesMap.set(profile.user_id, profile);
        });
      }
      // デバッグ: profilesMap
      console.log('[Messages API] profilesMap:', Array.from(profilesMap.entries()));
    // acceptedステータスのマッチIDのみを抽出
    const acceptedMatchIds = matchesData
      .filter((m: any) => m.status === 'accepted')
      .map((m: any) => m.id);

    // 未読メッセージ数を一括取得（acceptedマッチのみ）
    let unreadCountsMap = new Map<string, number>();
    if (acceptedMatchIds.length > 0) {
      const { data: unreadData } = await admin
        .from('messages')
        .select('match_id')
        .in('match_id', acceptedMatchIds)
        .neq('sender_id', user.id)
        .is('read_at', null);

      if (unreadData) {
        // マッチIDごとにカウント
        unreadData.forEach((msg: any) => {
          const count = unreadCountsMap.get(msg.match_id) || 0;
          unreadCountsMap.set(msg.match_id, count + 1);
        });
      }
    }

    // 最終メッセージを一括取得（acceptedマッチのみ）
    let lastMessagesMap = new Map<string, any>();
    if (acceptedMatchIds.length > 0) {
      // 全メッセージを新しい順に取得し、各マッチIDの最初（最新）のみを保持
      // これは複数のクエリを実行するより効率的
      const { data: lastMessages } = await admin
        .from('messages')
        .select('match_id, content, created_at, sender_id')
        .in('match_id', acceptedMatchIds)
        .order('created_at', { ascending: false });

      if (lastMessages) {
        // 各マッチIDで最初に出現したメッセージ（最新）のみを保持
        lastMessages.forEach((msg: any) => {
          if (!lastMessagesMap.has(msg.match_id)) {
            lastMessagesMap.set(msg.match_id, msg);
          }
        });
      }
    }

    // 探している子どもの写真を一括取得
    const { data: searchingChildren } = await admin
      .from('target_people')
      .select('id, user_id, last_name_kanji, first_name_kanji, birthplace_prefecture, birthplace_municipality')
      .in('user_id', otherUserIds)
      .order('display_order', { ascending: true });

    let photosMap = new Map<string, string[]>();
    let photos: any[] = [];
    if (searchingChildren && searchingChildren.length > 0) {
      const childIds = searchingChildren.map((c: any) => c.id);
      const { data: photosData } = await admin
        .from('target_people_photos')
        .select('target_person_id, photo_url')
        .in('target_person_id', childIds)
        .order('display_order', { ascending: true });
      photos = photosData || [];

      if (photos.length > 0) {
        // ユーザーIDごとに最初の子どもの最初の写真を保持
        // 最初の子どものIDをマッピング（reduceで効率的に処理）
        const userChildMap = new Map<string, string>();
        const childToUserMap = new Map<string, string>();
        
        searchingChildren.forEach((child: any) => {
          if (!userChildMap.has(child.user_id)) {
            userChildMap.set(child.user_id, child.id);
          }
          childToUserMap.set(child.id, child.user_id);
        });

        // 写真を処理（O(n)で効率的）
        photos.forEach((photo: any) => {
          const userId = childToUserMap.get(photo.target_person_id);
          if (userId) {
            const firstChildId = userChildMap.get(userId);
            // 最初の子どもの最初の写真のみを追加
            if (photo.target_person_id === firstChildId && !photosMap.has(userId)) {
              photosMap.set(userId, [photo.photo_url]);
            }
          }
        });
      }
    }

    // データを整形
    const matchesWithProfiles = matchesData.map((match: any) => {
      const otherUserId = match.parent_id === user.id ? match.child_id : match.parent_id;
        // デバッグ: otherUserIdごとのプロフィール
        console.log('[Messages API] otherUserId:', otherUserId, profilesMap.get(otherUserId));
      const is_requester = match.parent_id === user.id;

      // 相手ユーザーの情報を取得
      let otherUserName = '名前なし';
      let otherUserRole = 'unknown';
      let otherUserImage = null;

        // プロフィール情報
        let otherUserBirthDate = null;
        let otherUserBirthplacePrefecture = null;
        let otherUserBirthplaceMunicipality = null;
        let otherUserGender = null;

      if (match.parent_id === user.id) {
        // 相手は子
        otherUserName = (match.child_last_name_kanji || '') + (match.child_first_name_kanji || '') || '名前なし';
        otherUserRole = match.child_role || 'unknown';
        otherUserImage = match.child_profile_image_url || null;
          const profile = profilesMap.get(match.child_id);
          if (profile) {
            otherUserBirthDate = profile.birth_date;
            otherUserBirthplacePrefecture = profile.birthplace_prefecture;
            otherUserBirthplaceMunicipality = profile.birthplace_municipality;
            otherUserGender = profile.gender;
          }
      } else {
        // 相手は親
        otherUserName = (match.parent_last_name_kanji || '') + (match.parent_first_name_kanji || '') || '名前なし';
        otherUserRole = match.parent_role || 'unknown';
        otherUserImage = match.parent_profile_image_url || null;
          const profile = profilesMap.get(match.parent_id);
          if (profile) {
            otherUserBirthDate = profile.birth_date;
            otherUserBirthplacePrefecture = profile.birthplace_prefecture;
            otherUserBirthplaceMunicipality = profile.birthplace_municipality;
            otherUserGender = profile.gender;
          }
      }

      // 未読数と最終メッセージを取得
      const unread_count = match.status === 'accepted' 
        ? (unreadCountsMap.get(match.id) || 0)
        : 0;

      let last_message = null;
      if (match.status === 'accepted') {
        const lastMsg = lastMessagesMap.get(match.id);
        if (lastMsg) {
          last_message = {
            content: lastMsg.content,
            created_at: lastMsg.created_at,
            is_own: lastMsg.sender_id === user.id,
          };
        }
      }

      // 子ども情報を取得
      let targetPeople = [];
      if (searchingChildren && searchingChildren.length > 0) {
        // そのユーザーの子ども情報をすべて取得
        targetPeople = searchingChildren
          .filter((child: any) => child.user_id === otherUserId)
          .map((child: any) => {
            // その子の写真
            const childPhotos = photos
              ? photos.filter((p: any) => p.target_person_id === child.id)
              : [];
            return {
              id: child.id,
              last_name_kanji: child.last_name_kanji,
              first_name_kanji: child.first_name_kanji,
              birthplace_prefecture: child.birthplace_prefecture,
              birthplace_municipality: child.birthplace_municipality,
              photo_url: childPhotos.length > 0 ? childPhotos[0].photo_url : null,
            };
          });
      }

      const searchingChildPhotos = photosMap.get(otherUserId) || [];

      return {
        id: match.id,
        parent_id: match.parent_id,
        child_id: match.child_id,
        similarity_score: match.similarity_score,
        status: match.status,
        created_at: match.created_at,
        updated_at: match.updated_at,
        other_user_name: otherUserName,
        other_user_role: otherUserRole,
        other_user_image: otherUserImage,
          other_user_birth_date: otherUserBirthDate,
          other_user_birthplace_prefecture: otherUserBirthplacePrefecture,
          other_user_birthplace_municipality: otherUserBirthplaceMunicipality,
          other_user_gender: otherUserGender,
        target_people: targetPeople,
        target_person_photos: searchingChildPhotos,
        is_requester,
        unread_count,
        last_message,
      };
    });

    return NextResponse.json({ 
      matches: matchesWithProfiles,
      pagination: {
        page,
        limit,
        total: totalCount || 0,
        total_pages: Math.ceil((totalCount || 0) / limit)
      }
    }, { status: 200 });
      // デバッグ: matchesWithProfiles
      console.log('[Messages API] matchesWithProfiles:', matchesWithProfiles);
  } catch (error: any) {
    console.error('Failed to fetch matches:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch matches' },
      { status: 500 }
    );
  }
}
