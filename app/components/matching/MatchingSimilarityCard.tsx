
import React from 'react';
import { ScoreExplanation } from '@/app/components/matching/ScoreExplanation';
import { ParentApprovalModal } from '@/app/components/matching/ParentApprovalModal';


import { useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/api/request';
import { useState, useEffect } from 'react';

export interface MatchingSimilarityCardProps {
  label: string;
  userRole: string | null;
  match?: any;
  target?: any;
  creating?: string | null;
  setCreating?: (id: string | null) => void;
  calculateAge?: (birthDate: string) => number;
  profile?: any;
  setPendingMatchInfo?: (info: { userId: string, score: number } | null) => void;
  pendingMatchInfo?: { userId: string, score: number } | null;
  children?: React.ReactNode;
}

export function MatchingSimilarityCard({
  label,
  userRole,
  match,
  target,
  creating,
  setCreating,
  calculateAge,
  profile,
  setPendingMatchInfo,
  pendingMatchInfo,
  children,
}: MatchingSimilarityCardProps) {
  // childScore計算を内部で行う
  let score = 0;
  if (match && target && Array.isArray(match.targetScores)) {
    const scoreObj = match.targetScores.find((ts: any) => ts.target.id === target.id);
    if (scoreObj) {
      score = (scoreObj.birthdayScore + scoreObj.nameScore + scoreObj.birthplaceScore + scoreObj.oppositeScore) / 100;
    }
  }
  const getBarColor = () => {
    if (userRole === 'child') {
      if (score >= 0.9) return 'bg-child-600';
      if (score >= 0.8) return 'bg-child-500';
      if (score >= 0.7) return 'bg-child-400';
      return 'bg-gray-600';
    } else {
      if (score >= 0.9) return 'bg-green-600';
      if (score >= 0.8) return 'bg-green-500';
      if (score >= 0.7) return 'bg-green-400';
      return 'bg-gray-600';
    }
  };
  const percent = Math.round(score * 100);
  const parentGradient = 'from-green-50 to-green-100 border border-green-200';
  const parentText = 'text-green-700';
  const parentPercent = 'text-green-600';
  // --- マッチング申請・承認待ち・メッセージへ等のUI ---
  const router = useRouter();
  // 親の同意モーダルからpendingMatchInfoがセットされた場合の自動申請処理
  useEffect(() => {
    if (!setCreating || !setPendingMatchInfo || !pendingMatchInfo || !router) return;
    const doRequest = async () => {
      setCreating(pendingMatchInfo.userId);
      try {
        const res = await apiRequest('/api/matching/create', {
          method: 'POST',
          body: {
            targetUserId: pendingMatchInfo.userId,
            similarityScore: pendingMatchInfo.score,
          }
        });
        if (!res.ok) throw new Error(res.error || 'マッチング申請に失敗しました');
        router.push('/messages');
      } catch (err) {
        alert('マッチング申請に失敗しました');
      } finally {
        setCreating(null);
        setPendingMatchInfo(null);
      }
    };
    doRequest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingMatchInfo]);

  // 親の同意モーダルの状態管理
  const [showParentApprovalModal, setShowParentApprovalModal] = useState(false);

  const renderMatchingAction = () => {
    if (!match || !setCreating || !calculateAge || !profile || !setPendingMatchInfo) return null;
    const isParent = userRole === 'parent';
    const childBirthDate = match.profile?.birth_date;
    const isChild = match.role === 'child';
    let isUnder18 = false;
    if (isChild && childBirthDate) {
      const age = calculateAge(childBirthDate);
      isUnder18 = age < 18;
    }
    const handleRequestClick = () => {
      const myAge = profile?.birth_date ? calculateAge(profile.birth_date) : null;
      const myRole = profile?.role;
      if (myRole === 'child' && myAge !== null && myAge < 18) {
        setPendingMatchInfo({ userId: match.userId, score });
        setShowParentApprovalModal(true);
      } else {
        setPendingMatchInfo({ userId: match.userId, score });
      }
    };
    if (match.existingMatchStatus === 'accepted' || match.existingMatchStatus === 'blocked') {
      return (
        <div className="flex items-center gap-2">
          <a
            href={`/messages/${match.existingMatchId}`}
            className="w-full block text-center rounded-lg px-3 py-2 text-white text-sm font-semibold transition bg-role-primary bg-role-primary-hover"
          >
            メッセージへ
          </a>
        </div>
      );
    }
    if (isParent && isChild && isUnder18) {
      return (
        <div className="w-full rounded-lg bg-green-100 px-3 py-2 text-green-800 text-sm font-semibold text-center border border-green-300">
          承認申請待ち（18歳未満のため）
        </div>
      );
    }
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
      <>
        <button
          onClick={handleRequestClick}
          disabled={creating === match.userId}
          className="w-full rounded-lg px-3 py-2 text-white text-sm font-semibold disabled:opacity-50 transition bg-role-primary bg-role-primary-hover"
        >
          {creating === match.userId ? '処理中...' : 'マッチング申請'}
        </button>
        <ParentApprovalModal
          open={showParentApprovalModal}
          onApprove={() => {
            setShowParentApprovalModal(false);
            setPendingMatchInfo(null);
          }}
          onCancel={() => {
            setShowParentApprovalModal(false);
            setPendingMatchInfo(null);
          }}
        />
      </>
    );
  };

  // --- ブロック状態管理 ---
  const [blockLoading, setBlockLoading] = useState(false);
  const [blocked, setBlocked] = useState(match?.existingMatchStatus === 'blocked');
  const isBlockedByOther = match?.existingMatchStatus === 'blocked' && match?.blocked_by && match?.blocked_by !== match?.currentUserId;
  const handleBlock = async () => {
    setBlockLoading(true);
    try {
      const res = await apiRequest('/api/matching/block', {
        method: 'POST',
        body: { targetUserId: match.userId },
      });
      if (!res.ok) throw new Error('ブロックに失敗しました');
      setBlocked(true);
    } catch (e: any) {
      alert(e.message || 'ブロックに失敗しました');
    } finally {
      setBlockLoading(false);
    }
  };
  const handleUnblock = async () => {
    setBlockLoading(true);
    try {
      const res = await apiRequest('/api/matching/unblock', {
        method: 'POST',
        body: { targetUserId: match.userId },
      });
      if (!res.ok) throw new Error('ブロック解除に失敗しました');
      setBlocked(false);
    } catch (e: any) {
      alert(e.message || 'ブロック解除に失敗しました');
    } finally {
      setBlockLoading(false);
    }
  };

  return (
    <div
      className={`w-full bg-gradient-to-br p-4 flex flex-col items-center justify-center rounded-lg ${userRole === 'child' ? 'from-child-50 to-child-100 border border-child-100' : parentGradient}`}
      style={userRole === 'child'
        ? { background: 'linear-gradient(135deg, #FFF7F0 0%, #FFF3E0 100%)' }
        : { background: 'linear-gradient(135deg, #F0FFF4 0%, #E6FFFA 100%)' }}
    >
      <div className="text-center mb-3">
        <div className="flex items-center justify-center gap-2 mb-1">
          <div className={`text-3xl font-bold ${userRole === 'child' ? 'text-child-600' : parentPercent}`}>{percent}%</div>
          <ScoreExplanation userRole={userRole as 'parent' | 'child'} />
        </div>
        <div className={`text-xs font-bold ${userRole === 'child' ? 'text-gray-900' : parentText}`}>類似度</div>
        <div className={`text-xs mt-1 ${userRole === 'child' ? 'text-gray-500' : parentText}`}>{label}</div>
      </div>
      <div className="w-full h-1 bg-gray-300 rounded-full mb-3 overflow-hidden">
        <div className={`h-full rounded-full ${getBarColor()}`} style={{ width: `${percent}%` }} />
      </div>
      {renderMatchingAction()}
      {/* ブロック・ブロック解除UI */}
      <div className="mt-2 w-full">
        {blocked ? (
          isBlockedByOther ? (
            <div className="w-full rounded bg-gray-100 px-3 py-2 text-gray-500 text-xs font-semibold text-center border border-gray-200">
              ブロックされています
            </div>
          ) : (
            <button
              className={`w-full rounded px-3 py-2 text-white text-xs font-semibold hover:opacity-80 disabled:opacity-50 ${userRole === 'child' ? 'bg-child-500' : 'bg-parent-500'}`}
              onClick={handleUnblock}
              disabled={blockLoading}
            >
              {blockLoading ? '解除中...' : 'ブロック解除'}
            </button>
          )
        ) : (
          <button
            className={`w-full rounded px-3 py-2 text-white text-xs font-semibold hover:opacity-80 disabled:opacity-50 ${userRole === 'child' ? 'bg-child-500' : 'bg-parent-500'}`}
            onClick={handleBlock}
            disabled={blockLoading}
          >
            {blockLoading ? 'ブロック中...' : 'ブロック'}
          </button>
        )}
      </div>
    </div>
  );
}
