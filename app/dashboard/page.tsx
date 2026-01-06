import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

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

  const handleSignOut = async () => {
    'use server';
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect('/');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/dashboard" className="text-2xl font-bold text-blue-600">
            親子マッチング
          </Link>
          <nav className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{profile?.full_name || user.email}</span>
            <form action={handleSignOut}>
              <button
                type="submit"
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
              >
                ログアウト
              </button>
            </form>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">ダッシュボード</h1>
          <p className="mt-2 text-gray-600">
            {userData?.role === 'parent' ? '親アカウント' : '子アカウント'}
          </p>
        </div>

        {/* Verification Status */}
        {!userData?.mynumber_verified && (
          <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
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
          <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
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

        {/* Main Content Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Profile Card */}
          <Link
            href="/dashboard/profile"
            className="rounded-lg bg-white p-6 shadow hover:shadow-lg transition"
          >
            <div className="mb-4 text-4xl">👤</div>
            <h3 className="text-lg font-semibold text-gray-900">プロフィール</h3>
            <p className="mt-2 text-sm text-gray-600">
              {profile ? 'プロフィールを編集' : 'プロフィールを作成'}
            </p>
          </Link>

          {/* Episodes Card */}
          <Link
            href="/dashboard/episodes"
            className="rounded-lg bg-white p-6 shadow hover:shadow-lg transition"
          >
            <div className="mb-4 text-4xl">📝</div>
            <h3 className="text-lg font-semibold text-gray-900">エピソード</h3>
            <p className="mt-2 text-sm text-gray-600">
              思い出のエピソードを登録
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

          {/* Time Capsules Card */}
          {userData?.role === 'parent' && (
            <Link
              href="/dashboard/time-capsules"
              className="rounded-lg bg-white p-6 shadow hover:shadow-lg transition"
            >
              <div className="mb-4 text-4xl">⏰</div>
              <h3 className="text-lg font-semibold text-gray-900">タイムカプセル</h3>
              <p className="mt-2 text-sm text-gray-600">
                未来へメッセージを送る
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
          <div className="mt-8 rounded-lg bg-white p-6 shadow">
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
      </main>
    </div>
  );
}
