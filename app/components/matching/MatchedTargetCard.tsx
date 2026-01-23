import { getGenderLabel, calculateAge, getRoleLabel } from './matchingUtils';
import { MatchingSimilarityCard } from './MatchingSimilarityCard';
import Link from 'next/link';

interface MatchedTargetCardProps {
  match: any;
  target: any;
  userRole: string;
  childScore: number;
  creating: string | null;
  handleCreateMatch: (userId: string, score: number) => void;
  renderTheirTargetPeople: (match: any) => React.ReactNode;
}

export function MatchedTargetCard({ match, target, userRole, childScore, creating, handleCreateMatch, renderTheirTargetPeople }: MatchedTargetCardProps) {
  // 申請ボタン押下時の処理などは親で管理
  // ...既存のロジックをprops経由で受け取る形に
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-gray-100 bg-white p-4 shadow-sm hover:shadow-md transition lg:flex-row lg:items-center lg:justify-between">
      <div className="flex-1 flex gap-4">
        {match.profile?.profile_image_url && (
          <div className="flex-shrink-0">
            <img
              src={match.profile.profile_image_url}
              alt={`${match.profile.last_name_kanji ?? ''}${match.profile.first_name_kanji ?? ''}`}
              className="h-20 w-20 rounded-lg object-cover border border-gray-200"
            />
          </div>
        )}
        <div className="flex-1">
          <span className={`mb-1 inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${userRole === 'child' ? 'bg-child-50 text-child-700' : 'bg-parent-50 text-parent-700'}`}>
            登録済み{getRoleLabel(match.role || '')}ユーザー
          </span>
          <h4 className="text-lg font-semibold text-gray-900">{match.profile?.last_name_kanji ?? ''}{match.profile?.first_name_kanji ?? ''}</h4>
          <p className="text-sm text-gray-900 mt-1">
            {getGenderLabel(match.profile?.gender, match.role)}
            {match.profile?.birth_date && ` • ${calculateAge(match.profile.birth_date)}歳`}
          </p>
          {match.profile?.bio && (
            <p className="mt-2 text-sm text-gray-900 line-clamp-2">{match.profile.bio}</p>
          )}
          {match.profile?.birth_date && (
            <p className="text-xs text-gray-500 mt-1">
              生年月日: {new Date(match.profile.birth_date).toLocaleDateString('ja-JP', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          )}
          {(match.profile?.birthplace_prefecture || match.profile?.birthplace_municipality) && (
            <p className="text-xs text-gray-500 mt-1">
              出身地: {match.profile?.birthplace_prefecture || ''}
              {match.profile?.birthplace_municipality ? ` ${match.profile.birthplace_municipality}` : ''}
            </p>
          )}
          {renderTheirTargetPeople(match)}
        </div>
      </div>
      <div className="w-full lg:w-48">
        <MatchingSimilarityCard
          score={childScore}
          label={''}
          userRole={userRole}
        >
          {/** アクションボタンはchildren経由で受け取る */}
          {typeof (arguments[0] as any)?.children !== 'undefined' ? (arguments[0] as any).children : null}
        </MatchingSimilarityCard>
      </div>
    </div>
  );
}
