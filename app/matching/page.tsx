"use client";
import { UserProfileCard } from '@/components/ui/UserProfileCard';
import { toProfileBaseFromRow } from '@/types/profile';
import { MatchingSimilarityCard } from '@/app/components/matching/MatchingSimilarityCard';
import { TheirTargetPeopleList } from '@/app/components/matching/TheirTargetPeopleList';

import { useState, useEffect } from 'react';
import { useAutoSignOut } from '@/app/components/matching/hooks/useAutoSignOut';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { useErrorNotification } from '@/lib/utils/useErrorNotification';
import { useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/api/request';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { ProfileCard } from '@/app/components/matching/ProfileCard';
import { calculateAge} from '@/app/components/matching/matchingUtils';
import { NoTargetRegisteredCard } from '@/app/components/matching/NoTargetRegisteredCard';
import { NoMatchingCard } from '@/app/components/matching/NoMatchingCard';
import { TestModeBanners } from '@/app/components/matching/TestModeBanners';

interface Match {
  userId: string;
  targetScores: Array<{
    target: any;
    birthdayScore: number;
    nameScore: number;
    birthplaceScore: number;
    oppositeScore: number;
  }>;
  existingMatchId?: string | null;
  existingMatchStatus?: 'pending' | 'accepted' | 'rejected' | 'blocked' | null;
  profile?: {
    role?: string;
    last_name_kanji?: string;
    first_name_kanji?: string;
    last_name_hiragana?: string;
    first_name_hiragana?: string;
    birth_date?: string;
    bio?: string;
    profile_image_url?: string;
    gender?: string;
    birthplace_prefecture?: string;
    birthplace_municipality?: string;
  };
  theirTargetPeople?: Array<{
    id: string;
    last_name_kanji?: string;
    first_name_kanji?: string;
    birthplace_prefecture?: string;
    birthplace_municipality?: string;
    photo_url?: string | null;
  }>;
  role?: string;
}
interface SearchingTarget {
  id: string;
  last_name_kanji?: string;
  first_name_kanji?: string;
  name_kanji?: string;
  name_hiragana?: string;
  birth_date?: string;
  gender?: string;
  birthplace_prefecture?: string;
  birthplace_municipality?: string;
  display_order?: number;
  photo_url?: string | null;
}

// タイトル部分
function renderTitle(userRole: string | null) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {userRole === 'child' ? '親を探す' : '子を探す'}
          </h1>
          <p className="mt-2 text-gray-600">
            {userRole === 'child'
              ? 'プロフィール情報に基づいて、あなたに合った親を表示しています'
              : 'プロフィール情報に基づいて、あなたに合った子を表示しています'}
          </p>
        </div>
        <Link
          href="/dashboard"
          className="inline-block rounded-lg px-4 py-2 text-white bg-role-primary bg-role-primary-hover ml-4"
        >
          ダッシュボードに戻る
        </Link>
      </div>
    </div>
  );
}

// 検索中
function renderFindingMatch() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-center">
        <div className="mb-4 flex justify-center">
          <span
            className="inline-block animate-spin rounded-full border-4 border-gray-300 h-12 w-12 align-[-0.125em]"
            style={{ borderTopColor: '#3b82f6' }} // Tailwind blue-500
          ></span>
        </div>
        <p className="text-gray-600">マッチングを検索中...</p>
      </div>
    </div>
  );
}




export default function MatchingPage() {
    useAutoSignOut(15); // 15分無操作で自動サインアウト
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const notifyError = useErrorNotification(setError, { log: true });
  const [userRole, setUserRole] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [searchingTargets, setSearchingTargets] = useState<SearchingTarget[]>([]);
  const [testModeBypassVerification, setTestModeBypassVerification] = useState(false);
  const [testModeBypassSubscription, setTestModeBypassSubscription] = useState(false);
  const [creatingMap, setCreatingMap] = useState<{ [targetId: string]: string | null }>({});
  const [pendingMatchInfoMap, setPendingMatchInfoMap] = useState<{ [targetId: string]: { userId: string, score: number } | null }>({});
  const router = useRouter();
  const supabase = createClient();
  useEffect(() => {
    checkAuth();
    checkTestMode();
    loadMatches();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/auth/login');
    }
  };

  const checkTestMode = async () => {
    try {
      const res = await apiRequest('/api/test-mode/status');
      if (res.ok) {
        console.log('[MatchingPage] Test mode status:', res.data);
        setTestModeBypassVerification(res.data.bypassVerification);
        setTestModeBypassSubscription(res.data.bypassSubscription);
      }
    } catch (err) {
      notifyError(err);
    }
  };

  // マッチング候補の読み込み（画面全体）
  const loadMatches = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await apiRequest('/api/matching/search');
      if (!res.ok) throw new Error(res.error || 'マッチングの検索に失敗しました');
      setMatches(res.data.candidates || []);
      setUserRole(res.data.userRole);
      setProfile(res.data.profile || null);
      setSearchingTargets(res.data.myTargetPeople || []);
    } catch (err: any) {
      notifyError(err);
    } finally {
      setLoading(false);
    }
  };


  const roleClass = userRole === 'child' ? 'role-child' : 'role-parent';
  return (
    <div className={`min-h-screen bg-gray-100 ${roleClass}`}> 
      <main className="mx-auto w-full max-w-5xl px-4 py-8">
        <TestModeBanners bypassVerification={testModeBypassVerification} bypassSubscription={testModeBypassSubscription} />
        {renderTitle(userRole)}
        <ErrorAlert message={error} onClose={() => setError('')} />
        {loading ? (
        // 検索中表示
          renderFindingMatch()
        ) : matches.length === 0 ? (
          <NoMatchingCard userRole={userRole} />
        // 探している相手が未登録の場合
        ) : searchingTargets.length === 0 ? (
          <NoTargetRegisteredCard userRole={userRole} />
        // 探している相手が登録されている場合
        ) : (
          <div className="space-y-4">
            <div className="space-y-8 w-full max-w-5xl mx-auto">
              {searchingTargets.map((target) => {
                // このtargetに対するマッチ一覧を抽出（例: match.targetId === target.id など、必要に応じてフィルタ）
                // 現状は全matchesを表示しているが、targetごとに分ける場合はここでfilterする
                const targetMatches = matches; // 必要に応じて: matches.filter(m => m.targetId === target.id)
                return (
                  <div key={target.id} className="rounded-xl bg-white shadow-lg hover:shadow-2xl transition">
                    <div className="flex flex-col gap-0 lg:flex-row">
                      {/* こちらが探している相手 */}
                      <ProfileCard target={target} userRole={userRole} />
                      <div className="flex-1 p-5 lg:p-6">
                        {/* マッチングした相手一覧 */}
                        {targetMatches.length === 0 ? (
                          <div className="flex h-full min-h-[80px] items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-4 text-gray-600">
                            この相手に対するマッチングはまだ見つかっていません
                          </div>
                        ) : (
                          targetMatches.map((match) => {
                            const creating = creatingMap[target.id] || null;
                            const pendingMatchInfo = pendingMatchInfoMap[target.id] || null;
                            const setCreating = (val: string | null) => setCreatingMap(prev => ({ ...prev, [target.id]: val }));
                            const setPendingMatchInfo = (val: { userId: string, score: number } | null) => setPendingMatchInfoMap(prev => ({ ...prev, [target.id]: val }));
                            return (
                              <div key={match.userId} className="flex flex-col gap-4 rounded-lg border border-gray-100 bg-white p-4 shadow-sm hover:shadow-md transition lg:flex-row lg:items-center lg:justify-between mb-4">
                                <div className="flex-1 flex gap-4">
                                  <UserProfileCard
                                    profile={toProfileBaseFromRow(match.profile)}
                                    className="flex-1"
                                  />
                                  <TheirTargetPeopleList theirTargetPeople={match.theirTargetPeople || []} role={match.role} />
                                </div>
                                <div className="w-full lg:w-48">
                                  <MatchingSimilarityCard
                                    label={''}
                                    userRole={userRole}
                                    match={match}
                                    target={target}
                                    creating={creating}
                                    setCreating={setCreating}
                                    calculateAge={calculateAge}
                                    profile={profile}
                                    setPendingMatchInfo={setPendingMatchInfo}
                                    pendingMatchInfo={pendingMatchInfo}
                                    onApprove={async (userId) => {
                                      if (!match.existingMatchId) return;
                                      await apiRequest(`/api/matching/approve`, {
                                        method: 'POST',
                                        body: { matchId: match.existingMatchId }
                                      });
                                      await loadMatches();
                                    }}
                                    onReject={async (userId) => {
                                      if (!match.existingMatchId) return;
                                      await apiRequest(`/api/matching/reject`, {
                                        method: 'POST',
                                        body: { matchId: match.existingMatchId }
                                      });
                                      await loadMatches();
                                    }}
                                  />
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
