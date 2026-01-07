import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <h1 className="text-2xl font-bold text-blue-600">親子マッチング</h1>
          <nav className="flex gap-4">
            <Link 
              href="/auth/login" 
              className="rounded-lg px-4 py-2 text-gray-700 hover:bg-gray-100"
            >
              ログイン
            </Link>
            <Link 
              href="/auth/register" 
              className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              新規登録
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto flex-1 px-4 py-16">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="mb-6 text-5xl font-bold text-gray-900">
            親子の再会を支援する
            <br />
            マッチングプラットフォーム
          </h2>
          <p className="mb-12 text-xl text-gray-600">
            親子断絶・実子誘拐後の再会を、AIとマイナンバーカード認証による
            <br />
            厳格な本人確認とエピソードマッチングで支援します
          </p>

          <div className="grid gap-8 md:grid-cols-2">
            {/* 親向けカード */}
            <div className="rounded-2xl border-2 border-blue-200 bg-white p-8 shadow-lg">
              <div className="mb-4 text-4xl">👨‍👩‍👧‍👦</div>
              <h3 className="mb-4 text-2xl font-bold text-gray-900">
                離別した親の方へ
              </h3>
              <p className="mb-6 text-gray-600">
                思い出のエピソードを登録して、お子さまとの再会を目指しましょう。
                AIが類似度の高いマッチングをサポートします。
              </p>
              <div className="mb-4 rounded-lg bg-blue-50 p-4 text-sm text-gray-700">
                <p className="font-semibold">月額 ¥1,000</p>
                <p className="mt-2">
                  • マイナンバーカード認証
                  <br />
                  • エピソードマッチング
                  <br />
                  • AI成長写真生成
                  <br />• タイムカプセル機能
                </p>
              </div>
              <Link
                href="/auth/register?role=parent"
                className="block rounded-lg bg-blue-600 px-6 py-3 text-white hover:bg-blue-700"
              >
                親として登録
              </Link>
            </div>

            {/* 子ども向けカード */}
            <div className="rounded-2xl border-2 border-green-200 bg-white p-8 shadow-lg">
              <div className="mb-4 text-4xl">👦👧</div>
              <h3 className="mb-4 text-2xl font-bold text-gray-900">
                親を探す子どもの方へ
              </h3>
              <p className="mb-6 text-gray-600">
                12歳以上の方が対象です。あなたの思い出を登録して、
                親御さんとの再会を目指しましょう。
              </p>
              <div className="mb-4 rounded-lg bg-green-50 p-4 text-sm text-gray-700">
                <p className="font-semibold">完全無料</p>
                <p className="mt-2">
                  • マイナンバーカード認証
                  <br />
                  • エピソードマッチング
                  <br />
                  • 安全なメッセージ機能
                  <br />• タイムカプセル閲覧
                </p>
              </div>
              <Link
                href="/auth/register?role=child"
                className="block rounded-lg bg-green-600 px-6 py-3 text-white hover:bg-green-700"
              >
                子どもとして登録
              </Link>
            </div>
          </div>

          {/* 特徴セクション */}
          <div className="mt-16">
            <h3 className="mb-8 text-3xl font-bold text-gray-900">
              プラットフォームの特徴
            </h3>
            <div className="grid gap-6 md:grid-cols-3">
              <div className="rounded-lg bg-white p-6 shadow">
                <div className="mb-4 text-3xl">🔒</div>
                <h4 className="mb-2 text-lg font-bold">厳格な本人確認</h4>
                <p className="text-sm text-gray-600">
                  マイナンバーカードによる確実な本人確認で、安全性を確保
                </p>
              </div>
              <div className="rounded-lg bg-white p-6 shadow">
                <div className="mb-4 text-3xl">🤖</div>
                <h4 className="mb-2 text-lg font-bold">AIマッチング</h4>
                <p className="text-sm text-gray-600">
                  思い出エピソードをAIがベクトル化し、高精度なマッチングを実現
                </p>
              </div>
              <div className="rounded-lg bg-white p-6 shadow">
                <div className="mb-4 text-3xl">🛡️</div>
                <h4 className="mb-2 text-lg font-bold">プライバシー保護</h4>
                <p className="text-sm text-gray-600">
                  ストーカー規制法に準拠した非公開照合で、両者の安全を守ります
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-gray-50 py-8">
        <div className="container mx-auto px-4 text-center text-sm text-gray-600">
          <p>&copy; 2024 親子マッチング. All rights reserved.</p>
          <div className="mt-4 flex justify-center gap-6">
            <Link href="#" className="hover:text-gray-900">
              利用規約
            </Link>
            <Link href="#" className="hover:text-gray-900">
              プライバシーポリシー
            </Link>
            <Link href="#" className="hover:text-gray-900">
              お問い合わせ
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
