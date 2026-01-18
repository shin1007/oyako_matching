import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

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

  // Get opposite role users
  const oppositeRole = userRole === 'parent' ? 'child' : 'parent';
  const { data: oppositeRoleUsers } = await admin
    .from('users')
    .select('id')
    .eq('role', oppositeRole);

  console.log(`[Matching] Opposite role (${oppositeRole}) users:`, oppositeRoleUsers);

  if (!oppositeRoleUsers || oppositeRoleUsers.length === 0) {
    return [];
  }

  const oppositeUserIds = oppositeRoleUsers.map((u: any) => u.id);
  
  // Get profiles for these users
  const { data: potentialMatches } = await admin
    .from('profiles')
    .select('user_id, birth_date')
    .in('user_id', oppositeUserIds);

  console.log('[Matching] Potential matches (all):', potentialMatches);

  if (!potentialMatches) {
    return [];
  }

  const filteredMatches = potentialMatches.filter((profile: any) => {
    const profileBirthDate = new Date(profile.birth_date);
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

    console.log(`[Matching] Profile ${profile.user_id}: age=${profileAge}, inRange=${inRange}`);
    return inRange;
  });

  console.log('[Matching] Filtered matches:', filteredMatches);

  return filteredMatches.map((profile: any) => ({
    matched_user_id: profile.user_id,
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
 * マッチしたユーザーの探している子ども情報を取得
 */
async function getSearchingChildrenInfo(
  admin: any,
  matchedUserId: string,
  targetRole: string
): Promise<any[]> {
  if (targetRole === 'parent') {
    // 相手が親の場合、その親が探している子ども情報を取得
    const { data: childrenData } = await admin
      .from('searching_children')
      .select('id, last_name_kanji, first_name_kanji, birthplace_prefecture, birthplace_municipality')
      .eq('user_id', matchedUserId)
      .order('display_order', { ascending: true });
    return childrenData || [];
  }

  if (targetRole === 'child') {
    // 相手が子の場合、その子の親ユーザー情報を取得
    const { data: childData } = await admin
      .from('searching_children')
      .select('user_id')
      .eq('id', matchedUserId)
      .single();
    
    if (!childData?.user_id) {
      return [];
    }

    // その親が探している他の子ども情報を取得
    const { data: parentChildrenData } = await admin
      .from('searching_children')
      .select('id, last_name_kanji, first_name_kanji, birthplace_prefecture, birthplace_municipality')
      .eq('user_id', childData.user_id)
      .order('display_order', { ascending: true });
    return parentChildrenData || [];
  }

  return [];
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

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();

    // 早期リターン: 認証チェック
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user role
    const { data: userData } = await admin
      .from('users')
      .select('role, verification_status')
      .eq('id', user.id)
      .single();

    // 早期リターン: ユーザーデータチェック
    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // テストモードチェック（開発環境のみ有効）
    const isTestMode = process.env.NODE_ENV === 'development' && 
                       process.env.ENABLE_TEST_MODE === 'true';

    // 早期リターン: 本人確認チェック（テストモードではスキップ）
    if (!isTestMode && userData.verification_status !== 'verified') {
      return NextResponse.json(
        { error: '本人確認が必要です' },
        { status: 403 }
      );
    }

    // 早期リターン: サブスクリプションチェック（テストモードではスキップ）
    if (!isTestMode && userData.role === 'parent') {
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

    // Find potential matches using age range and profile information as primary matching algorithm
    let matches = await performAgeRangeFallbackMatching(admin, user.id, userData.role);

    console.log('[Matching] Final matches count:', matches.length);

    // For parents, fetch searching children to render cards even if no matches
    let searchingChildren: any[] = [];
    if (userData.role === 'parent') {
      const { data: children } = await admin
        .from('searching_children')
        .select('id, last_name_kanji, first_name_kanji, name_kanji, name_hiragana, birth_date, gender, birthplace_prefecture, birthplace_municipality, display_order')
        .eq('user_id', user.id)
        .order('display_order', { ascending: true });
      searchingChildren = children || [];
    }

    // Get full details for each match
    const matchDetails = await Promise.all(
      matches.map(async (match: any) => {
        const { data: profile } = await admin
          .from('profiles')
          .select('last_name_kanji, first_name_kanji, last_name_hiragana, first_name_hiragana, birth_date, bio, profile_image_url, gender, birthplace_prefecture, birthplace_municipality')
          .eq('user_id', match.matched_user_id)
          .single();

        const { data: targetUserData } = await admin
          .from('users')
          .select('role')
          .eq('id', match.matched_user_id)
          .single();

        // Get current user's profile for reverse matching
        const { data: currentUserProfile } = await admin
          .from('profiles')
          .select('last_name_kanji, first_name_kanji, last_name_hiragana, first_name_hiragana, birth_date, gender, birthplace_prefecture, birthplace_municipality')
          .eq('user_id', user.id)
          .single();

        // For parents, calculate scores per child
        const scorePerChild: Record<string, number> = {};
        if (userData.role === 'parent' && searchingChildren.length > 0 && profile?.birth_date) {
          const matchBirthDate = new Date(profile.birth_date);
          const matchYear = matchBirthDate.getFullYear();
          const matchMonth = matchBirthDate.getMonth();
          const matchDay = matchBirthDate.getDate();

          // Calculate score for each searching child
          for (const child of searchingChildren) {
            let score = calculateChildMatchScore(
              child,
              match,
              profile,
              matchYear,
              matchMonth,
              matchDay
            );

            // Calculate reverse matching score (child → parent) if applicable
            if (targetUserData?.role === 'child' && currentUserProfile) {
              const reverseScore = await calculateReverseMatchingScore(
                admin,
                match.matched_user_id,
                currentUserProfile
              );

              if (reverseScore === 0) {
                // Gender mismatch - exclude this candidate
                score = 0;
                console.log(
                  `[Matching] Gender mismatch - Child ${child.id}. Score set to 0.`
                );
              } else if (reverseScore !== null) {
                // Calculate weighted average (parent→child: 60%, child→parent: 40%)
                const originalScore = score;
                score = (originalScore * 0.60) + (reverseScore * 0.40);

                console.log(
                  `[Matching] Bidirectional score - Child ${child.id}: ` +
                  `parent→child=${originalScore.toFixed(2)}, child→parent=${reverseScore.toFixed(2)}, ` +
                  `final=${score.toFixed(2)}`
                );
              }
            }

            scorePerChild[child.id] = score;
          }
        }

        // Get searching children info for this matched user
        const searchingChildrenInfo = await getSearchingChildrenInfo(
          admin,
          match.matched_user_id,
          targetUserData?.role || ''
        );

        return {
          userId: match.matched_user_id,
          similarityScore: match.similarity_score,
          scorePerChild, // 子どもごとのスコア
          role: targetUserData?.role,
          profile,
          searchingChildrenInfo, // 相手親が探している子ども情報
        };
      })
    );

    // Filter out candidates with 0 score (e.g., gender mismatch in child→parent matching)
    const filteredMatchDetails = matchDetails.filter(match => {
      if (userData.role === 'parent' && match.scorePerChild) {
        // Check if any child has non-zero score
        return Object.values(match.scorePerChild).some((score: any) => score > 0);
      }
      return true;
    });

    return NextResponse.json({ candidates: filteredMatchDetails, userRole: userData.role, searchingChildren });
  } catch (error: any) {
    console.error('Match search error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to search matches' },
      { status: 500 }
    );
  }
}
