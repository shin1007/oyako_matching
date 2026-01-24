import { getGenderLabel, calculateAge, getRoleLabel } from './matchingUtils';
import { UserProfileCard } from '@/components/ui/UserProfileCard';

interface TargetProfileCardProps {
  target: any;
  userRole: string;
}

export function TargetProfileCard({ target, userRole }: TargetProfileCardProps) {
  return (
    <UserProfileCard
      imageUrl={target.photo_url}
      name={
        target.last_name_kanji || target.first_name_kanji
          ? `${target.last_name_kanji || ''}${target.first_name_kanji || ''}`
          : target.name_kanji || target.name_hiragana || '名前未設定'
      }
      role={userRole === 'parent' ? 'child' : 'parent'}
      genderLabel={target.gender ? getGenderLabel(target.gender, userRole === 'parent' ? 'child' : 'parent') : '性別未設定'}
      age={target.birth_date ? calculateAge(target.birth_date) : undefined}
      birthDate={target.birth_date ? new Date(target.birth_date).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' }) : undefined}
      birthplace={
        target.birthplace_prefecture || target.birthplace_municipality
          ? `${target.birthplace_prefecture || ''}${target.birthplace_municipality ? ' ' + target.birthplace_municipality : ''}`
          : undefined
      }
      className="w-full lg:max-w-xs border-b lg:border-b-0 lg:border-r border-gray-100 bg-gray-50 px-6 py-5"
    />
  );
}
