"use client";
import { ParentApprovalModal } from '@/app/components/matching/ParentApprovalModal';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ScoreExplanation } from '@/app/components/matching/ScoreExplanation';
import { TargetProfileCard } from '@/app/components/matching/TargetProfileCard';
import { MatchedTargetCard } from '@/app/components/matching/MatchedTargetCard';
import { TheirTargetPeopleList } from '@/app/components/matching/TheirTargetPeopleList';
import { getGenderLabel, calculateAge, getRoleLabel } from '@/app/components/matching/matchingUtils';

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
}

// タイトル部分
function renderTitle(userRole: string | null) {
  return (
    <div className="mb-8">
      <h1 className="text-3xl font-bold text-gray-900">
        {userRole === 'child' ? '親を探す' : '子を探す'}
      </h1>
      <p className="mt-2 text-gray-600">
        {userRole === 'child'
          ? 'プロフィール情報に基づいて、あなたに合った親を表示しています'
          : 'プロフィール情報に基づいて、あなたに合った子を表示しています'}
      </p>
    </div>
  );
}

// 検索中
function renderFindingMatch() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-center">
        <div className="mb-4 text-4xl">🔍</div>
        <p className="text-gray-600">マッチングを検索中...</p>
      </div>
    </div>
  );
}

// 「探している子ども/親を登録してください」カードを返す関数
function renderNoTargetRegisteredCard(userRole: string | null) {
  return (
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
        className={`inline-block rounded-lg px-6 py-3 text-white ${userRole === 'child' ? 'bg-child-600 hover:bg-child-700' : 'bg-parent-600 hover:bg-parent-700'}`}
      >
        プロフィールを編集
      </Link>
    </div>
  );
}


  // 「マッチングが見つかりませんでした」カードを返す関数
  function renderNoMatchingCard(userRole: string | null) {
    return (
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
          className={`inline-block rounded-lg px-6 py-3 text-white ${userRole === 'child' ? 'bg-child-600 hover:bg-child-700' : 'bg-parent-600 hover:bg-parent-700'}`}
        >
          プロフィールを編集
        </Link>
      </div>
    );
  }

// 大きいほうのカード（登録している探している子ども/親ごとに表示）
function renderTargetCards(
  searchingTargets: SearchingTarget[],
  matches: Match[],
  renderTargetProfile: (target: SearchingTarget) => React.ReactNode,
  renderMatchedTargetCards: (matchedTargets: Match[], target: SearchingTarget) => React.ReactNode
) {
  return (
    <div className="space-y-4">
      <div className="space-y-8 w-full max-w-5xl mx-auto">
        {searchingTargets.map((target) => {
          const matchedTargets = matches;
          return (
            <div key={target.id} className="rounded-xl bg-white shadow-lg hover:shadow-2xl transition">
              <div className="flex flex-col gap-0 lg:flex-row">
                {renderTargetProfile(target)}
                {/* 小さいほうのカード */}
                <div className="flex-1 p-5 lg:p-6">
                  {matchedTargets.length === 0 ? (
                    <div className="flex h-full min-h-[120px] items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-gray-600">
                      マッチング相手がまだ見つかっていません
                    </div>
                  ) : (
                    renderMatchedTargetCards(matchedTargets, target)
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function MatchingPage() {
  // --- ここからヘルパー関数をreturnより前に配置 ---
  function renderTestModeBanners() {
    return (
      <>
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
      </>
    );
  }

  // TargetProfileCardに置換

  // MatchedTargetCardに置換
  // --- ここまで ---
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [searchingTargets, setSearchingTargets] = useState<SearchingTarget[]>([]);
  const [testModeBypassVerification, setTestModeBypassVerification] = useState(false);
  const [testModeBypassSubscription, setTestModeBypassSubscription] = useState(false);
  // 親の同意モーダル表示状態
  const [showParentApprovalModal, setShowParentApprovalModal] = useState(false);
  // 申請対象ユーザーIDとスコアを一時保存
  const [pendingMatchInfo, setPendingMatchInfo] = useState<{userId: string, score: number} | null>(null);
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
      setProfile(data.profile || null);
      setSearchingTargets(data.myTargetPeople || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  // マッチングアクションボタン生成関数
  function createMatchingActionButton(params: {
    userRole: string | null;
    match: Match;
    childScore: number;
    creating: string | null;
    handleCreateMatch: (userId: string, score: number) => void;
    calculateAge: (birthDate: string) => number;
  }) {
    const { userRole, match, childScore, creating, handleCreateMatch, calculateAge } = params;
    const isParent = userRole === 'parent';
    const childBirthDate = match.profile?.birth_date;
    const isChild = match.role === 'child';
    let isUnder18 = false;
    if (isChild && childBirthDate) {
      const age = calculateAge(childBirthDate);
      isUnder18 = age < 18;
    }
    // 申請ボタン押下時の処理
    const handleRequestClick = () => {
      // 自分が18歳未満かつrole=childなら親の同意モーダル表示
      const myAge = profile?.birth_date ? calculateAge(profile.birth_date) : null;
      const myRole = profile?.users?.role;
      if (myRole === 'child' && myAge !== null && myAge < 18) {
        setPendingMatchInfo({ userId: match.userId, score: childScore });
        setShowParentApprovalModal(true);
      } else {
        handleCreateMatch(match.userId, childScore);
      }
    };

    // 既存マッチのステータスに応じた表示
    if (match.existingMatchStatus === 'accepted' || match.existingMatchStatus === 'blocked') {
      return (
        <div className="flex items-center gap-2">
          <Link
            href={`/messages/${match.existingMatchId}`}
            className={`w-full block text-center rounded-lg px-3 py-2 text-white text-sm font-semibold transition ${userRole === 'child' ? 'bg-child-600 hover:bg-child-700' : 'bg-parent-600 hover:bg-parent-700'}`}
          >
            メッセージへ
          </Link>
        </div>
      );
    }
    // マッチが成立しているが、相手が18歳未満で未承認の場合の表示
    if (isParent && isChild && isUnder18) {
      return (
        <div className="w-full rounded-lg bg-green-100 px-3 py-2 text-green-800 text-sm font-semibold text-center border border-green-300">
          承認申請待ち（18歳未満のため）
        </div>
      );
    }
    // 承認待ちの場合の表示
    if (match.existingMatchStatus === 'pending') {
      return (
        <button
          disabled
          className="w-full rounded-lg bg-yellow-500 px-3 py-2 text-white text-sm font-semibold cursor-not-allowed opacity-75"
        >
          承認待ち
        </button>
      );
    } 
    return (
      <button
        onClick={handleRequestClick}
        disabled={creating === match.userId}
        className={`w-full rounded-lg px-3 py-2 text-white text-sm font-semibold disabled:opacity-50 transition ${userRole === 'child' ? 'bg-child-600 hover:bg-child-700' : 'bg-parent-600 hover:bg-parent-700'}`}
      >
        {creating === match.userId ? '処理中...' : 'マッチング申請'}
      </button>
    );
  }

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


  // 相手が探している子ども/親情報を表示する関数
  // TheirTargetPeopleListに置換
  return (
    <div className="min-h-screen bg-gray-100">
      <main className="mx-auto w-full max-w-5xl px-4 py-8">
        {renderTestModeBanners()}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>{renderTitle(userRole)}</div>
            <Link
              href="/dashboard"
              className={`inline-block rounded-lg px-4 py-2 text-white ${userRole === 'child' ? 'bg-child-600 hover:bg-child-700' : 'bg-parent-600 hover:bg-parent-700'} ml-4`}
            >
              ダッシュボードに戻る
            </Link>
          </div>
        </div>
        {error && (
          <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-600">{error}</div>
        )}
        {loading ? (
          renderFindingMatch()
        ) : matches.length === 0 ? (
          renderNoMatchingCard(userRole)
        ) : searchingTargets.length > 0 ? (
          renderTargetCards(
            searchingTargets,
            matches,
            (target) => <TargetProfileCard target={target} userRole={userRole ?? ''} />,
            (matchedTargets, target) => matchedTargets.map((match) => {
              // targetScoresから該当ターゲットのスコア合計を取得
              const scoreObj = Array.isArray(match.targetScores)
                ? match.targetScores.find((ts) => ts.target.id === target.id)
                : undefined;
              const childScore = scoreObj
                ? (scoreObj.birthdayScore + scoreObj.nameScore + scoreObj.birthplaceScore + scoreObj.oppositeScore) / 100
                : 0;
              // アクションボタンを生成
              const actionButton = createMatchingActionButton({
                userRole,
                match,
                childScore,
                creating,
                handleCreateMatch,
                calculateAge,
              });
              return (
                <MatchedTargetCard
                  key={match.userId}
                  match={match}
                  target={target}
                  userRole={userRole ?? ''}
                  childScore={childScore}
                  creating={creating}
                  handleCreateMatch={handleCreateMatch}
                  renderTheirTargetPeople={(m) => <TheirTargetPeopleList theirTargetPeople={m.theirTargetPeople || []} role={m.role} />}
                >
                  {actionButton}
                </MatchedTargetCard>
              );
            })
          )
        ) : (
          renderNoTargetRegisteredCard(userRole)
        )}
        {/* 親の同意モーダル */}
        <ParentApprovalModal
          open={showParentApprovalModal}
          onApprove={() => {
            setShowParentApprovalModal(false);
            if (pendingMatchInfo) {
              handleCreateMatch(pendingMatchInfo.userId, pendingMatchInfo.score);
              setPendingMatchInfo(null);
            }
          }}
          onCancel={() => {
            setShowParentApprovalModal(false);
            setPendingMatchInfo(null);
          }}
        />
      </main>
    </div>
  );
}
