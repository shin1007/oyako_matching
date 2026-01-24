
import { getGenderLabel, calculateAge, getRoleLabel } from './matchingUtils';
import { UserProfileCard } from '@/components/ui/UserProfileCard';
import { MatchingSimilarityCard } from './MatchingSimilarityCard';
import Link from 'next/link';
import { useState } from 'react';
import { apiRequest } from '@/lib/api/request';


 
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

  // ブロック解除API呼び出し
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
    <div className="flex flex-col gap-4 rounded-lg border border-gray-100 bg-white p-4 shadow-sm hover:shadow-md transition lg:flex-row lg:items-center lg:justify-between">
      <div className="flex-1 flex gap-4">
        {userRole === 'child' ? (
          <div className="flex-1 flex flex-col gap-2">
            <UserProfileCard
              profile={{
                id: match.profile?.id,
                userId: match.profile?.user_id,
                role: match.role,
                lastNameKanji: match.profile?.last_name_kanji ?? '',
                firstNameKanji: match.profile?.first_name_kanji ?? '',
                lastNameHiragana: match.profile?.last_name_hiragana ?? '',
                firstNameHiragana: match.profile?.first_name_hiragana ?? '',
                birthDate: match.profile?.birth_date ?? '',
                birthplacePrefecture: match.profile?.birthplace_prefecture ?? '',
                birthplaceMunicipality: match.profile?.birthplace_municipality ?? '',
                gender: getGenderLabel(match.profile?.gender, match.role),
                profileImageUrl: match.profile?.profile_image_url ?? '',
                bio: match.profile?.bio ?? '',
                forumDisplayName: match.profile?.forum_display_name ?? '',
              }}
              className="flex-1"
            />
            {renderTheirTargetPeople(match)}
          </div>
        ) : (
          <>
            <UserProfileCard
              profile={{
                id: match.profile?.id,
                userId: match.profile?.user_id,
                role: match.role,
                lastNameKanji: match.profile?.last_name_kanji ?? '',
                firstNameKanji: match.profile?.first_name_kanji ?? '',
                lastNameHiragana: match.profile?.last_name_hiragana ?? '',
                firstNameHiragana: match.profile?.first_name_hiragana ?? '',
                birthDate: match.profile?.birth_date ?? '',
                birthplacePrefecture: match.profile?.birthplace_prefecture ?? '',
                birthplaceMunicipality: match.profile?.birthplace_municipality ?? '',
                gender: getGenderLabel(match.profile?.gender, match.role),
                profileImageUrl: match.profile?.profile_image_url ?? '',
                bio: match.profile?.bio ?? '',
                forumDisplayName: match.profile?.forum_display_name ?? '',
              }}
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
        </MatchingSimilarityCard>
      </div>
    </div>
  );
}
