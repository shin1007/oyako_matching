import React from 'react';
import { StatusBadge } from '@/components/ui/StatusBadge';

interface UserProfileCardProps {
  imageUrl?: string | null;
  name: string;
  role: 'parent' | 'child' | string;
  status?: string;
  badgeLabel?: string;
  bio?: string;
  genderLabel?: string;
  age?: number | string;
  birthDate?: string;
  birthplace?: string;
  className?: string;
}

/**
 * ユーザー情報・プロフィール表示の共通カードコンポーネント
 */
export const UserProfileCard: React.FC<UserProfileCardProps> = ({
  imageUrl,
  name,
  role,
  status,
  badgeLabel,
  bio,
  genderLabel,
  age,
  birthDate,
  birthplace,
  className = '',
}) => (
  <div className={`flex gap-4 items-center rounded-lg bg-white p-4 shadow ${className}`}>
    {imageUrl ? (
      <img
        src={imageUrl}
        alt={name}
        className="h-16 w-16 rounded-full object-cover border border-gray-200"
      />
    ) : (
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-2xl">
        {role === 'parent' ? '👨‍👩‍👧‍👦' : '👦'}
      </div>
    )}
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-1">
        {badgeLabel && (
          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${role === 'parent' ? 'bg-parent-50 text-parent-700' : 'bg-child-50 text-child-700'}`}>
            {badgeLabel}
          </span>
        )}
        {status === 'blocked' && <span className="align-middle"><StatusBadge status="blocked" /></span>}
      </div>
      <h2 className="text-xl font-bold text-gray-900 truncate">{name}</h2>
      {/* プロフィール詳細（重複排除） */}
      <div className="text-sm text-gray-700 mt-1 space-y-1">
        {genderLabel && <div>性別: {genderLabel}</div>}
        {birthDate && <div>生年月日: {birthDate}</div>}
        {birthplace && <div>出身地: {birthplace}</div>}
        {age && <div>年齢: {age}歳</div>}
      </div>
      {bio && <p className="mt-2 text-sm text-gray-900 line-clamp-2">{bio}</p>}
    </div>
  </div>
);
