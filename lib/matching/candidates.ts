import { createClient } from '@/lib/supabase/server';

/**
 * マッチング候補の情報
 */
export interface MatchingCandidate {
  userId: string;
  lastNameKanji: string;
  firstNameKanji: string;
  lastNameHiragana?: string;
  firstNameHiragana?: string;
  birthDate: string;
  gender?: string;
  birthplacePrefecture?: string;
  birthplaceMunicipality?: string;
}

/**
 * 氏名から表示名を生成
 */
function getDisplayName(lastNameKanji: string, firstNameKanji: string): string {
  return `${lastNameKanji}${firstNameKanji}`.trim() || '名前なし';
}

/**
 * ひらがなの類似度を計算（簡易版）
 * 同じひらがなが含まれる場合は0.1ボーナス
 */
function calculateHiraganaSimilarity(
  childHiragana: string | null | undefined,
  parentHiragana: string | null | undefined
): number {
  if (!childHiragana || !parentHiragana) return 0;
  
  // 同じひらがなが含まれるかチェック
  if (childHiragana === parentHiragana) return 0.15;
  
  // 部分一致でボーナス
  const childChars = new Set(childHiragana);
  const commonChars = Array.from(parentHiragana).filter(char => childChars.has(char));
  return commonChars.length / Math.max(childHiragana.length, parentHiragana.length) * 0.1;
}

/**
 * 出身地による類似度を計算
 */
function calculateBirthplaceSimilarity(
  childPref: string | null | undefined,
  parentPref: string | null | undefined,
  childMuni?: string | null | undefined,
  parentMuni?: string | null | undefined
): number {
  if (!childPref || !parentPref) return 0;
  
  // 同じ都道府県: 0.2ボーナス
  if (childPref === parentPref) {
    // さらに市区町村も同じ場合: +0.1
    if (childMuni && parentMuni && childMuni === parentMuni) {
      return 0.3;
    }
    return 0.2;
  }
  
  return 0;
}

/**
 * 親ユーザー向け：マッチング候補を取得
 * searching_children テーブルの情報と一致する子ユーザーを検索
 */
async function getParentMatchingCandidates(userId: string): Promise<MatchingCandidate[]> {
  const supabase = await createClient();
  
  // 親ユーザーが探している子どもの情報を取得
  const { data: searchingChildren, error: searchError } = await supabase
    .from('searching_children')
    .select('birth_date, gender, last_name_hiragana, first_name_hiragana, birthplace_prefecture, birthplace_municipality')
    .eq('user_id', userId)
    .not('birth_date', 'is', null);

  // 早期リターン: データ取得エラーまたはデータなし
  if (searchError || !searchingChildren || searchingChildren.length === 0) {
    return [];
  }

  // 各子どもの生年月日に一致する子ユーザーを検索
  const candidates: MatchingCandidate[] = [];
  const birthDates = Array.from(new Set(searchingChildren.map(child => child.birth_date).filter(Boolean)));

  // 早期リターン: 生年月日なし
  if (birthDates.length === 0) {
    return [];
  }

  // 子ユーザーのプロフィールを取得（新フィールド対応）
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('user_id, last_name_kanji, first_name_kanji, last_name_hiragana, first_name_hiragana, birth_date, gender, birthplace_prefecture, birthplace_municipality')
    .in('birth_date', birthDates);

  if (!profileError && profiles) {
    for (const profile of profiles) {
      // 早期 continue: 自分自身は除外
      if (profile.user_id === userId) continue;
      
      // 早期 continue: 重複チェック
      if (candidates.some(c => c.userId === profile.user_id)) continue;

      // 早期 continue: フィールド必須チェック
      if (!profile.last_name_kanji || !profile.first_name_kanji) continue;

      candidates.push({
        userId: profile.user_id,
        lastNameKanji: profile.last_name_kanji,
        firstNameKanji: profile.first_name_kanji,
        lastNameHiragana: profile.last_name_hiragana || undefined,
        firstNameHiragana: profile.first_name_hiragana || undefined,
        birthDate: profile.birth_date,
        gender: profile.gender || undefined,
        birthplacePrefecture: profile.birthplace_prefecture || undefined,
        birthplaceMunicipality: profile.birthplace_municipality || undefined,
      });
    }
  }

  return candidates;
}

/**
 * 子ユーザー向け：マッチング候補を取得
 * 自身の プロフィール情報と一致する親の searching_children を検索
 */
async function getChildMatchingCandidates(userId: string): Promise<MatchingCandidate[]> {
  const supabase = await createClient();
  
  // 子ユーザー自身のプロフィール情報を取得
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('birth_date, last_name_hiragana, first_name_hiragana, birthplace_prefecture, birthplace_municipality')
    .eq('user_id', userId)
    .single();

  // 早期リターン: プロフィールエラーまたは生年月日なし
  if (profileError || !profile || !profile.birth_date) {
    return [];
  }

  // 同じ生年月日を searching_children に持つ親ユーザーを検索
  const { data: searchingChildren, error: searchError } = await supabase
    .from('searching_children')
    .select('user_id, birth_date')
    .eq('birth_date', profile.birth_date);

  // 早期リターン: データ取得エラーまたはデータなし
  if (searchError || !searchingChildren || searchingChildren.length === 0) {
    return [];
  }

  // 親ユーザーのプロフィール情報を取得（新フィールド対応）
  const parentUserIds = Array.from(new Set(searchingChildren.map(sc => sc.user_id)));
  const candidates: MatchingCandidate[] = [];

  // 早期リターン: 親ユーザーIDなし
  if (parentUserIds.length === 0) {
    return [];
  }

  const { data: parentProfiles, error: parentError } = await supabase
    .from('profiles')
    .select('user_id, last_name_kanji, first_name_kanji, last_name_hiragana, first_name_hiragana, birth_date, gender, birthplace_prefecture, birthplace_municipality')
    .in('user_id', parentUserIds);

  if (!parentError && parentProfiles) {
    for (const parentProfile of parentProfiles) {
      // 早期 continue: 自分自身は除外
      if (parentProfile.user_id === userId) continue;

      // 早期 continue: フィールド必須チェック
      if (!parentProfile.last_name_kanji || !parentProfile.first_name_kanji) continue;

      candidates.push({
        userId: parentProfile.user_id,
        lastNameKanji: parentProfile.last_name_kanji,
        firstNameKanji: parentProfile.first_name_kanji,
        lastNameHiragana: parentProfile.last_name_hiragana || undefined,
        firstNameHiragana: parentProfile.first_name_hiragana || undefined,
        birthDate: parentProfile.birth_date,
        gender: parentProfile.gender || undefined,
        birthplacePrefecture: parentProfile.birthplace_prefecture || undefined,
        birthplaceMunicipality: parentProfile.birthplace_municipality || undefined,
      });
    }
  }

  return candidates;
}

/**
 * ユーザーのロールに応じてマッチング候補を取得
 */
export async function getMatchingCandidates(): Promise<{
  candidates: MatchingCandidate[];
  missingRequiredData: boolean;
  missingFields: string[];
}> {
  const supabase = await createClient();
  
  // 現在のユーザーを取得
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { candidates: [], missingRequiredData: true, missingFields: ['認証'] };
  }

  // ユーザーのロールを取得
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (userError || !userData) {
    return { candidates: [], missingRequiredData: true, missingFields: ['ユーザー情報'] };
  }

  // プロフィール情報を取得
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('birth_date')
    .eq('user_id', user.id)
    .single();

  const missingFields: string[] = [];

  // プロフィールが存在しない、または生年月日が未設定
  if (profileError || !profile || !profile.birth_date) {
    missingFields.push('生年月日');
  }

  // 親ユーザーの場合、searching_children の確認
  if (userData.role === 'parent') {
    const { data: searchingChildren } = await supabase
      .from('searching_children')
      .select('id, birth_date')
      .eq('user_id', user.id)
      .not('birth_date', 'is', null)
      .limit(1);

    if (!searchingChildren || searchingChildren.length === 0) {
      missingFields.push('お子さまの生年月日');
    }
  }

  // 必須データが欠けている場合
  if (missingFields.length > 0) {
    return {
      candidates: [],
      missingRequiredData: true,
      missingFields,
    };
  }

  // ロールに応じて候補を取得
  let candidates: MatchingCandidate[] = [];
  if (userData.role === 'parent') {
    candidates = await getParentMatchingCandidates(user.id);
  } else if (userData.role === 'child') {
    candidates = await getChildMatchingCandidates(user.id);
  }

  return {
    candidates,
    missingRequiredData: false,
    missingFields: [],
  };
}
