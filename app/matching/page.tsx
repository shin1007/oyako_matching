'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import type { UserRole } from '@/types/database';
import { ScoreExplanation } from '@/app/components/matching/ScoreExplanation';

interface Match {
  userId: string;
  similarityScore: number;
  scorePerChild?: Record<string, number>;
  role?: string;
  existingMatchId?: string | null;
  existingMatchStatus?: 'pending' | 'accepted' | 'rejected' | 'blocked' | null;
  profile: {
    last_name_kanji: string;
    first_name_kanji: string;
    last_name_hiragana?: string;
    first_name_hiragana?: string;
    birth_date: string;
    bio?: string;
    profile_image_url?: string;
    gender?: string;
    birthplace_prefecture?: string;
    birthplace_municipality?: string;
  };
  searchingChildrenInfo?: Array<{
    id: string;
    last_name_kanji?: string;
    first_name_kanji?: string;
    birthplace_prefecture?: string;
    birthplace_municipality?: string;
    photo_url?: string | null;
  }>;
}
interface SearchingChild {
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
}

export default function MatchingPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [searchingChildren, setSearchingChildren] = useState<SearchingChild[]>([]);
  const [testModeBypassVerification, setTestModeBypassVerification] = useState(false);
  const [testModeBypassSubscription, setTestModeBypassSubscription] = useState(false);
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
      const response = await fetch('/api/test-mode/status');
      if (response.ok) {
        const data = await response.json();
        console.log('[MatchingPage] Test mode status:', data);
        setTestModeBypassVerification(data.bypassVerification);
        setTestModeBypassSubscription(data.bypassSubscription);
      }
    } catch (err) {
      console.error('[MatchingPage] Failed to check test mode:', err);
    }
  };

  const loadMatches = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/matching/search');
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'マッチングの検索に失敗しました');
      }

      const data = await response.json();
      setMatches(data.candidates || []);
      setUserRole(data.userRole);
      setSearchingChildren(data.searchingChildren || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMatch = async (targetUserId: string, similarityScore: number) => {
    setCreating(targetUserId);

    try {
      const response = await fetch('/api/matching/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetUserId,
          similarityScore,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'マッチングの作成に失敗しました');
      }

      // Success - redirect to messages
      router.push('/messages');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCreating(null);
    }
  };

  const getSimilarityColor = (score: number) => {
    if (score >= 0.9) return 'text-green-600';
    if (score >= 0.8) return 'text-blue-600';
    if (score >= 0.7) return 'text-yellow-600';
    return 'text-gray-600';
  };

  const getSimilarityLabel = (score: number) => {
    if (score >= 0.9) return '非常に高い';
    if (score >= 0.8) return '高い';
    if (score >= 0.7) return '中程度';
    return '低い';
  };

  // マッチをロールごとにグループ化
  const groupedMatches = matches.reduce(
    (acc, match) => {
      const role = match.role || 'unknown';
      if (!acc[role]) {
        acc[role] = [];
      }
      acc[role].push(match);
      return acc;
    },
    {} as Record<string, Match[]>
  );

  const getRoleLabel = (role: string) => {
    return role === 'parent' ? '親' : role === 'child' ? '子' : '不明';
  };

  const getGenderLabel = (gender?: string, role?: string) => {
    if (!gender) return '性別未設定';

    const mapParent = {
      male: '男性',
      female: '女性',
      other: 'その他',
      prefer_not_to_say: '回答しない',
    } as const;

    const mapChild = {
      male: '男の子',
      female: '女の子',
      other: 'その他',
    } as const;

    if (role === 'parent') {
      return mapParent[gender as keyof typeof mapParent] ?? '性別未設定';
    }
    return mapChild[gender as keyof typeof mapChild] ?? mapParent[gender as keyof typeof mapParent] ?? '性別未設定';
  };

  const calculateAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <main className="mx-auto w-full max-w-5xl px-4 py-8">
        {testModeBypassVerification && (
          <div className="mb-6 rounded-lg border-2 border-blue-400 bg-blue-50 p-4 text-blue-700">
            <div className="flex items-center gap-2">
              <span className="text-xl">✅</span>
              <span className="font-semibold">テストモード: マイナンバー認証がスキップされています</span>
            </div>
          </div>
        )}

        {testModeBypassSubscription && (
          <div className="mb-6 rounded-lg border-2 border-purple-400 bg-purple-50 p-4 text-purple-700">
            <div className="flex items-center gap-2">
              <span className="text-xl">✅</span>
              <span className="font-semibold">テストモード: サブスクリプションがスキップされています</span>
            </div>
          </div>
        )}
        
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {userRole === 'child' ? '親を探す' : '子を探す'}
          </h1>
          <p className="mt-2 text-gray-600">
            {userRole === 'child' 
              ? 'プロフィール情報に基づいて、あなたに合った親を表示しています'
              : 'プロフィール情報に基づいて、あなたに合った子を表示しています'
            }
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-600">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="mb-4 text-4xl">🔍</div>
              <p className="text-gray-600">マッチングを検索中...</p>
            </div>
          </div>
        ) : matches.length === 0 ? (
          <div className="rounded-lg bg-white p-12 text-center shadow">
            <div className="mb-4 text-6xl">😔</div>
            <h2 className="mb-2 text-xl font-semibold text-gray-900">
              マッチングが見つかりませんでした
            </h2>
            <p className="mb-6 text-gray-600">
              プロフィールを充実させると、マッチングの精度が向上します
            </p>
            <Link
              href="/dashboard/profile"
              className="inline-block rounded-lg bg-green-600 px-6 py-3 text-white hover:bg-green-700"
            >
              プロフィールを編集
            </Link>
          </div>
        ) : searchingChildren.length > 0 ? (
          <div className="space-y-8 w-full max-w-5xl mx-auto">
            {searchingChildren.map((child) => {
              // For child users, matches are parents; for parent users, matches are children
              const childMatches = userRole === 'parent' 
                ? (groupedMatches['child'] || [])
                : (groupedMatches['parent'] || []);
              return (
                <div key={child.id} className="rounded-xl bg-white shadow-lg hover:shadow-2xl transition">
                  <div className="flex flex-col gap-0 lg:flex-row">
                    <div className="w-full lg:max-w-xs border-b lg:border-b-0 lg:border-r border-gray-100 bg-gray-50 px-6 py-5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-green-600 mb-1">
                        {userRole === 'parent' ? '探している子ども' : '探している親'}
                      </p>
                      <h3 className="text-xl font-bold text-gray-900">
                        {child.last_name_kanji}{child.first_name_kanji || child.name_kanji || child.name_hiragana || '名前未設定'}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {child.gender ? getGenderLabel(child.gender, userRole === 'parent' ? 'child' : 'parent') : '性別未設定'}
                        {child.birth_date && ` • ${calculateAge(child.birth_date)}歳`}
                      </p>
                      {child.birth_date && (
                        <p className="text-xs text-gray-500 mt-1">
                          生年月日: {new Date(child.birth_date).toLocaleDateString('ja-JP', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </p>
                      )}
                      {(child.birthplace_prefecture || child.birthplace_municipality) && (
                        <p className="text-xs text-gray-500 mt-1">
                          出身地: {child.birthplace_prefecture || ''}
                          {child.birthplace_municipality ? ` ${child.birthplace_municipality}` : ''}
                        </p>
                      )}
                    </div>

                    <div className="flex-1 p-5 lg:p-6">
                      {childMatches.length === 0 ? (
                        <div className="flex h-full min-h-[120px] items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-gray-600">
                          マッチング相手がまだ見つかっていません
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {childMatches.map((match) => {
                            // Get the score for this specific child/parent
                            const childScore = match.scorePerChild?.[child.id] ?? match.similarityScore;
                            return (
                              <div
                                key={match.userId}
                                className="flex flex-col gap-4 rounded-lg border border-gray-100 bg-white p-4 shadow-sm hover:shadow-md transition lg:flex-row lg:items-center lg:justify-between"
                              >
                                <div className="flex-1 flex gap-4">
                                  {match.profile.profile_image_url && (
                                    <div className="flex-shrink-0">
                                      <img
                                        src={match.profile.profile_image_url}
                                        alt={`${match.profile.last_name_kanji}${match.profile.first_name_kanji}`}
                                        className="h-20 w-20 rounded-lg object-cover border border-gray-200"
                                      />
                                    </div>
                                  )}
                                  <div className="flex-1">
                                    <span className="mb-1 inline-flex items-center rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">
                                      登録済み{getRoleLabel(match.role || '')}ユーザー
                                    </span>
                                    <h4 className="text-lg font-semibold text-gray-900">{match.profile.last_name_kanji}{match.profile.first_name_kanji}</h4>
                                    <p className="text-sm text-gray-600 mt-1">
                                      {getGenderLabel(match.profile.gender, match.role)}
                                      {' '}• {calculateAge(match.profile.birth_date)}歳
                                    </p>
                                    {match.profile.bio && (
                                      <p className="mt-2 text-sm text-gray-600 line-clamp-2">{match.profile.bio}</p>
                                    )}
                                    <p className="text-xs text-gray-500 mt-1">
                                      生年月日: {new Date(match.profile.birth_date).toLocaleDateString('ja-JP', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                      })}
                                    </p>
                                    {(match.profile.birthplace_prefecture || match.profile.birthplace_municipality) && (
                                      <p className="text-xs text-gray-500 mt-1">
                                        出身地: {match.profile.birthplace_prefecture || ''}
                                        {match.profile.birthplace_municipality ? ` ${match.profile.birthplace_municipality}` : ''}
                                      </p>
                                    )}
                                    
                                    {/* 相手が探している子ども/親情報 */}
                                    {match.searchingChildrenInfo && match.searchingChildrenInfo.length > 0 && (
                                      <div className="mt-4 pt-4 border-t border-gray-200">
                                        <p className="text-xs font-semibold text-gray-700 mb-2">
                                          この方が探している{match.role === 'parent' ? '子ども' : '親'}:
                                        </p>
                                        <div className="space-y-2">
                                          {match.searchingChildrenInfo.map((searchingPerson) => (
                                            <div key={searchingPerson.id} className="flex gap-3 bg-blue-50 rounded p-2">
                                              {searchingPerson.photo_url && (
                                                <img
                                                  src={searchingPerson.photo_url}
                                                  alt={`${searchingPerson.last_name_kanji || ''}${searchingPerson.first_name_kanji || ''}`}
                                                  className="h-16 w-16 rounded object-cover border border-gray-200 flex-shrink-0"
                                                />
                                              )}
                                              <div className="flex-1">
                                                <p className="font-semibold text-gray-900 text-sm">
                                                  {searchingPerson.last_name_kanji || ''}{searchingPerson.first_name_kanji || ''}
                                                </p>
                                                {(searchingPerson.birthplace_prefecture || searchingPerson.birthplace_municipality) && (
                                                  <p className="text-xs text-gray-600">
                                                    出身地: {searchingPerson.birthplace_prefecture || ''}
                                                    {searchingPerson.birthplace_municipality ? ` ${searchingPerson.birthplace_municipality}` : ''}
                                                  </p>
                                                )}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="w-full lg:w-48 bg-gradient-to-br from-green-50 to-emerald-50 p-4 flex flex-col items-center justify-center rounded-lg border border-green-100">
                                  <div className="text-center mb-3">
                                    <div className="flex items-center justify-center gap-2 mb-1">
                                      <div className="text-3xl font-bold text-green-600">
                                        {(childScore * 100).toFixed(0)}%
                                      </div>
                                      <ScoreExplanation userRole={userRole as 'parent' | 'child'} />
                                    </div>
                                    <p className="text-xs text-gray-600 font-semibold">類似度</p>
                                    <p className="text-xs text-gray-500 mt-1">
                                      {getSimilarityLabel(childScore)}
                                    </p>
                                  </div>

                                  <div className="w-full h-1 bg-gray-300 rounded-full mb-3 overflow-hidden">
                                    <div
                                      className={`h-full rounded-full ${
                                        childScore >= 0.9
                                          ? 'bg-green-600'
                                          : childScore >= 0.8
                                          ? 'bg-emerald-500'
                                          : childScore >= 0.7
                                          ? 'bg-lime-500'
                                          : 'bg-gray-600'
                                      }`}
                                      style={{ width: `${childScore * 100}%` }}
                                    />
                                  </div>

                                  {match.existingMatchStatus === 'accepted' ? (
                                    <Link
                                      href={`/messages/${match.existingMatchId}`}
                                      className="w-full block text-center rounded-lg bg-blue-600 px-3 py-2 text-white text-sm font-semibold hover:bg-blue-700 transition"
                                    >
                                      メッセージへ
                                    </Link>
                                  ) : match.existingMatchStatus === 'pending' ? (
                                    <button
                                      disabled
                                      className="w-full rounded-lg bg-yellow-500 px-3 py-2 text-white text-sm font-semibold cursor-not-allowed opacity-75"
                                    >
                                      承認待ち
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => handleCreateMatch(match.userId, childScore)}
                                      disabled={creating === match.userId}
                                      className="w-full rounded-lg bg-green-600 px-3 py-2 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition"
                                    >
                                      {creating === match.userId ? '処理中...' : 'マッチング申請'}
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-lg bg-white p-12 text-center shadow">
            <div className="mb-4 text-6xl">📝</div>
            <h2 className="mb-2 text-xl font-semibold text-gray-900">
              {userRole === 'parent' ? '探している子どもを登録してください' : '探している親を登録してください'}
            </h2>
            <p className="mb-6 text-gray-600">
              {userRole === 'parent' 
                ? '探している子どもの情報を登録すると、マッチングが表示されます'
                : '探している親の情報を登録すると、マッチングが表示されます'
              }
            </p>
            <Link
              href="/dashboard/profile"
              className="inline-block rounded-lg bg-green-600 px-6 py-3 text-white hover:bg-green-700"
            >
              プロフィールを編集
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
