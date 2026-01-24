import React from 'react';
import { UserProfileCard } from '@/components/ui/UserProfileCard';
import { TargetPersonCard } from '@/components/ui/TargetPersonCard';
import { TargetPerson, toProfileBaseFromOtherUser } from '@/types/profile';

interface UserHeaderProps {
  match: any;
}


function toTargetPersonFromChild(child: any): TargetPerson {
  return {
    id: child.id || '',
    nameKanji: `${child.last_name_kanji || ''}${child.first_name_kanji || ''}`,
    birthDate: child.birth_date || '',
    birthplacePrefecture: child.birthplace_prefecture || '',
    birthplaceMunicipality: child.birthplace_municipality || '',
    gender: child.gender || '',
    photoUrl: child.photo_url || '',
  };
}

export const UserHeader: React.FC<UserHeaderProps> = ({ match }) => (
  <div className="rounded-lg bg-white p-4 shadow">
    <UserProfileCard
      profile={toProfileBaseFromOtherUser(match)}
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
            <TargetPersonCard
              key={child.id}
              person={toTargetPersonFromChild(child)}
            />
          ))}
        </div>
      </div>
    )}
  </div>
);