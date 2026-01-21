
/**
 * 双方向スコア合成（親→子60%、子→親40%）
 * parentToChild: 親→子方向スコア（0〜1）
 * childToParent: 子→親方向スコア（0〜1）
 * 戻り値: 0〜1
 */
function combineBidirectionalScore(parentToChild: number, childToParent: number): number {
  return parentToChild * 0.6 + childToParent * 0.4;
}
/**
 * 共通マッチングスコア計算: 自分と相手のtarget_peopleリストを相互に比較し、最も高いスコアを返す
 */
function calculateMutualMatchScore(
  myTargets: any[],
  theirTargets: any[],
  myProfile: any,
  theirProfile: any
): number {
  let maxScore = 0;
  // 自分が探している相手リストと、相手のプロフィールを比較
  for (const myTarget of myTargets) {
    const score = calculateSingleTargetScore(myTarget, theirProfile);
    if (score > maxScore) maxScore = score;
  }
  // 相手が探している相手リストと、自分のプロフィールを比較
  for (const theirTarget of theirTargets) {
    const score = calculateSingleTargetScore(theirTarget, myProfile);
    if (score > maxScore) maxScore = score;
  }
  return maxScore;

}

/**
 * 1つのtarget_people条件とプロフィールを比較し、スコアを算出
 */
function calculateSingleTargetScore(target: any, profile: any): number {
  let score = 0.2; // 基本スコア
  // 性別
  if (target.gender && profile.gender) {
    if (target.gender !== profile.gender) return 0;
  } else {
    score += 0.05;
  }
  // 生年月日
  if (target.birth_date && profile.birth_date) {
    const tYear = new Date(target.birth_date).getFullYear();
    const pYear = new Date(profile.birth_date).getFullYear();
    const yearDiff = Math.abs(tYear - pYear);
    if (yearDiff === 0) score += 0.2;
    else if (yearDiff <= 5) score += 0.15;
    else if (yearDiff <= 10) score += 0.10;
    else if (yearDiff <= 15) score += 0.05;
  } else {
    score += 0.05;
  }
  // 氏名（漢字・ひらがな）
  const targetName = [
    target.last_name_kanji || '',
    target.first_name_kanji || '',
    target.name_kanji || '',
    target.name_hiragana || '',
    target.last_name_hiragana || '',
    target.first_name_hiragana || '',
  ].join('');
  const profileName = [
    profile.last_name_kanji || '',
    profile.first_name_kanji || '',
    profile.name_kanji || '',
    profile.name_hiragana || '',
    profile.last_name_hiragana || '',
    profile.first_name_hiragana || '',
  ].join('');
  if (targetName && profileName && (profileName.includes(targetName) || targetName.includes(profileName))) {
    score += 0.1;
  }
    // 出身地スコア計算
    score += calculateBirthplaceScoreV2(target, profile);
  // スコア上限
  return Math.min(1.0, score);
}

/**
 * 出身地スコア計算（新仕様: +10点）
 * 都道府県一致で+7点、市区町村まで一致で+10点
 */
function calculateBirthplaceScoreV2(target: any, profile: any): number {
  if (!target.birthplace_prefecture || !profile.birthplace_prefecture) return 0;
  if (target.birthplace_prefecture !== profile.birthplace_prefecture) return 0;
  // 都道府県一致
  if (target.birthplace_municipality && profile.birthplace_municipality && target.birthplace_municipality === profile.birthplace_municipality) {
    return 10;
  }
  return 7;
}
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isTestModeBypassVerificationEnabled, isTestModeBypassSubscriptionEnabled } from '@/lib/utils/testMode';

// マッチングスコアの定数
const DEFAULT_PROFILE_MATCH_SCORE = 0.5; // 基本スコア
const SAME_YEAR_DAY_SCORE = 0.55; // 同じ年と日、異なる月
const SAME_YEAR_SCORE = 0.50; // 同じ年のみ

/**
 * 年齢範囲によるフォールバックマッチングを実行
 */
async function performAgeRangeFallbackMatching(
  admin: any,
  userId: string,
  userRole: string
): Promise<any[]> {
  console.log('[Matching] No RPC matches, trying age range matching...');
  const { data: currentProfile, error: profileError } = await admin
    .from('profiles')
    .select('birth_date, gender')
    .eq('user_id', userId)
    .single();

  console.log('[Matching] Current user profile:', currentProfile);
  if (profileError) {
    console.log('[Matching] Profile fetch error:', profileError);
    return [];
  }

  if (!currentProfile) {
    return [];
  }

  const currentBirthDate = new Date(currentProfile.birth_date);
  const currentAge = new Date().getFullYear() - currentBirthDate.getFullYear();

  // Asymmetric fallback rules
  const childAgeMax = 25;
  const parentAgeMin = 20;
  const parentAgeMax = 70;

  console.log(`[Matching] Current age: ${currentAge}`);

  // usersとprofilesをJOINし、profilesが存在するユーザーのみ取得
  const oppositeRole = userRole === 'parent' ? 'child' : 'parent';
  const { data: joinedUsers, error: joinError } = await admin
    .from('users')
    .select('id, profiles:profiles(user_id, birth_date, gender)')
    .eq('role', oppositeRole);

  if (joinError) {
    console.log('[Matching] Join error:', joinError);
    return [];
  }

  // profilesがnullでないユーザーのみ対象
  const validMatches = (joinedUsers || []).filter((u: any) => u.profiles && u.profiles.user_id);

  console.log('[Matching] Opposite role users with profiles:', validMatches);

  const filteredMatches = validMatches.filter((u: any) => {
    const profileBirthDate = new Date(u.profiles.birth_date);
    const profileAge = new Date().getFullYear() - profileBirthDate.getFullYear();

    // Fallback logic: allow plausible parent-child pairing
    let inRange = false;
    if (userRole === 'parent') {
      // Looking for child: accept ages 0-childAgeMax
      inRange = profileAge >= 0 && profileAge <= childAgeMax;
    } else {
      // Looking for parent: accept parent age between parentAgeMin and parentAgeMax and older than child
      inRange = profileAge >= parentAgeMin && profileAge <= parentAgeMax && profileAge > currentAge;
    }

    console.log(`[Matching] Profile ${u.profiles.user_id}: age=${profileAge}, inRange=${inRange}`);
    return inRange;
  });

  console.log('[Matching] Filtered matches:', filteredMatches);

  return filteredMatches.map((u: any) => ({
    matched_user_id: u.profiles.user_id,
    similarity_score: DEFAULT_PROFILE_MATCH_SCORE,
  }));
}

/**
 * 誕生日コンポーネントマッチによるスコア計算
 */
function calculateBirthdayScore(
  childYear: number,
  childMonth: number,
  childDay: number,
  matchYear: number,
  matchMonth: number,
  matchDay: number,
  childAge: number,
  matchAge: number
): number {
  const yearMatch = childYear === matchYear;
  const monthMatch = childMonth === matchMonth;
  const dayMatch = childDay === matchDay;

  // Score based on birthday component matches
  if (yearMatch && monthMatch && dayMatch) {
    return 0.80; // Same birthday
  }
  
  if (monthMatch && dayMatch) {
    return 0.70; // Same month and day but different year
  }
  
  if (yearMatch && monthMatch) {
    return 0.60; // Same year and month, different day
  }
  
  if (yearMatch && dayMatch) {
    return SAME_YEAR_DAY_SCORE;
  }
  
  if (yearMatch) {
    return SAME_YEAR_SCORE;
  }

  // Different year - check if plausible age match
  const ageDiff = Math.abs(childAge - matchAge);

  if (ageDiff === 0) return 0.25;
  if (ageDiff === 1) return 0.20;
  if (ageDiff === 2) return 0.15;
  if (ageDiff <= 5) return 0.10;
  return 0.05; // 6年以上の差は5%
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

/**
 * 子ども一人に対するマッチングスコアを計算
 */
function calculateChildMatchScore(
  child: any,
  match: any,
  profile: any,
  matchYear: number,
  matchMonth: number,
  matchDay: number
): number {
  let score = match.similarity_score;
  
  if (!child.birth_date) {
    return score;
  }

  const childBirthDate = new Date(child.birth_date);
  const childYear = childBirthDate.getFullYear();
  const childMonth = childBirthDate.getMonth();
  const childDay = childBirthDate.getDate();

  // Check name similarity using new fields
  const childLastNameKanji = child.last_name_kanji || '';
  const childFirstNameKanji = child.first_name_kanji || '';
  const childNameKanji = (child.name_kanji || '').trim() || (childLastNameKanji + childFirstNameKanji).trim();
  const childNameHiragana = child.name_hiragana || '';
  
  const matchLastNameKanji = profile.last_name_kanji || '';
  const matchFirstNameKanji = profile.first_name_kanji || '';
  const matchFullName = (matchLastNameKanji + matchFirstNameKanji).trim();
  
  // Check if child's name is contained in match's full name
  const nameMatch = 
    (childNameKanji && matchFullName.includes(childNameKanji)) ||
    (childNameHiragana && profile.last_name_hiragana && 
     (profile.last_name_hiragana + profile.first_name_hiragana).includes(childNameHiragana));

  console.log(
    `[Matching] Child ${child.id} vs user ${match.matched_user_id}: ` +
    `name=${nameMatch}`
  );

  // Calculate base score from birthday
  const childAge = new Date().getFullYear() - childYear;
  const matchAge = new Date().getFullYear() - matchYear;
  score = calculateBirthdayScore(
    childYear, childMonth, childDay,
    matchYear, matchMonth, matchDay,
    childAge, matchAge
  );

  // Apply name match bonus (max +0.10)
  if (nameMatch) {
    score += 0.10;
    console.log(
      `[Matching] Name match bonus applied. Child ${child.id}: ${score.toFixed(2)}`
    );
  }

  // Apply birthplace bonus (max +0.10)
  if (child.birthplace_prefecture && profile.birthplace_prefecture &&
      child.birthplace_prefecture === profile.birthplace_prefecture) {
    score += 0.10;
    console.log(
      `[Matching] Same prefecture bonus applied. Child ${child.id}: ${score.toFixed(2)}`
    );
  }

  // Cap at 1.0 (100%)
  return Math.min(1.0, score);
}

/**
 * 子アカウント用：子が探している親の条件と親候補のマッチングスコアを計算（子→親方向）
 */
async function calculateParentToChildReverseScore(
  admin: any,
  childUserId: string,
  parentProfile: any
): Promise<number | null> {
  // 子が探している親の情報を取得（searching_childrenテーブルを使用）
  const { data: searchingParents } = await admin
    .from('searching_children')
    .select('gender, birth_date, last_name_hiragana, first_name_hiragana, birthplace_prefecture')
    .eq('user_id', childUserId);

  if (!searchingParents || searchingParents.length === 0) {
    // 子が親を探す情報を登録していない場合はnull
    return null;
  }

  // 複数の親候補から最も高いスコアを選択
  let maxScore = 0;

  for (const searchingParent of searchingParents) {
    let score = 0.20; // 基本スコア

    // 性別チェック（重要）
    if (searchingParent.gender && parentProfile.gender) {
      if (searchingParent.gender !== parentProfile.gender) {
        continue; // 性別不一致の場合はスキップ
      }
      // 性別一致の場合は継続
    } else {
      // 性別情報がない場合は軽微なペナルティ
      score += 0.10;
    }

    // 生年の近さ（寛容）
    if (searchingParent.birth_date && parentProfile.birth_date) {
      const searchingYear = new Date(searchingParent.birth_date).getFullYear();
      const parentYear = new Date(parentProfile.birth_date).getFullYear();
      const yearDiff = Math.abs(searchingYear - parentYear);

      if (yearDiff <= 5) {
        score += 0.30;
      } else if (yearDiff <= 10) {
        score += 0.20;
      } else if (yearDiff <= 15) {
        // 部分一致チェック: 共通文字が1つでもあれば部分一致とみなす
        if (searchingParent.last_name_hiragana && parentProfile.last_name_hiragana) {
          const searchingHiragana = (searchingParent.last_name_hiragana + (searchingParent.first_name_hiragana || '')).trim();
          const parentHiragana = (parentProfile.last_name_hiragana + (parentProfile.first_name_hiragana || '')).trim();
          const parentCharSet = new Set(parentHiragana);
          let hasCommonChar = false;
          for (const char of searchingHiragana) {
            if (parentCharSet.has(char)) {
              hasCommonChar = true;
              break;
            }
          }
          if (hasCommonChar) {
            score += 0.10;
          }
        }
      }
    }

    // ひらがな氏名の一致（寛容）
    if (searchingParent.last_name_hiragana && parentProfile.last_name_hiragana) {
      const searchingHiragana = (searchingParent.last_name_hiragana + (searchingParent.first_name_hiragana || '')).trim();
      const parentHiragana = (parentProfile.last_name_hiragana + (parentProfile.first_name_hiragana || '')).trim();
      if (searchingHiragana && parentHiragana && parentHiragana.includes(searchingHiragana)) {
        score += 0.15;
      } else if (searchingHiragana && parentHiragana) {
        // 部分一致チェック
        const commonChars = searchingHiragana.split('').filter((char: string) => parentHiragana.includes(char));
        if (commonChars.length > 0) {
          score += 0.05;
        }
      }
    }

    // 出身地の一致（寛容）
    if (searchingParent.birthplace_prefecture && parentProfile.birthplace_prefecture) {
      if (searchingParent.birthplace_prefecture === parentProfile.birthplace_prefecture) {
        score += 0.15;
      }
    } else if (!searchingParent.birthplace_prefecture) {
      score += 0.05; // データなしの場合は軽微なボーナス
    }

    maxScore = Math.max(maxScore, score);
  }
  return maxScore > 0 ? Math.min(0.80, maxScore) : null; // 最大80%
}

/**
 * 子アカウント用：親候補に対するマッチングスコアを計算（親→子方向）
 */
async function calculateChildToParentMatchScore(
  admin: any,
  parentUserId: string,
  childProfile: any
): Promise<number> {
  // 親が探している子ども情報を取得
  const { data: searchingChildren } = await admin
    .from('searching_children')
    .select('birth_date, gender, last_name_kanji, first_name_kanji, name_kanji, name_hiragana, last_name_hiragana, first_name_hiragana, birthplace_prefecture, birthplace_municipality')
    .eq('user_id', parentUserId);

  if (!searchingChildren || searchingChildren.length === 0) {
    return DEFAULT_PROFILE_MATCH_SCORE;
  }
  // 子どもの生年月日でマッチする searching_children を探す
  const matchingChild = searchingChildren.find(
    (child: any) => child.birth_date === childProfile.birth_date
  );
  if (!matchingChild) {
    // 生年月日が一致しない場合は年齢ベースのスコアを返す
    return DEFAULT_PROFILE_MATCH_SCORE;
  }
  // 生年月日が完全一致している場合の詳細スコア計算
  let score = 0.80; // 生年月日完全一致の基本スコア
  // 氏名の一致チェック
  const childFullNameKanji = (childProfile.last_name_kanji || '') + (childProfile.first_name_kanji || '');
  const childFullNameHiragana = (childProfile.last_name_hiragana || '') + (childProfile.first_name_hiragana || '');
  const searchingNameKanji = (matchingChild.last_name_kanji || '') + (matchingChild.first_name_kanji || '');
  const searchingNameKanjiAlt = matchingChild.name_kanji || '';
  const searchingNameHiragana = (matchingChild.last_name_hiragana || '') + (matchingChild.first_name_hiragana || '');
  const searchingNameHiraganaAlt = matchingChild.name_hiragana || '';
  // 漢字氏名の一致
  const kanjiMatch = 
    (searchingNameKanji && childFullNameKanji.includes(searchingNameKanji)) ||
    (searchingNameKanjiAlt && childFullNameKanji.includes(searchingNameKanjiAlt)) ||
    (childFullNameKanji && searchingNameKanji && searchingNameKanji.includes(childFullNameKanji));
  // ひらがな氏名の一致
  const hiraganaMatch = 
    (searchingNameHiragana && childFullNameHiragana.includes(searchingNameHiragana)) ||
    (searchingNameHiraganaAlt && childFullNameHiragana.includes(searchingNameHiraganaAlt)) ||
    (childFullNameHiragana && searchingNameHiragana && searchingNameHiragana.includes(childFullNameHiragana));
  if (kanjiMatch || hiraganaMatch) {
    score += 0.10;
    console.log(
      `[Matching] Child name match bonus. Parent ${parentUserId}: ${score.toFixed(2)}`
    );
  }
  // 出身地の一致チェック
  // ...（必要に応じて追加）
  return score;

/**
 * 氏名（ひらがな）スコア計算（新仕様: +10点）
 * 完全一致・部分一致ともに+10点
 */
function calculateHiraganaNameScoreV2(target: any, profile: any): number {
  const targetName = (target.name_hiragana || '') + (target.last_name_hiragana || '') + (target.first_name_hiragana || '');
  const profileName = (profile.name_hiragana || '') + (profile.last_name_hiragana || '') + (profile.first_name_hiragana || '');
  if (!targetName || !profileName) return 0;
  if (profileName.includes(targetName) || targetName.includes(profileName)) {
    return 10;
  }
  // 部分一致（2文字以上の共通部分があれば加点）
  for (let i = 0; i < targetName.length - 1; i++) {
    const part = targetName.slice(i, i + 2);
    if (profileName.includes(part)) {
      return 10;
    }
  }
  return 0;
}

/**
 * 逆方向マッチングスコアの計算（子→親）
 */
async function calculateReverseMatchingScore(
  admin: any,
  matchedUserId: string,
  currentUserProfile: any
): Promise<number | null> {
  const { data: matchedChildSearchingParent } = await admin
    .from('searching_children')
    .select('gender, birth_date, last_name_hiragana, first_name_hiragana, birthplace_prefecture')
    .eq('id', matchedUserId)
    .single();

  if (!matchedChildSearchingParent) {
    return null;
  }
  // Gender check - REQUIRED for child→parent matching
  if (!matchedChildSearchingParent.gender || !currentUserProfile.gender) {
    return null;
  }
  if (matchedChildSearchingParent.gender !== currentUserProfile.gender) {
    return 0; // Gender mismatch - exclude this candidate
  }
  // Gender match - calculate reverse score
  let reverseScore = 0.20; // Base score for gender match
  // Birth year proximity (lenient)
  if (matchedChildSearchingParent.birth_date && currentUserProfile.birth_date) {
    const searchingYear = new Date(matchedChildSearchingParent.birth_date).getFullYear();
    const parentYear = new Date(currentUserProfile.birth_date).getFullYear();
    const yearDiff = Math.abs(searchingYear - parentYear);
    if (yearDiff <= 5) {
      reverseScore += 0.30;
    } else if (yearDiff <= 10) {
      reverseScore += 0.20;
    }
  } else {
    reverseScore += 0.10; // No data penalty is mild
  }
  // Hiragana name match (lenient)
  if (matchedChildSearchingParent.last_name_hiragana && currentUserProfile.last_name_hiragana) {
    const searchingHiragana = (matchedChildSearchingParent.last_name_hiragana + (matchedChildSearchingParent.first_name_hiragana || '')).trim();
    const parentHiragana = (currentUserProfile.last_name_hiragana + (currentUserProfile.first_name_hiragana || '')).trim();
    if (searchingHiragana && parentHiragana && parentHiragana.includes(searchingHiragana)) {
      reverseScore += 0.15;
    }
  }
  // Birthplace match (lenient)
  if (matchedChildSearchingParent.birthplace_prefecture && currentUserProfile.birthplace_prefecture) {
    if (matchedChildSearchingParent.birthplace_prefecture === currentUserProfile.birthplace_prefecture) {
      reverseScore += 0.15;
    }
  } else if (!matchedChildSearchingParent.birthplace_prefecture) {
    reverseScore += 0.05; // Mild bonus for no data
  }
  return Math.min(0.80, reverseScore); // Cap reverse score at 80%
}
}



// マッチ候補詳細を取得しスコア計算
async function getMatchDetails(admin: any, user: any, userData: any, myTargetPeople: any[]) {
  // マッチ候補取得
  let matches = await performAgeRangeFallbackMatching(admin, user.id, userData.role);
  // 各候補の詳細取得とスコア計算
  const matchDetails = await Promise.all(
    matches.map(async (match: any) => {
      // 相手のプロフィール
      const { data: theirProfile } = await admin
        .from('profiles')
        .select('last_name_kanji, first_name_kanji, last_name_hiragana, first_name_hiragana, birth_date, bio, profile_image_url, gender, birthplace_prefecture, birthplace_municipality')
        .eq('user_id', match.matched_user_id)
        .single();
      // 相手のtarget_peopleリスト
      const theirTargetPeople = await getTargetPeopleInfo(admin, match.matched_user_id);
      // 自分のプロフィール
      const { data: myProfile } = await admin
        .from('profiles')
        .select('last_name_kanji, first_name_kanji, last_name_hiragana, first_name_hiragana, birth_date, bio, profile_image_url, gender, birthplace_prefecture, birthplace_municipality')
        .eq('user_id', user.id)
        .single();
      // 親→子・子→親スコア計算
      let parentToChild = 0;
      let childToParent = 0;
      if (userData.role === 'parent') {
        parentToChild = calculateMutualMatchScore(myTargetPeople, theirTargetPeople, myProfile, theirProfile);
        childToParent = calculateMutualMatchScore(theirTargetPeople, myTargetPeople, theirProfile, myProfile);
      } else {
        parentToChild = calculateMutualMatchScore(theirTargetPeople, myTargetPeople, theirProfile, myProfile);
        childToParent = calculateMutualMatchScore(myTargetPeople, theirTargetPeople, myProfile, theirProfile);
      }
      const similarityScore = combineBidirectionalScore(parentToChild, childToParent);
      return {
        userId: match.matched_user_id,
        similarityScore,
        profile: theirProfile,
        theirTargetPeople,
        role: userData.role === 'parent' ? 'child' : 'parent',
      };
    })
  );
  // スコア0の候補は除外
  return matchDetails.filter(match => match.similarityScore > 0);
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { data: userData } = await admin
      .from('users')
      .select('role, verification_status')
      .eq('id', user.id)
      .single();
    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
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
