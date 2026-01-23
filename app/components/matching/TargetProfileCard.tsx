import { getGenderLabel, calculateAge, getRoleLabel } from './matchingUtils';

interface TargetProfileCardProps {
  target: any;
  userRole: string;
}

export function TargetProfileCard({ target, userRole }: TargetProfileCardProps) {
  return (
    <div className="w-full lg:max-w-xs border-b lg:border-b-0 lg:border-r border-gray-100 bg-gray-50 px-6 py-5">
      <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${userRole === 'child' ? 'text-child-600' : 'text-parent-600'}`}>
        {userRole === 'parent' ? '探している子ども' : '探している親'}
      </p>
      <h3 className="text-xl font-bold text-gray-900">
        {target.last_name_kanji}{target.first_name_kanji || target.name_kanji || target.name_hiragana || '名前未設定'}
      </h3>
      <p className="text-sm text-gray-600 mt-1">
        {target.gender ? getGenderLabel(target.gender, userRole === 'parent' ? 'child' : 'parent') : '性別未設定'}
        {target.birth_date && ` • ${calculateAge(target.birth_date)}歳`}
      </p>
      {target.birth_date && (
        <p className="text-xs text-gray-500 mt-1">
          生年月日: {new Date(target.birth_date).toLocaleDateString('ja-JP', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      )}
      {(target.birthplace_prefecture || target.birthplace_municipality) && (
        <p className="text-xs text-gray-500 mt-1">
          出身地: {target.birthplace_prefecture || ''}
          {target.birthplace_municipality ? ` ${target.birthplace_municipality}` : ''}
        </p>
      )}
    </div>
  );
}
