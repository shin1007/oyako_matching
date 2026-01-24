import React from 'react';
import { UserProfileCard } from '@/components/ui/UserProfileCard';
import { TargetPersonCard } from '@/components/ui/TargetPersonCard';
import { ProfileBase, TargetPerson } from '@/types/profile';

interface UserHeaderProps {
  match: any;
}

function toProfileBaseFromMatch(match: any): ProfileBase {
  return {
    id: match.other_user_id || '',
    userId: match.other_user_id || '',
    role: match.other_user_role || '',
    nameKanji: match.other_user_name || '',
    birthDate: match.other_user_birth_date || '',
    birthplacePrefecture: match.other_user_birthplace_prefecture || '',
    birthplaceMunicipality: match.other_user_birthplace_municipality || '',
    gender: match.other_user_gender || '',
    profileImageUrl: match.other_user_image || '',
    bio: match.other_user_bio || '',
  };
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
      profile={toProfileBaseFromMatch(match)}
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