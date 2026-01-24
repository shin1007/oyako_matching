import React from 'react';
import { UserProfileCard } from '@/components/ui/UserProfileCard';
import { TargetPersonCard } from '@/components/ui/TargetPersonCard';


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
      birthDate={match.other_user_birth_date}
      genderLabel={match.other_user_gender}
      birthplace={
        match.other_user_birthplace_prefecture || match.other_user_birthplace_municipality
          ? `${match.other_user_birthplace_prefecture || ''}${match.other_user_birthplace_municipality ? ' ' + match.other_user_birthplace_municipality : ''}`
          : undefined
      }
      className="mb-4"
    />
    {/* 探している子どもの情報 */}
    {match.target_people && match.target_people.length > 0 && (
      <div className="border-t pt-4">
        <p className="text-xs font-semibold text-gray-900 mb-2">この方が探している{match.other_user_role === 'parent' ? '子ども' : '親'}:</p>
        <div className="flex flex-wrap gap-2">
          {match.target_people.map((child: any) => (
            <TargetPersonCard
              key={child.id}
              photoUrl={child.photo_url}
              name={`${child.last_name_kanji || ''}${child.first_name_kanji || ''}`}
              birthplace={
                child.birthplace_prefecture || child.birthplace_municipality
                  ? `${child.birthplace_prefecture || ''}${child.birthplace_municipality ? ' ' + child.birthplace_municipality : ''}`
                  : undefined
              }
            />
          ))}
        </div>
      </div>
    )}
  </div>
);