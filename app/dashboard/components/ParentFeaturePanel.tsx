import Link from 'next/link';

interface ParentFeaturePanelProps {
  isVerified: boolean;
  isSubscriptionActive: boolean;
  subscription: any;
}

export function ParentFeaturePanel({ isVerified, isSubscriptionActive, subscription }: ParentFeaturePanelProps) {
  return (
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
            <p className="mt-1 text-sm text-green-800">親同士で情報交換</p>
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
                  className="rounded-lg bg-gray-400 px-4 py-2 text-sm text-gray-900 font-medium cursor-not-allowed whitespace-nowrap flex-shrink-0"
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
                  className="rounded-lg bg-gray-400 px-4 py-2 text-sm text-gray-900 font-medium cursor-not-allowed whitespace-nowrap flex-shrink-0"
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
                  <p className="mt-1 text-sm text-gray-900">マッチングを探す</p>
                </div>
              </div>
            </Link>
          ) : (
            <div className="rounded-lg bg-white p-5 shadow opacity-60">
              <div className="flex items-start">
                <div className="text-3xl mr-4">🔍</div>
                <div className="flex-1">
                  <h4 className="text-base font-semibold text-gray-900">親子マッチング</h4>
                  <p className="mt-1 text-sm text-gray-500">マッチングを探す</p>
                  <p className="mt-2 text-xs text-green-700 font-medium">🔒 マイナンバー認証とサブスクリプションが必要</p>
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
                  <p className="mt-1 text-sm text-gray-900">マッチング相手とのメッセージ</p>
                </div>
              </div>
            </Link>
          ) : (
            <div className="rounded-lg bg-white p-5 shadow opacity-60">
              <div className="flex items-start">
                <div className="text-3xl mr-4">💬</div>
                <div className="flex-1">
                  <h4 className="text-base font-semibold text-gray-900">メッセージ</h4>
                  <p className="mt-1 text-sm text-gray-500">マッチング相手とのメッセージ</p>
                  <p className="mt-2 text-xs text-green-700 font-medium">🔒 マイナンバー認証とサブスクリプションが必要</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Subscription Info for Parents */}
      {subscription && (
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
  );
}
