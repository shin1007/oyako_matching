import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { getMatchingCandidates } from '@/lib/matching/candidates';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Get user data
  const { data: userData } = await supabase
    .from('users')
    .select('role, verification_status, mynumber_verified')
    .eq('id', user.id)
    .single();

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();

  // Get subscription for parents
  let subscription = null;
  if (userData?.role === 'parent') {
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single();
    subscription = sub;
  }

  // Get matching candidates
  const matchingData = await getMatchingCandidates();

  const handleSignOut = async () => {
    'use server';
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect('/');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">ダッシュボード</h1>
          <p className="mt-2 text-gray-600">
            {userData?.role === 'parent' ? '親アカウント' : '子アカウント'}
          </p>
        </div>

        {/* Profile Display Section - Mobile: Top, Desktop: Left Side */}
        <div className="lg:grid lg:grid-cols-[350px_1fr] lg:gap-6 mb-6">
          {/* Profile Card */}
          <div className="mb-6 lg:mb-0">
            <div className="rounded-lg bg-white p-6 shadow">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">プロフィール</h2>
                <Link
                  href="/dashboard/profile"
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  編集 →
                </Link>
              </div>

              {profile ? (
                <div className="space-y-4">
                  {/* Profile Image */}
                  <div className="flex justify-center">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-3xl font-bold">
                      {(profile.last_name_kanji?.charAt(0) || profile.first_name_kanji?.charAt(0)) ? 
                        (profile.last_name_kanji?.charAt(0) || profile.first_name_kanji?.charAt(0)) : 
                        <span className="text-5xl">👤</span>
                      }
                    </div>
                  </div>

                  {/* Name */}
                  <div>
                    <p className="text-sm text-gray-600">氏名</p>
                    <p className="text-lg font-medium text-gray-900">
                      {profile.last_name_kanji && profile.first_name_kanji
                        ? `${profile.last_name_kanji} ${profile.first_name_kanji}`
                        : '未設定'}
                    </p>
                    {profile.last_name_hiragana && profile.first_name_hiragana && (
                      <p className="text-sm text-gray-500">
                        {profile.last_name_hiragana} {profile.first_name_hiragana}
                      </p>
                    )}
                  </div>

                  {/* Birth Date */}
                  {profile.birth_date && (
                    <div>
                      <p className="text-sm text-gray-600">生年月日</p>
                      <p className="text-gray-900">
                        {new Date(profile.birth_date).toLocaleDateString('ja-JP', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  )}

                  {/* Gender */}
                  {profile.gender && (
                    <div>
                      <p className="text-sm text-gray-600">性別</p>
                      <p className="text-gray-900">
                        {(() => {
                          const genderMap: Record<string, string> = {
                            'male': '男性',
                            'female': '女性',
                            'other': 'その他',
                            'prefer_not_to_say': '回答しない'
                          };
                          return genderMap[profile.gender] || '未設定';
                        })()}
                      </p>
                    </div>
                  )}

                  {/* Birthplace */}
                  {(profile.birthplace_prefecture || profile.birthplace_municipality) && (
                    <div>
                      <p className="text-sm text-gray-600">出身地</p>
                      <p className="text-gray-900">
                        {profile.birthplace_prefecture}
                        {profile.birthplace_municipality && ` ${profile.birthplace_municipality}`}
                      </p>
                    </div>
                  )}

                  {/* Bio */}
                  {profile.bio && (
                    <div>
                      <p className="text-sm text-gray-600">自己紹介</p>
                      <p className="text-gray-900 text-sm line-clamp-3">
                        {profile.bio}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-5xl mb-4">👤</div>
                  <p className="text-gray-600 mb-4">プロフィール情報が未設定です</p>
                  <Link
                    href="/dashboard/profile"
                    className="inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
                  >
                    プロフィールを作成
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Right Side Content */}
          <div className="space-y-6">

            {/* Verification Status */}
            {!userData?.mynumber_verified && (
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                <h3 className="font-semibold text-yellow-900">本人確認が必要です</h3>
                <p className="mt-1 text-sm text-yellow-800">
                  マッチング機能を利用するには、マイナンバーカードによる本人確認が必要です。
                </p>
                <Link
                  href="/auth/verification"
                  className="mt-3 inline-block rounded-lg bg-yellow-600 px-4 py-2 text-sm text-white hover:bg-yellow-700"
                >
                  本人確認を行う
                </Link>
              </div>
            )}

            {/* Subscription Status for Parents */}
            {userData?.role === 'parent' && !subscription && userData.mynumber_verified && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <h3 className="font-semibold text-blue-900">サブスクリプションが必要です</h3>
                <p className="mt-1 text-sm text-blue-800">
                  マッチング機能を利用するには、月額¥1,000のサブスクリプションが必要です。
                </p>
                <Link
                  href="/payments/subscribe"
                  className="mt-3 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
                >
                  サブスクリプションを開始
                </Link>
              </div>
            )}

            {/* Matching Candidates Notification */}
            {userData?.mynumber_verified && (
              <>
                {matchingData.missingRequiredData ? (
                  <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
                    <h3 className="font-semibold text-orange-900">マッチング候補を探すには情報が必要です</h3>
                    <p className="mt-1 text-sm text-orange-800">
                      マッチング候補を見つけるには、以下の情報を登録してください：
                      {matchingData.missingFields.join('、')}
                    </p>
                    <Link
                      href="/dashboard/profile"
                      className="mt-3 inline-block rounded-lg bg-orange-600 px-4 py-2 text-sm text-white hover:bg-orange-700"
                    >
                      プロフィールを編集
                    </Link>
                  </div>
                ) : matchingData.candidates.length > 0 && (
                  <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-green-900">
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
                      生年月日が一致する{userData?.role === 'parent' ? '子ユーザー' : '親ユーザー'}が見つかりました
                    </p>
                    <div className="space-y-2">
                      {matchingData.candidates.slice(0, 5).map((candidate, index) => (
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
                      <p className="mt-3 text-xs text-green-700">
                        他 {matchingData.candidates.length - 5} 件の候補があります
                      </p>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Main Content Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
              {/* Profile Card */}
              <Link
                href="/dashboard/profile"
                className="rounded-lg bg-white p-6 shadow hover:shadow-lg transition"
              >
                <div className="mb-4 text-4xl">👤</div>
                <h3 className="text-lg font-semibold text-gray-900">詳細設定</h3>
                <p className="mt-2 text-sm text-gray-600">
                  プロフィール詳細設定
                </p>
              </Link>

              {/* Matching Card */}
              {userData?.mynumber_verified && (
                <Link
                  href="/matching"
                  className="rounded-lg bg-white p-6 shadow hover:shadow-lg transition"
                >
                  <div className="mb-4 text-4xl">🔍</div>
                  <h3 className="text-lg font-semibold text-gray-900">マッチング</h3>
                  <p className="mt-2 text-sm text-gray-600">
                    マッチングを探す
                  </p>
                </Link>
              )}

              {/* Messages Card */}
              {userData?.mynumber_verified && (
                <Link
                  href="/messages"
                  className="rounded-lg bg-white p-6 shadow hover:shadow-lg transition"
                >
                  <div className="mb-4 text-4xl">💬</div>
                  <h3 className="text-lg font-semibold text-gray-900">メッセージ</h3>
                  <p className="mt-2 text-sm text-gray-600">
                    マッチング相手とのメッセージ
                  </p>
                </Link>
              )}

              {/* AI Growth Photos Card */}
              {userData?.role === 'parent' && subscription?.status === 'active' && (
                <Link
                  href="/dashboard/growth-photos"
                  className="rounded-lg bg-white p-6 shadow hover:shadow-lg transition"
                >
                  <div className="mb-4 text-4xl">🖼️</div>
                  <h3 className="text-lg font-semibold text-gray-900">AI成長写真</h3>
                  <p className="mt-2 text-sm text-gray-600">
                    子どもの成長をシミュレーション
                  </p>
                </Link>
              )}

              {/* Forum Card */}
              {userData?.role === 'parent' && (
                <Link
                  href="/forum"
                  className="rounded-lg bg-white p-6 shadow hover:shadow-lg transition"
                >
                  <div className="mb-4 text-4xl">💭</div>
                  <h3 className="text-lg font-semibold text-gray-900">ピアサポート掲示板</h3>
                  <p className="mt-2 text-sm text-gray-600">
                    親同士で情報交換
                  </p>
                </Link>
              )}
            </div>

            {/* Subscription Info for Parents */}
            {userData?.role === 'parent' && subscription && (
              <div className="rounded-lg bg-white p-6 shadow">
                <h3 className="text-lg font-semibold text-gray-900">サブスクリプション情報</h3>
                <div className="mt-4 space-y-2 text-sm">
                  <p>
                    <span className="text-gray-600">状態:</span>{' '}
                    <span className={`font-semibold ${subscription.status === 'active' ? 'text-green-600' : 'text-red-600'}`}>
                      {subscription.status === 'active' ? 'アクティブ' : subscription.status}
                    </span>
                  </p>
                  <p>
                    <span className="text-gray-600">次回請求日:</span>{' '}
                    {new Date(subscription.current_period_end).toLocaleDateString('ja-JP')}
                  </p>
                </div>
                <Link
                  href="/payments/manage"
                  className="mt-4 inline-block text-sm text-blue-600 hover:underline"
                >
                  サブスクリプションを管理 →
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
