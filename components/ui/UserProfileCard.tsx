import React from 'react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ProfileBase } from '@/types/profile';

interface UserProfileCardProps {
  profile: ProfileBase;
  status?: string;
  badgeLabel?: string;
  age?: number | string;
  className?: string;
}

/**
 * ユーザー情報・プロフィール表示の共通カードコンポーネント
 */
export const UserProfileCard: React.FC<UserProfileCardProps> = ({
  profile,
  status,
  badgeLabel,
  age,
  className = '',
}) => (
  <div className={`flex gap-4 items-center rounded-lg bg-white p-4 shadow ${className}`}>
    {profile.profileImageUrl ? (
      <img
        src={profile.profileImageUrl}
        alt={
          (profile.lastNameKanji || '') + (profile.firstNameKanji || '') ||
          (profile.lastNameHiragana || '') + (profile.firstNameHiragana || '') ||
          ''
        }
        className="h-16 w-16 rounded-full object-cover border border-gray-200"
      />
    ) : (
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-2xl">
        {profile.role === 'parent' ? '👨‍👩‍👧‍👦' : '👦'}
      </div>
    )}
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-1">
        {badgeLabel && (
          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${profile.role === 'parent' ? 'bg-parent-50 text-parent-700' : 'bg-child-50 text-child-700'}`}>
            {badgeLabel}
          </span>
        )}
        {status === 'blocked' && <span className="align-middle"><StatusBadge status="blocked" /></span>}
      </div>
      <h2 className="text-xl font-bold text-gray-900 truncate">
        {(profile.lastNameKanji || '') + (profile.firstNameKanji || '') ||
         (profile.lastNameHiragana || '') + (profile.firstNameHiragana || '') ||
         ''}
      </h2>
      {/* プロフィール詳細 */}
      <div className="text-sm text-gray-700 mt-1 space-y-1">
        {profile.gender && <div>性別: {profile.gender}</div>}
        {profile.birthDate && <div>生年月日: {profile.birthDate}</div>}
        {(profile.birthplacePrefecture || profile.birthplaceMunicipality) && (
          <div>出身地: {profile.birthplacePrefecture || ''}{profile.birthplaceMunicipality ? ' ' + profile.birthplaceMunicipality : ''}</div>
        )}
        {age && <div>年齢: {age}歳</div>}
      </div>
      {profile.bio && <p className="mt-2 text-sm text-gray-900 line-clamp-2">{profile.bio}</p>}
    </div>
  </div>
);
