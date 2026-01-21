
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isTestModeBypassVerificationEnabled, isTestModeBypassSubscriptionEnabled } from '@/lib/utils/testMode';


/**
 * マッチしたユーザーのtarget_people情報を取得（親・子共通）
 */
async function getTargetPeopleInfo(
  admin: any,
  userId: string
): Promise<any[]> {
  // target_peopleテーブルから、そのユーザーが探している人物情報を取得
  const { data: targetPeople } = await admin
    .from('target_people')
    .select(`
      id,
      last_name_kanji,
      first_name_kanji,
      birthplace_prefecture,
      birthplace_municipality,
      birth_date,
      gender,
      name_kanji,
      name_hiragana,
      last_name_hiragana,
      first_name_hiragana,
      display_order
    `)
    .eq('user_id', userId)
    .order('display_order', { ascending: true });

  if (!targetPeople) return [];

  // 各人物の写真を取得（target_people_photosテーブルに対応）
  const peopleWithPhotos = await Promise.all(
    targetPeople.map(async (person: any) => {
      const { data: photosData } = await admin
        .from('target_people_photos')
        .select('photo_url')
        .eq('target_person_id', person.id)
        .order('display_order', { ascending: true })
        .limit(1);

      return {
        ...person,
        photo_url: photosData && photosData.length > 0 ? photosData[0].photo_url : null
      };
    })
  );

  return peopleWithPhotos;
}


// マッチ候補詳細を取得しスコア計算（全ユーザーを候補とし、スコア66%固定）
async function getMatchDetails(admin: any, user: any, userData: any, myTargetPeople: any[]) {
  // 自分以外の全 oppositeRole ユーザーを取得
  const oppositeRole = userData.role === 'parent' ? 'child' : 'parent';
  const { data: joinedUsers, error: joinError } = await admin
    .from('users')
    .select('id')
    .eq('role', oppositeRole);
  if (joinError || !joinedUsers) return [];
  const matchDetails = await Promise.all(
    joinedUsers
      .filter((u: any) => u.id !== user.id)
      .map(async (u: any) => {
        // 相手のプロフィール
        const { data: theirProfile } = await admin
          .from('profiles')
          .select('last_name_kanji, first_name_kanji, last_name_hiragana, first_name_hiragana, birth_date, bio, profile_image_url, gender, birthplace_prefecture, birthplace_municipality')
          .eq('user_id', u.id)
          .single();
        if (!theirProfile) return null;
        // 相手のtarget_peopleリスト
        const theirTargetPeople = await getTargetPeopleInfo(admin, u.id);
        return {
          userId: u.id,
          similarityScore: 0.66,
          profile: theirProfile,
          theirTargetPeople,
          role: userData.role === 'parent' ? 'child' : 'parent',
        };
      })
  );
  // null除外
  return matchDetails.filter(match => match && match.similarityScore > 0);
}

// 既存マッチ状態を付与
async function attachExistingMatchStatus(admin: any, user: any, userData: any, matchDetails: any[]) {
  return Promise.all(
    matchDetails.map(async (candidate) => {
      const userColumn = userData.role === 'parent' ? 'parent_id' : 'child_id';
      const candidateColumn = userData.role === 'parent' ? 'child_id' : 'parent_id';
      const { data: existingMatch } = await admin
        .from('matches')
        .select('id, status')
        .or(`${userColumn}.eq.${user.id},${candidateColumn}.eq.${candidate.userId}`)
        .maybeSingle();
      return {
        ...candidate,
        existingMatchId: existingMatch?.id || null,
        existingMatchStatus: existingMatch?.status || null,
      };
    })
  );
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();
    const { user, userData } = await getAuthenticatedUserAndData(supabase, admin);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    const authError = await checkUserAuthorization(admin, user, userData);
    if (authError) return authError;
    const myTargetPeople = await getTargetPeopleInfo(admin, user.id);
    const matchDetails = await getMatchDetails(admin, user, userData, myTargetPeople);
    console.log('[Matching] Filtered matches count (score > 0):', matchDetails.length);
    const candidatesWithMatchStatus = await attachExistingMatchStatus(admin, user, userData, matchDetails);
    return NextResponse.json({ candidates: candidatesWithMatchStatus, userRole: userData.role, myTargetPeople });
  } catch (error: any) {
    console.error('Match search error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to search matches' },
      { status: 500 }
    );
  }
}

// ユーザー認証・ユーザーデータ取得
async function getAuthenticatedUserAndData(supabase: any, admin: any) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, userData: null };
  const { data: userData } = await admin
    .from('users')
    .select('role, verification_status')
    .eq('id', user.id)
    .single();
  return { user, userData };
}

// 本人確認・サブスク等の権限チェック
async function checkUserAuthorization(admin: any, user: any, userData: any) {
  const bypassVerification = isTestModeBypassVerificationEnabled();
  const bypassSubscription = isTestModeBypassSubscriptionEnabled();
  if (!bypassVerification && userData.verification_status !== 'verified') {
    return NextResponse.json(
      { error: '本人確認が必要です' },
      { status: 403 }
    );
  }
  if (!bypassSubscription && userData.role === 'parent') {
    const { data: subscription } = await admin
      .from('subscriptions')
      .select('status')
      .eq('user_id', user.id)
      .single();
    if (!subscription || subscription.status !== 'active') {
      return NextResponse.json(
        { error: 'アクティブなサブスクリプションが必要です' },
        { status: 403 }
      );
    }
  }
  return null;
}
