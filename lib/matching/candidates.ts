import { createClient } from '@/lib/supabase/server';

/**
 * マッチング候補の情報
 */
export interface MatchingCandidate {
  userId: string;
  fullName: string;
  birthDate: string;
  gender?: string;
}

/**
 * 親ユーザー向け：マッチング候補を取得
 * searching_children テーブルの birth_date と一致する子ユーザーを検索
 */
async function getParentMatchingCandidates(userId: string): Promise<MatchingCandidate[]> {
  const supabase = await createClient();
  
  // 親ユーザーが探している子どもの情報を取得
  const { data: searchingChildren, error: searchError } = await supabase
    .from('searching_children')
    .select('birth_date, gender')
    .eq('user_id', userId)
    .not('birth_date', 'is', null);

  if (searchError || !searchingChildren || searchingChildren.length === 0) {
    return [];
  }

  // 各子どもの生年月日に一致する子ユーザーを検索
  const candidates: MatchingCandidate[] = [];
  const birthDates = Array.from(new Set(searchingChildren.map(child => child.birth_date).filter(Boolean)));

  if (birthDates.length === 0) {
    return [];
  }

  // 単一クエリで全ての一致するプロフィールを取得
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('user_id, full_name, birth_date')
    .in('birth_date', birthDates);

  if (!profileError && profiles) {
    for (const profile of profiles) {
      // 自分自身は除外
      if (profile.user_id === userId) continue;
      
      // 重複チェック
      if (candidates.some(c => c.userId === profile.user_id)) continue;

      candidates.push({
        userId: profile.user_id,
        fullName: profile.full_name,
        birthDate: profile.birth_date,
      });
    }
  }

  return candidates;
}

/**
 * 子ユーザー向け：マッチング候補を取得
 * 自身の profiles.birth_date と一致する searching_children.birth_date を持つ親ユーザーを検索
 */
async function getChildMatchingCandidates(userId: string): Promise<MatchingCandidate[]> {
  const supabase = await createClient();
  
  // 子ユーザー自身の生年月日を取得
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('birth_date')
    .eq('user_id', userId)
    .single();

  if (profileError || !profile || !profile.birth_date) {
    return [];
  }

  // 同じ生年月日を searching_children に持つ親ユーザーを検索
  const { data: searchingChildren, error: searchError } = await supabase
    .from('searching_children')
    .select('user_id, birth_date')
    .eq('birth_date', profile.birth_date);

  if (searchError || !searchingChildren || searchingChildren.length === 0) {
    return [];
  }

  // 親ユーザーのプロフィール情報を取得
  const parentUserIds = Array.from(new Set(searchingChildren.map(sc => sc.user_id)));
  const candidates: MatchingCandidate[] = [];

  if (parentUserIds.length === 0) {
    return [];
  }

  // 単一クエリで全ての親プロフィールを取得
  const { data: parentProfiles, error: parentError } = await supabase
    .from('profiles')
    .select('user_id, full_name, birth_date')
    .in('user_id', parentUserIds);

  if (!parentError && parentProfiles) {
    for (const parentProfile of parentProfiles) {
      // 自分自身は除外
      if (parentProfile.user_id === userId) continue;

      candidates.push({
        userId: parentProfile.user_id,
        fullName: parentProfile.full_name,
        birthDate: parentProfile.birth_date,
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
