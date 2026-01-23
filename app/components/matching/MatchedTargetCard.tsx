
import { getGenderLabel, calculateAge, getRoleLabel } from './matchingUtils';
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
        {match.profile?.profile_image_url && (
          <div className="flex-shrink-0">
            <img
              src={match.profile.profile_image_url}
              alt={`${match.profile.last_name_kanji ?? ''}${match.profile.first_name_kanji ?? ''}`}
              className="h-20 w-20 rounded-lg object-cover border border-gray-200"
            />
          </div>
        )}
        <div className="flex-1">
          <span className={`mb-1 inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${userRole === 'child' ? 'bg-child-50 text-child-700' : 'bg-parent-50 text-parent-700'}`}>
            登録済み{getRoleLabel(match.role || '')}ユーザー
          </span>
          <h4 className="text-lg font-semibold text-gray-900">{match.profile?.last_name_kanji ?? ''}{match.profile?.first_name_kanji ?? ''}</h4>
          <p className="text-sm text-gray-900 mt-1">
            {getGenderLabel(match.profile?.gender, match.role)}
            {match.profile?.birth_date && ` • ${calculateAge(match.profile.birth_date)}歳`}
          </p>
          {match.profile?.bio && (
            <p className="mt-2 text-sm text-gray-900 line-clamp-2">{match.profile.bio}</p>
          )}
          {match.profile?.birth_date && (
            <p className="text-xs text-gray-500 mt-1">
              生年月日: {new Date(match.profile.birth_date).toLocaleDateString('ja-JP', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          )}
          {(match.profile?.birthplace_prefecture || match.profile?.birthplace_municipality) && (
            <p className="text-xs text-gray-500 mt-1">
              出身地: {match.profile?.birthplace_prefecture || ''}
              {match.profile?.birthplace_municipality ? ` ${match.profile.birthplace_municipality}` : ''}
            </p>
          )}
          {renderTheirTargetPeople(match)}
        </div>
      </div>
      <div className="w-full lg:w-48">
        <MatchingSimilarityCard
          score={childScore}
          label={''}
          userRole={userRole}
        >
          {/* アクションボタンはchildren経由で受け取る */}
          {children}
          {/* ブロック・ブロック解除ボタン */}
          <div className="mt-2">
            {blocked ? (
              <button
                className="w-full rounded bg-gray-400 px-3 py-2 text-white text-xs font-semibold hover:bg-gray-500 disabled:opacity-50"
                onClick={handleUnblock}
                disabled={blockLoading}
              >
                {blockLoading ? '解除中...' : 'ブロック解除'}
              </button>
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
