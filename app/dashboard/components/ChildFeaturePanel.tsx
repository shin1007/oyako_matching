import Link from 'next/link';

interface ChildFeaturePanelProps {
  isVerified: boolean;
}

export function ChildFeaturePanel({ isVerified }: ChildFeaturePanelProps) {
  return (
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
            <p className="mt-1 text-sm text-orange-800">子ども同士で情報交換</p>
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
                  <p className="mt-1 text-sm text-gray-600">マッチングを探す</p>
                </div>
              </div>
            </Link>
          ) : (
            <div className="rounded-lg bg-white p-5 shadow opacity-60">
              <div className="flex items-start">
                <div className="text-3xl mr-4">🔍</div>
                <div className="flex-1">
                  <h4 className="text-base font-semibold text-gray-700">親子マッチング</h4>
                  <p className="mt-1 text-sm text-gray-500">マッチングを探す</p>
                  <p className="mt-2 text-xs text-orange-700 font-medium">🔒 マイナンバー認証が必要</p>
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
                  <p className="mt-1 text-sm text-gray-600">マッチング相手とのメッセージ</p>
                </div>
              </div>
            </Link>
          ) : (
            <div className="rounded-lg bg-white p-5 shadow opacity-60">
              <div className="flex items-start">
                <div className="text-3xl mr-4">💬</div>
                <div className="flex-1">
                  <h4 className="text-base font-semibold text-gray-700">メッセージ</h4>
                  <p className="mt-1 text-sm text-gray-500">マッチング相手とのメッセージ</p>
                  <p className="mt-2 text-xs text-orange-700 font-medium">🔒 マイナンバー認証が必要</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
