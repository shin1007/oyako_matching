import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { getMatchingCandidates } from '@/lib/matching/candidates';
import { PendingNotification } from '@/app/components/dashboard/pending-notification';

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

  // テストモードチェック（開発環境のみ）
  const bypassVerification = process.env.NODE_ENV === 'development' && process.env.TEST_MODE_BYPASS_VERIFICATION === 'true';
  const bypassSubscription = process.env.NODE_ENV === 'development' && process.env.TEST_MODE_BYPASS_SUBSCRIPTION === 'true';
  
  // テストモードでは本人確認とサブスクリプションをバイパス
  const isVerified = bypassVerification || userData?.mynumber_verified;
  const isSubscriptionActive = bypassSubscription || subscription?.status === 'active';

  // Get matching candidates
  const matchingData = await getMatchingCandidates();

  const handleSignOut = async () => {
    'use server';
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect('/');
  };

  return (
    <div className={`min-h-screen ${userData?.role === 'child' ? 'bg-orange-50' : 'bg-green-50'}`}>
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="mb-8">
          <h1 className={`text-3xl font-bold ${userData?.role === 'child' ? 'text-orange-900' : 'text-green-900'}`}>ダッシュボード</h1>
        </div>

        {/* Pending Notifications */}
        <PendingNotification userRole={userData?.role} />

        {/* Profile Display Section - Mobile: Top, Desktop: Left Side */}
        <div className="lg:grid lg:grid-cols-[350px_550px] lg:gap-6 mb-6">
          {/* Profile Card */}
          <div className="mb-6 lg:mb-0">
            <div className={`rounded-lg ${userData?.role === 'child' ? 'bg-orange-100 border-2 border-orange-200' : 'bg-green-100 border-2 border-green-200'} p-6 shadow`}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className={`text-xl font-semibold ${userData?.role === 'child' ? 'text-orange-900' : 'text-green-900'}`}>プロフィール</h2>
                  <p className={`text-sm mt-1 font-medium ${userData?.role === 'child' ? 'text-orange-700' : 'text-green-700'}`}>
                    {userData?.role === 'parent' ? '親アカウント' : '子アカウント'}
                  </p>
                </div>
                <Link
                  href="/dashboard/profile"
                  className={`text-sm font-medium ${userData?.role === 'child' ? 'text-orange-700 hover:text-orange-900' : 'text-green-700 hover:text-green-900'}`}
                >
                  編集 →
                </Link>
              </div>

              {profile ? (
                <div className="space-y-4">
                  {/* Profile Image */}
                  <div className="flex justify-center">
                    <div className={`w-24 h-24 rounded-full ${userData?.role === 'child' ? 'bg-gradient-to-br from-orange-400 to-orange-600' : 'bg-gradient-to-br from-green-400 to-green-600'} flex items-center justify-center text-white text-3xl font-bold`}>
                      {(profile.last_name_kanji?.charAt(0) || profile.first_name_kanji?.charAt(0)) ? 
                        (profile.last_name_kanji?.charAt(0) || profile.first_name_kanji?.charAt(0)) : 
                        <span className="text-5xl">👤</span>
                      }
                    </div>
                  </div>

                  {/* Name */}
                  <div>
                    <p className={`text-sm ${userData?.role === 'child' ? 'text-orange-700' : 'text-green-700'}`}>氏名</p>
                    <p className={`text-lg font-medium ${userData?.role === 'child' ? 'text-orange-900' : 'text-green-900'}`}>
                      {profile.last_name_kanji && profile.first_name_kanji
                        ? `${profile.last_name_kanji} ${profile.first_name_kanji}`
                        : '未設定'}
                    </p>
                    {profile.last_name_hiragana && profile.first_name_hiragana && (
                      <p className={`text-sm ${userData?.role === 'child' ? 'text-orange-600' : 'text-green-600'}`}>
                        {profile.last_name_hiragana} {profile.first_name_hiragana}
                      </p>
                    )}
                  </div>

                  {/* Birth Date */}
                  {profile.birth_date && (
                    <div>
                      <p className={`text-sm ${userData?.role === 'child' ? 'text-orange-700' : 'text-green-700'}`}>生年月日</p>
                      <p className={userData?.role === 'child' ? 'text-orange-900' : 'text-green-900'}>
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
                      <p className={`text-sm ${userData?.role === 'child' ? 'text-orange-700' : 'text-green-700'}`}>性別</p>
                      <p className={userData?.role === 'child' ? 'text-orange-900' : 'text-green-900'}>
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
                      <p className={`text-sm ${userData?.role === 'child' ? 'text-orange-700' : 'text-green-700'}`}>出身地</p>
                      <p className={userData?.role === 'child' ? 'text-orange-900' : 'text-green-900'}>
                        {profile.birthplace_prefecture}
                        {profile.birthplace_municipality && ` ${profile.birthplace_municipality}`}
                      </p>
                    </div>
                  )}

                  {/* Bio */}
                  {profile.bio && (
                    <div>
                      <p className={`text-sm ${userData?.role === 'child' ? 'text-orange-700' : 'text-green-700'}`}>自己紹介</p>
                      <p className={`${userData?.role === 'child' ? 'text-orange-900' : 'text-green-900'} text-sm line-clamp-3`}>
                        {profile.bio}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-5xl mb-4">👤</div>
                  <p className={`${userData?.role === 'child' ? 'text-orange-700' : 'text-green-700'} mb-4`}>プロフィール情報が未設定です</p>
                  <Link
                    href="/dashboard/profile"
                    className={`inline-block rounded-lg ${userData?.role === 'child' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-green-600 hover:bg-green-700'} px-4 py-2 text-sm text-white`}
                  >
                    プロフィールを作成
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Right Side Content */}
          <div className="space-y-6">

            {/* Matching Candidates Notification */}
            {isVerified && (
              <>
                {matchingData.missingRequiredData ? (
                  <div className={`rounded-lg border-2 ${userData?.role === 'child' ? 'border-orange-300 bg-orange-100' : 'border-green-300 bg-green-100'} p-4`}>
                    <h3 className={`font-semibold ${userData?.role === 'child' ? 'text-orange-900' : 'text-green-900'}`}>マッチング候補を探すには情報が必要です</h3>
                    <p className={`mt-1 text-sm ${userData?.role === 'child' ? 'text-orange-800' : 'text-green-800'}`}>
                      マッチング候補を見つけるには、以下の情報を登録してください：
                      {matchingData.missingFields.join('、')}
                    </p>
                    <Link
                      href="/dashboard/profile"
                      className={`mt-3 inline-block rounded-lg ${userData?.role === 'child' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-green-600 hover:bg-green-700'} px-4 py-2 text-sm text-white`}
                    >
                      プロフィールを編集
                    </Link>
                  </div>
                ) : matchingData.candidates.length > 0 && (
                  <div className={`rounded-lg border-2 ${userData?.role === 'child' ? 'border-orange-300 bg-orange-100' : 'border-green-300 bg-green-100'} p-4`}>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className={`font-semibold ${userData?.role === 'child' ? 'text-orange-900' : 'text-green-900'}`}>
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
                      <p className={`mt-3 text-xs ${userData?.role === 'child' ? 'text-orange-700' : 'text-green-700'}`}>
                        他 {matchingData.candidates.length - 5} 件の候補があります
                      </p>
                    )}
                  </div>
                )}
              </>
            )}

              {/* Main Feature Panels - Vertical Layout */}
              {userData?.role === 'child' ? (
                // Child User - Same layout as parent with verification requirements
                <div className="space-y-4">
                  {/* Forum Card - Always available for children */}
                  <Link
                    href="/forum/child"
                    className="block rounded-lg bg-orange-100 border-2 border-orange-200 p-6 shadow hover:shadow-lg transition"
                  >
                    <div className="flex items-start">
                      <div className="text-4xl mr-4">💭</div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-orange-900">ピアサポート掲示板</h3>
                        <p className="mt-1 text-sm text-orange-800">
                          子ども同士で情報交換
                        </p>
                      </div>
                    </div>
                  </Link>

                  {/* Verification Required Features Section */}
                  <div className="rounded-lg border-2 border-orange-200 bg-orange-50 p-6">
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-orange-900 mb-2">
                        {isVerified ? '🔓 利用可能な機能' : '🔒 利用条件が必要な機能'}
                      </h3>
                      
                      {/* Requirements Status */}
                      <div className="mb-4 space-y-2">
                        {!isVerified && (
                          <div className="text-sm text-orange-800 flex items-center gap-3">
                            <div>
                              <span className="font-medium">① マイナンバー認証：</span>
                              <span className="text-red-600 font-semibold ml-2">未完了</span>
                            </div>
                            <Link
                              href="/auth/verification"
                              className="rounded-lg bg-orange-600 hover:bg-orange-700 px-4 py-2 text-sm text-white font-medium transition whitespace-nowrap"
                            >
                              認証する
                            </Link>
                          </div>
                        )}
                        {isVerified && (
                          <div className="text-sm text-orange-800 flex items-center gap-3">
                            <div>
                              <span className="font-medium">① マイナンバー認証：</span>
                              <span className="text-green-600 font-semibold ml-2">✓ 完了</span>
                            </div>
                            <button
                              disabled
                              className="rounded-lg bg-gray-400 px-4 py-2 text-sm text-gray-600 font-medium cursor-not-allowed whitespace-nowrap"
                            >
                              認証済み
                            </button>
                          </div>
                        )}
                      </div>

                      {isVerified && (
                        <p className="text-sm text-orange-800">
                          すべての条件が満たされています - すべての機能がご利用いただけます
                        </p>
                      )}
                    </div>

                    <div className="space-y-3">
                      {/* Matching Card */}
                      {isVerified ? (
                        <Link
                          href="/matching"
                          className="block rounded-lg bg-white p-5 shadow hover:shadow-md transition"
                        >
                          <div className="flex items-start">
                            <div className="text-3xl mr-4">🔍</div>
                            <div className="flex-1">
                              <h4 className="text-base font-semibold text-gray-900">親子マッチング</h4>
                              <p className="mt-1 text-sm text-gray-600">
                                マッチングを探す
                              </p>
                            </div>
                          </div>
                        </Link>
                      ) : (
                        <div className="rounded-lg bg-white p-5 shadow opacity-60">
                          <div className="flex items-start">
                            <div className="text-3xl mr-4">🔍</div>
                            <div className="flex-1">
                              <h4 className="text-base font-semibold text-gray-700">親子マッチング</h4>
                              <p className="mt-1 text-sm text-gray-500">
                                マッチングを探す
                              </p>
                              <p className="mt-2 text-xs text-orange-700 font-medium">
                                🔒 マイナンバー認証が必要
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Messages Card */}
                      {isVerified ? (
                        <Link
                          href="/messages"
                          className="block rounded-lg bg-white p-5 shadow hover:shadow-md transition"
                        >
                          <div className="flex items-start">
                            <div className="text-3xl mr-4">💬</div>
                            <div className="flex-1">
                              <h4 className="text-base font-semibold text-gray-900">メッセージ</h4>
                              <p className="mt-1 text-sm text-gray-600">
                                マッチング相手とのメッセージ
                              </p>
                            </div>
                          </div>
                        </Link>
                      ) : (
                        <div className="rounded-lg bg-white p-5 shadow opacity-60">
                          <div className="flex items-start">
                            <div className="text-3xl mr-4">💬</div>
                            <div className="flex-1">
                              <h4 className="text-base font-semibold text-gray-700">メッセージ</h4>
                              <p className="mt-1 text-sm text-gray-500">
                                マッチング相手とのメッセージ
                              </p>
                              <p className="mt-2 text-xs text-orange-700 font-medium">
                                🔒 マイナンバー認証が必要
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                // Parent User - Layout with subscription requirements
                <div className="space-y-4">
                  {/* Forum Card - Always available for parents */}
                  <Link
                    href="/forum/parent"
                    className="block rounded-lg bg-green-100 border-2 border-green-200 p-6 shadow hover:shadow-lg transition"
                  >
                    <div className="flex items-start">
                      <div className="text-4xl mr-4">💭</div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-green-900">ピアサポート掲示板</h3>
                        <p className="mt-1 text-sm text-green-800">
                          親同士で情報交換
                        </p>
                      </div>
                    </div>
                  </Link>

                  {/* Subscription Required Features Section */}
                  <div className="rounded-lg border-2 border-green-200 bg-green-50 p-6">
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-green-900 mb-2">
                        {isVerified && isSubscriptionActive ? '🔓 プレミアム機能' : '🔒 利用条件が必要な機能'}
                      </h3>
                      
                      {/* Requirements Status */}
                      <div className="mb-4 space-y-2">
                        {!isVerified && (
                          <div className="text-sm text-green-800 flex items-center justify-between gap-3">
                            <div>
                              <span className="font-medium">① マイナンバー認証：</span>
                              <span className="text-red-600 font-semibold ml-2">未完了</span>
                            </div>
                            <Link
                              href="/auth/verification"
                              className="rounded-lg bg-green-600 hover:bg-green-700 px-4 py-2 text-sm text-white font-medium transition whitespace-nowrap flex-shrink-0"
                            >
                              認証する
                            </Link>
                          </div>
                        )}
                        {isVerified && (
                          <div className="text-sm text-green-800 flex items-center justify-between gap-3">
                            <div>
                              <span className="font-medium">① マイナンバー認証：</span>
                              <span className="text-green-600 font-semibold ml-2">✓ 完了</span>
                            </div>
                            <button
                              disabled
                              className="rounded-lg bg-gray-400 px-4 py-2 text-sm text-gray-600 font-medium cursor-not-allowed whitespace-nowrap flex-shrink-0"
                            >
                              認証済み
                            </button>
                          </div>
                        )}
                        
                        {!isSubscriptionActive && (
                          <div className="text-sm text-green-800 flex items-center justify-between gap-3">
                            <div>
                              <span className="font-medium">② サブスクリプション：</span>
                              <span className="text-red-600 font-semibold ml-2">未登録</span>
                            </div>
                            <Link
                              href="/payments/subscribe"
                              className="rounded-lg bg-green-600 hover:bg-green-700 px-4 py-2 text-sm text-white font-medium transition whitespace-nowrap flex-shrink-0"
                            >
                              980円/月
                            </Link>
                          </div>
                        )}
                        {isSubscriptionActive && (
                          <div className="text-sm text-green-800 flex items-center justify-between gap-3">
                            <div>
                              <span className="font-medium">② サブスクリプション：</span>
                              <span className="text-green-600 font-semibold ml-2">✓ 登録済み</span>
                            </div>
                            <button
                              disabled
                              className="rounded-lg bg-gray-400 px-4 py-2 text-sm text-gray-600 font-medium cursor-not-allowed whitespace-nowrap flex-shrink-0"
                            >
                              登録済み
                            </button>
                          </div>
                        )}
                      </div>

                      {isVerified && isSubscriptionActive && (
                        <p className="text-sm text-green-800">
                          すべての条件が満たされています - すべての機能がご利用いただけます
                        </p>
                      )}
                    </div>

                    <div className="space-y-3">
                      {/* Matching Card */}
                      {isVerified && isSubscriptionActive ? (
                        <Link
                          href="/matching"
                          className="block rounded-lg bg-white p-5 shadow hover:shadow-md transition"
                        >
                          <div className="flex items-start">
                            <div className="text-3xl mr-4">🔍</div>
                            <div className="flex-1">
                              <h4 className="text-base font-semibold text-gray-900">親子マッチング</h4>
                              <p className="mt-1 text-sm text-gray-600">
                                マッチングを探す
                              </p>
                            </div>
                          </div>
                        </Link>
                      ) : (
                        <div className="rounded-lg bg-white p-5 shadow opacity-60">
                          <div className="flex items-start">
                            <div className="text-3xl mr-4">🔍</div>
                            <div className="flex-1">
                              <h4 className="text-base font-semibold text-gray-700">親子マッチング</h4>
                              <p className="mt-1 text-sm text-gray-500">
                                マッチングを探す
                              </p>
                              <p className="mt-2 text-xs text-green-700 font-medium">
                                🔒 マイナンバー認証とサブスクリプションが必要
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Messages Card */}
                      {isVerified && isSubscriptionActive ? (
                        <Link
                          href="/messages"
                          className="block rounded-lg bg-white p-5 shadow hover:shadow-md transition"
                        >
                          <div className="flex items-start">
                            <div className="text-3xl mr-4">💬</div>
                            <div className="flex-1">
                              <h4 className="text-base font-semibold text-gray-900">メッセージ</h4>
                              <p className="mt-1 text-sm text-gray-600">
                                マッチング相手とのメッセージ
                              </p>
                            </div>
                          </div>
                        </Link>
                      ) : (
                        <div className="rounded-lg bg-white p-5 shadow opacity-60">
                          <div className="flex items-start">
                            <div className="text-3xl mr-4">💬</div>
                            <div className="flex-1">
                              <h4 className="text-base font-semibold text-gray-700">メッセージ</h4>
                              <p className="mt-1 text-sm text-gray-500">
                                マッチング相手とのメッセージ
                              </p>
                              <p className="mt-2 text-xs text-green-700 font-medium">
                                🔒 マイナンバー認証とサブスクリプションが必要
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

            {/* Subscription Info for Parents */}
            {userData?.role === 'parent' && subscription && (
              <div className="rounded-lg bg-green-100 border-2 border-green-200 p-6 shadow">
                <h3 className="text-lg font-semibold text-green-900">サブスクリプション情報</h3>
                <div className="mt-4 space-y-2 text-sm">
                  <p>
                    <span className="text-green-800">状態:</span>{' '}
                    <span className={`font-semibold ${subscription.status === 'active' ? 'text-green-600' : 'text-red-600'}`}>
                      {subscription.status === 'active' ? 'アクティブ' : subscription.status}
                    </span>
                  </p>
                  <p>
                    <span className="text-green-800">次回請求日:</span>{' '}
                    {new Date(subscription.current_period_end).toLocaleDateString('ja-JP')}
                  </p>
                </div>
                <Link
                  href="/payments/manage"
                  className="mt-4 inline-block text-sm text-green-700 hover:text-green-900 font-medium"
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
