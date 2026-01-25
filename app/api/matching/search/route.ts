import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit, recordRateLimitAction } from '@/lib/rate-limit';
import { rateLimit429 } from '@/lib/rate-limit429';
import { createAdminClient } from '@/lib/supabase/admin';
import { isTestModeBypassVerificationEnabled, isTestModeBypassSubscriptionEnabled } from '@/lib/utils/testMode';

// 出身地一致度スコア計算（1人分）
function calculateBirthplaceScore(person: any, theirProfile: any): number {
  if (!person || !theirProfile) return 0;
  // 都道府県が一致
  if (person.birthplace_prefecture && theirProfile.birthplace_prefecture && person.birthplace_prefecture === theirProfile.birthplace_prefecture) {
    // 市区町村も一致
    if (person.birthplace_municipality && theirProfile.birthplace_municipality && person.birthplace_municipality === theirProfile.birthplace_municipality) {
      return 10;
    }
    return 7;
  }
  return 0;
}
// 氏名（ひらがな）一致度スコア計算（1人分）
function calculateNameScore(target: any, theirProfile: any): number {
  if (!target || !theirProfile) return 0;
  // 両方一致なら最大
  if (
    target.last_name_hiragana && theirProfile.last_name_hiragana && target.last_name_hiragana === theirProfile.last_name_hiragana &&
    target.first_name_hiragana && theirProfile.first_name_hiragana && target.first_name_hiragana === theirProfile.first_name_hiragana
  ) {
    return 10;
  }
  // 下の名前一致
  if (target.first_name_hiragana && theirProfile.first_name_hiragana && target.first_name_hiragana === theirProfile.first_name_hiragana) {
    return 7;
  }
  // 名字一致
  if (target.last_name_hiragana && theirProfile.last_name_hiragana && target.last_name_hiragana === theirProfile.last_name_hiragana) {
    return 3;
  }
  return 0;
}
// 誕生日一致度スコア計算（1人分）
function calculateBirthdayScore(target: any, theirProfile: any): number {
  if (!target || !theirProfile) return 0;
  const targetBirthDate = target.birth_date;
  if (!targetBirthDate) return 0;
  const theirBirthDate = theirProfile.birth_date;
  if (!theirBirthDate) return 0;
  const [myY, myM, myD] = targetBirthDate.split('-');
  const [thY, thM, thD] = theirBirthDate.split('-');
  let score = 0;
  if (myY === thY && myM === thM && myD === thD) {
    return 80;
  }
  if (myM === thM && myD === thD) {
    score = 70;
  } else if (myY === thY && myM === thM) {
    score = 60;
  }

  let ageDifferences = [1, 2, 3, 4, 5];
  if (target.role === 'parent'){
    ageDifferences = [2, 4, 6, 8, 10];
  }
  const ageDiff = ageDifference(targetBirthDate, theirProfile);
  if (ageDiff <= ageDifferences[0]) {
    score += 5;
  } else if (ageDiff <= ageDifferences[1]) {
    score += 4;
  } else if (ageDiff <= ageDifferences[2]) {
    score += 3;
  } else if (ageDiff <= ageDifferences[3]) {
    score += 2;
  } else if (ageDiff <= ageDifferences[4]) {
    score += 1;
  }
  return score;
}
function ageDifference(birthDate1: string, birthDate2: string): number {
  const date1 = new Date(birthDate1);
  const date2 = new Date(birthDate2);
  return Math.abs(date1.getFullYear() - date2.getFullYear());
}



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


// マッチ候補詳細を取得しスコア計算
async function getMatchDetails(admin: any, user: any, userData: any, myTargetPeople: any[]) {
  // 自分以外の全 oppositeRole ユーザーを取得
  const oppositeRole = userData.role === 'parent' ? 'child' : 'parent';
  const { data: joinedUsers, error: joinError } = await admin
    .from('users')
    .select('id')
    .eq('role', oppositeRole);
  const {data: myProfile} = await admin
    .from('profiles')
    .select('birth_date, last_name_kanji, first_name_kanji, last_name_hiragana, first_name_hiragana, birthplace_prefecture, birthplace_municipality')
    .eq('user_id', user.id)
    .single();
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

        // 各myTargetPeopleごとにスコア計算
        let targetScores: any[] = [];
        if (Array.isArray(myTargetPeople) && myTargetPeople.length > 0) {
          for (const target of myTargetPeople) {
            // 自分が探している相手と、見つかったお相手のプロフィールを比較してスコア計算
            const birthdayScore = calculateBirthdayScore(target, theirProfile) * 0.6;
            const nameScore = calculateNameScore(target, theirProfile) * 0.6;
            const birthplaceScore = calculateBirthplaceScore(target, theirProfile) * 0.6;
            // 双方向マッチング
            // 見つかったお相手が探している人物と自分のプロフィールを比較してスコア計算
            let oppositeScore = 0;
            for (const theirTarget of theirTargetPeople) {
              if (!theirTarget.id === u.id) continue;
              oppositeScore += calculateBirthdayScore(theirTarget, myProfile) * 0.4;
              oppositeScore += calculateNameScore(theirTarget, myProfile) * 0.4;
              oppositeScore += calculateBirthplaceScore(theirTarget, myProfile) * 0.4;
            }
            const totalScore = birthdayScore + nameScore + birthplaceScore + oppositeScore;
                
            targetScores.push({
              target,
              birthdayScore,
              nameScore,
              birthplaceScore,
              oppositeScore,
              totalScore
            });
          }
        }
        return {
          userId: u.id,
          targetScores,
        };
      })
  );
  // null除外
  return matchDetails.filter(match => match !== null);
}

// 既存マッチ状態を付与
async function attachExistingMatchStatus(admin: any, user: any, userData: any, matchDetails: any[]) {
  return Promise.all(
    matchDetails.map(async (candidate) => {
      const userColumn = userData.role === 'parent' ? 'parent_id' : 'child_id';
      const candidateColumn = userData.role === 'parent' ? 'child_id' : 'parent_id';
      const { data: existingMatch } = await admin
        .from('matches')
        .select('id, status, blocked_by, requester_id')
        .or(`${userColumn}.eq.${user.id},${candidateColumn}.eq.${candidate.userId}`)
        .maybeSingle();

      // profilesテーブルからroleを直接取得
      const { data: userProfile } = await admin
        .from('profiles')
        .select('last_name_kanji, first_name_kanji, last_name_hiragana, first_name_hiragana, birth_date, bio, profile_image_url, gender, birthplace_prefecture, birthplace_municipality, user_id, role')
        .eq('user_id', candidate.userId)
        .single();

      return {
        ...candidate,
        existingMatchId: existingMatch?.id || null,
        existingMatchStatus: existingMatch?.status || null,
        blocked_by: existingMatch?.blocked_by || null,
        requesterId: existingMatch?.requester_id || null,
        currentUserId: user.id,
        profile: userProfile || null,
        theirTargetPeople: await getTargetPeopleInfo(admin, candidate.userId),
        role: userProfile?.role || null,
      };
    })
  );
}

export async function GET(request: NextRequest) {
    // レートリミット（IPアドレス単位: 1分10回・1時間50回）
    // checkRateLimit/recordRateLimitActionはuserIdがIPアドレスの場合、ip_addressカラムで判定・記録する
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const supabase = await createClient();
    const rateLimitResult = await checkRateLimit(
      supabase,
      ip,
      'matching_search',
      [
        { windowSeconds: 60, maxActions: 10 },
        { windowSeconds: 3600, maxActions: 50 }
      ]
    );
    if (!rateLimitResult.allowed) {
      return rateLimit429(rateLimitResult.message, rateLimitResult.retryAfter?.toISOString());
    }
  try {
    const admin = createAdminClient();
    const { user, userData } = await getAuthenticatedUserAndData(supabase, admin);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // レートリミットアクション記録（IPアドレス単位）
    await recordRateLimitAction(supabase, ip, 'matching_search');
    const authError = await checkUserAuthorization(admin, user, userData);
    if (authError) return authError;
    const myTargetPeople = await getTargetPeopleInfo(admin, user.id);
    // 自分のプロフィール情報（role含む）を取得
    const { data: myProfile } = await admin
      .from('profiles')
      .select('last_name_kanji, first_name_kanji, last_name_hiragana, first_name_hiragana, birth_date, bio, profile_image_url, gender, birthplace_prefecture, birthplace_municipality, user_id, role')
      .eq('user_id', user.id)
      .single();
    const matchDetails = await getMatchDetails(admin, user, userData, myTargetPeople);

    // ★候補ごとにmatchesテーブルへpendingレコードをupsert
    for (const candidate of matchDetails) {
      const parentId = userData.role === 'parent' ? user.id : candidate.userId;
      const childId = userData.role === 'parent' ? candidate.userId : user.id;
      // 既存レコードを取得
      const { data: existingMatch } = await supabase
        .from('matches')
        .select('status')
        .eq('parent_id', parentId)
        .eq('child_id', childId)
        .maybeSingle();
      // pending/accepted/blockedがあればupsertしない（pre_entryのみupsert）
      if (existingMatch && ['pending', 'accepted', 'blocked'].includes(existingMatch.status)) {
        continue;
      }
      const { data: upsertData, error: upsertError } = await supabase
        .from('matches')
        .upsert({
          parent_id: parentId,
          child_id: childId,
          similarity_score: candidate.targetScores?.[0]?.totalScore || 0,
          status: 'pre_entry',
        }, { onConflict: 'parent_id,child_id' });
      if (upsertError) {
        console.error('[matches upsert error]', upsertError);
      } else {
        console.log('[matches upsert result]', upsertData);
      }
    }

    const candidatesWithMatchStatus = await attachExistingMatchStatus(admin, user, userData, matchDetails);
    return NextResponse.json({ candidates: candidatesWithMatchStatus, userRole: userData.role, myTargetPeople, profile: myProfile });
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
