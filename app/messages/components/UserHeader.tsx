import React from 'react';
import { UserProfileCard } from '@/components/ui/UserProfileCard';


interface UserHeaderProps {
  match: any;
}

export const UserHeader: React.FC<UserHeaderProps> = ({ match }) => (
  <div className="rounded-lg bg-white p-4 shadow">
    <UserProfileCard
      imageUrl={match.other_user_image}
      name={match.other_user_name}
      role={match.other_user_role}
      status={match.status}
      badgeLabel={`登録済み${match.other_user_role === 'parent' ? '親' : '子'}ユーザー`}
      className="mb-4"
    />
    {/* 探している子どもの情報 */}
    {match.target_people && match.target_people.length > 0 && (
      <div className="border-t pt-4">
        <p className="text-xs font-semibold text-gray-900 mb-2">この方が探している{match.other_user_role === 'parent' ? '子ども' : '親'}:</p>
        <div className="flex flex-wrap gap-2">
          {match.target_people.map((child: any) => (
            <div key={child.id} className="flex items-center gap-2 bg-blue-50 rounded p-2">
              {child.photo_url && (
                <img
                  src={child.photo_url}
                  alt={`${child.last_name_kanji || ''}${child.first_name_kanji || ''}`}
                  className="h-10 w-10 rounded object-cover border border-gray-200"
                />
              )}
              <p className="text-sm font-semibold text-gray-900">
                {child.last_name_kanji || ''}{child.first_name_kanji || ''}
              </p>
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
);