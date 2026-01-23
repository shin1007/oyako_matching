import Link from 'next/link';

interface MatchingCandidatesNotificationProps {
  userRole: string;
  isVerified: boolean;
  matchingData: any;
}

export function MatchingCandidatesNotification({ userRole, isVerified, matchingData }: MatchingCandidatesNotificationProps) {
  if (!isVerified) return null;

  if (matchingData.missingRequiredData) {
    return (
      <div className={`rounded-lg border-2 ${userRole === 'child' ? 'border-orange-300 bg-orange-100' : 'border-green-300 bg-green-100'} p-4`}>
        <h3 className={`font-semibold ${userRole === 'child' ? 'text-orange-900' : 'text-green-900'}`}>マッチング候補を探すには情報が必要です</h3>
        <p className={`mt-1 text-sm ${userRole === 'child' ? 'text-orange-800' : 'text-green-800'}`}>
          マッチング候補を見つけるには、以下の情報を登録してください：
          {matchingData.missingFields.join('、')}
        </p>
        <Link
          href="/dashboard/profile"
          className={`mt-3 inline-block rounded-lg ${userRole === 'child' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-green-600 hover:bg-green-700'} px-4 py-2 text-sm text-white`}
        >
          プロフィールを編集
        </Link>
      </div>
    );
  }

  if (matchingData.candidates.length > 0) {
    return (
      <div className={`rounded-lg border-2 ${userRole === 'child' ? 'border-orange-300 bg-orange-100' : 'border-green-300 bg-green-100'} p-4`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className={`font-semibold ${userRole === 'child' ? 'text-orange-900' : 'text-green-900'}`}>
            🎉 マッチング候補 {matchingData.candidates.length} 件
          </h3>
          <Link
            href="/matching"
            className="text-sm text-green-700 hover:text-green-800 font-medium"
          >
            すべて表示 →
          </Link>
        </div>
        <p className="text-sm text-green-800 mb-3">
          生年月日が一致する{userRole === 'parent' ? '子ユーザー' : '親ユーザー'}が見つかりました
        </p>
        <div className="space-y-2">
          {matchingData.candidates.slice(0, 5).map((candidate: any) => (
            <div
              key={candidate.userId}
              className="flex items-center justify-between bg-white rounded-lg p-3 text-sm"
            >
              <div>
                <p className="font-medium text-gray-900">{candidate.lastNameKanji}{candidate.firstNameKanji}</p>
                <p className="text-gray-600 text-xs">
                  生年月日: {candidate.birthDate ? new Date(candidate.birthDate).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' }) : '未設定'}
                </p>
              </div>
            </div>
          ))}
        </div>
        {matchingData.candidates.length > 5 && (
          <p className={`mt-3 text-xs ${userRole === 'child' ? 'text-orange-700' : 'text-green-700'}`}>
            他 {matchingData.candidates.length - 5} 件の候補があります
          </p>
        )}
      </div>
    );
  }

  return null;
}
