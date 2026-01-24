import { getGenderLabel, calculateAge, getRoleLabel } from './matchingUtils';
import { UserProfileCard } from '@/components/ui/UserProfileCard';

interface TargetProfileCardProps {
  target: any;
  userRole: string;
}

export function TargetProfileCard({ target, userRole }: TargetProfileCardProps) {
  return (
    <UserProfileCard
      profile={{
        id: target.id,
        userId: target.user_id,
        role: userRole === 'parent' ? 'child' : 'parent',
        lastNameKanji: target.last_name_kanji || '',
        firstNameKanji: target.first_name_kanji || '',
        lastNameHiragana: target.last_name_hiragana || '',
        firstNameHiragana: target.first_name_hiragana || '',
        birthDate: target.birth_date || '',
        birthplacePrefecture: target.birthplace_prefecture || '',
        birthplaceMunicipality: target.birthplace_municipality || '',
        gender: getGenderLabel(target.gender, userRole === 'parent' ? 'child' : 'parent'),
        profileImageUrl: target.photo_url || '',
        bio: target.bio || '',
        forumDisplayName: target.forum_display_name || '',
      }}
      className="w-full lg:max-w-xs border-b lg:border-b-0 lg:border-r border-gray-100 bg-gray-50 px-6 py-5"
    />
  );
}
