"use client";
import React, { useState } from 'react';
import { MatchedTargetCard } from '@/app/components/matching/MatchedTargetCard';
import { TheirTargetPeopleList } from '@/app/components/matching/TheirTargetPeopleList';
import { ParentApprovalModal } from '@/app/components/matching/ParentApprovalModal';
import { apiRequest } from '@/lib/api/request';
import { useRouter } from 'next/navigation';

interface SmallCardListProps {
  matchedTargets: any[];
  target: any;
  userRole: string | null;
  calculateAge: (birthDate: string) => number;
  profile: any;
}

export const SmallCardList: React.FC<SmallCardListProps> = ({
  matchedTargets,
  target,
  userRole,
  calculateAge,
  profile,
}) => {
  if (!matchedTargets || matchedTargets.length === 0) {
    return (
      <div className="flex h-full min-h-[120px] items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-gray-600">
        マッチング相手がまだ見つかっていません
      </div>
    );
  }
  const [creating, setCreating] = useState<string | null>(null);
  const [showParentApprovalModal, setShowParentApprovalModal] = useState(false);
  const [pendingMatchInfo, setPendingMatchInfo] = useState<{userId: string, score: number} | null>(null);
  const router = useRouter();

  const handleCreateMatch = async (targetUserId: string, similarityScore: number) => {
    setCreating(targetUserId);
    try {
      const res = await apiRequest('/api/matching/create', {
        method: 'POST',
        body: {
          targetUserId,
          similarityScore,
        }
      });
      if (!res.ok) throw new Error(res.error || 'マッチング申請に失敗しました');
      router.push('/messages');
    } catch (err) {
      // 必要に応じてエラー通知を追加
      alert('マッチング申請に失敗しました');
    } finally {
      setCreating(null);
    }
  };
  function createMatchingActionButton(params: {
    userRole: string | null;
    match: any;
    childScore: number;
  }) {
    const { userRole, match, childScore } = params;
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
      const myAge = profile?.birth_date ? calculateAge(profile.birth_date) : null;
      const myRole = profile?.users?.role || profile?.role;
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
          <a
            href={`/messages/${match.existingMatchId}`}
            className="w-full block text-center rounded-lg px-3 py-2 text-white text-sm font-semibold transition bg-role-primary bg-role-primary-hover"
          >
            メッセージへ
          </a>
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
        className="w-full rounded-lg px-3 py-2 text-white text-sm font-semibold disabled:opacity-50 transition bg-role-primary bg-role-primary-hover"
      >
        {creating === match.userId ? '処理中...' : 'マッチング申請'}
      </button>
    );
  }

  return (
    <>
      {matchedTargets.map((match) => {
        const scoreObj = Array.isArray(match.targetScores)
          ? match.targetScores.find((ts: any) => ts.target.id === target.id)
          : undefined;
        const childScore = scoreObj
          ? (scoreObj.birthdayScore + scoreObj.nameScore + scoreObj.birthplaceScore + scoreObj.oppositeScore) / 100
          : 0;
        const actionButton = createMatchingActionButton({
          userRole,
          match,
          childScore,
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
      })}
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
    </>
  );
};
