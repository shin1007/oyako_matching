
import { getGenderLabel, calculateAge, getRoleLabel } from './matchingUtils';
import { UserProfileCard } from '@/components/ui/UserProfileCard';
import { MatchingSimilarityCard } from './MatchingSimilarityCard';
import Link from 'next/link';
import { useState } from 'react';



import { ReactNode } from 'react';

interface MatchedTargetCardProps {
  match: any;
  target: any;
  userRole: string;
  childScore: number;
  creating: string | null;
  handleCreateMatch: (userId: string, score: number) => void;
  renderTheirTargetPeople: (match: any) => React.ReactNode;
  children?: ReactNode;
}


export function MatchedTargetCard({ match, target, userRole, childScore, creating, handleCreateMatch, renderTheirTargetPeople, children }: MatchedTargetCardProps) {
  const [blockLoading, setBlockLoading] = useState(false);
  const [blocked, setBlocked] = useState(match.existingMatchStatus === 'blocked');
  // blocked_byが自分以外なら「ブロックされています」表示
  const isBlockedByOther = match.existingMatchStatus === 'blocked' && match.blocked_by && match.blocked_by !== match.currentUserId;

  // ブロックAPI呼び出し
  const handleBlock = async () => {
    setBlockLoading(true);
    try {
      const res = await fetch('/api/matching/block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: match.userId }),
      });
      if (!res.ok) throw new Error('ブロックに失敗しました');
      setBlocked(true);
    } catch (e: any) {
      alert(e.message || 'ブロックに失敗しました');
    } finally {
      setBlockLoading(false);
    }
  };

  // ブロック解除API呼び出し
  const handleUnblock = async () => {
    setBlockLoading(true);
    try {
      const res = await fetch('/api/matching/unblock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: match.userId }),
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
    <div className="flex flex-col gap-4 rounded-lg border border-gray-100 bg-white p-4 shadow-sm hover:shadow-md transition lg:flex-row lg:items-center lg:justify-between">
      <div className="flex-1 flex gap-4">
        {userRole === 'child' ? (
          <div className="flex-1 flex flex-col gap-2">
            <UserProfileCard
              imageUrl={match.profile?.profile_image_url}
              name={`${match.profile?.last_name_kanji ?? ''}${match.profile?.first_name_kanji ?? ''}`}
              role={match.role}
              status={match.existingMatchStatus}
              badgeLabel={`登録済み${getRoleLabel(match.role || '')}ユーザー`}
              genderLabel={getGenderLabel(match.profile?.gender, match.role)}
              age={match.profile?.birth_date ? calculateAge(match.profile.birth_date) : undefined}
              bio={match.profile?.bio}
              birthDate={match.profile?.birth_date ? new Date(match.profile.birth_date).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' }) : undefined}
              birthplace={
                match.profile?.birthplace_prefecture || match.profile?.birthplace_municipality
                  ? `${match.profile?.birthplace_prefecture || ''}${match.profile?.birthplace_municipality ? ' ' + match.profile.birthplace_municipality : ''}`
                  : undefined
              }
              className="flex-1"
            />
            {renderTheirTargetPeople(match)}
          </div>
        ) : (
          <>
            <UserProfileCard
              imageUrl={match.profile?.profile_image_url}
              name={`${match.profile?.last_name_kanji ?? ''}${match.profile?.first_name_kanji ?? ''}`}
              role={match.role}
              status={match.existingMatchStatus}
              badgeLabel={`登録済み${getRoleLabel(match.role || '')}ユーザー`}
              genderLabel={getGenderLabel(match.profile?.gender, match.role)}
              age={match.profile?.birth_date ? calculateAge(match.profile.birth_date) : undefined}
              bio={match.profile?.bio}
              birthDate={match.profile?.birth_date ? new Date(match.profile.birth_date).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' }) : undefined}
              birthplace={
                match.profile?.birthplace_prefecture || match.profile?.birthplace_municipality
                  ? `${match.profile?.birthplace_prefecture || ''}${match.profile?.birthplace_municipality ? ' ' + match.profile.birthplace_municipality : ''}`
                  : undefined
              }
              className="flex-1"
            />
            {renderTheirTargetPeople(match)}
          </>
        )}
      </div>
      <div className="w-full lg:w-48">
        <MatchingSimilarityCard
          score={childScore}
          label={''}
          userRole={userRole}
        >
          {/* アクションボタンはchildren経由で受け取る */}
          {children}
          {/* ブロック・ブロック解除ボタン or ブロックされています表示（ボタンのみ残す） */}
          <div className="mt-2">
            {blocked ? (
              isBlockedByOther ? null : (
                <button
                  className="w-full rounded bg-gray-400 px-3 py-2 text-white text-xs font-semibold hover:bg-gray-500 disabled:opacity-50"
                  onClick={handleUnblock}
                  disabled={blockLoading}
                >
                  {blockLoading ? '解除中...' : 'ブロック解除'}
                </button>
              )
            ) : (
              <button
                className="w-full rounded bg-red-500 px-3 py-2 text-white text-xs font-semibold hover:bg-red-600 disabled:opacity-50"
                onClick={handleBlock}
                disabled={blockLoading}
              >
                {blockLoading ? 'ブロック中...' : 'ブロック'}
              </button>
            )}
          </div>
        </MatchingSimilarityCard>
      </div>
    </div>
  );
}
