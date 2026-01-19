'use client';

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function HomeContent() {
  const searchParams = useSearchParams();
  const [showDeletedMessage, setShowDeletedMessage] = useState(false);

  useEffect(() => {
    if (searchParams.get('deleted') === 'true') {
      setShowDeletedMessage(true);
      // Hide message after 5 seconds
      const timeoutId = setTimeout(() => setShowDeletedMessage(false), 5000);
      // Cleanup timeout on unmount
      return () => clearTimeout(timeoutId);
    }
  }, [searchParams]);

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-blue-50 to-white">
      {/* Hero Section */}
      <main className="container mx-auto flex-1 px-4 py-16">
        {/* Account Deleted Success Message */}
        {showDeletedMessage && (
          <div className="mx-auto max-w-4xl mb-8">
            <div className="rounded-lg bg-parent-50 p-4 text-sm text-parent-800 border border-parent-200">
              ✓ アカウントが正常に削除されました。ご利用ありがとうございました。
            </div>
          </div>
        )}
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="mb-6 text-5xl font-bold text-gray-900">
            親子の再会を支援する
            <br />
            マッチングプラットフォーム
          </h2>
          <p className="mb-12 text-xl text-gray-600">
            親子断絶後の再会を、マイナンバーカード認証による
            <br />
            厳格な本人確認で支援します
          </p>

          <div className="grid gap-8 md:grid-cols-2">
            {/* 親向けカード */}
            <div className="rounded-2xl border-2 border-parent-200 bg-parent-50 p-8 shadow-lg">
              <div className="mb-4 text-4xl">👨‍👩‍👧‍👦</div>
              <h3 className="mb-4 text-2xl font-bold text-gray-900">
                離別した親の方へ
              </h3>
              <p className="mb-6 text-gray-600">
                プロフィール情報を登録して、<br />お子さまとの再会を目指しましょう。
              </p>
              <div className="mb-4 rounded-lg bg-white p-4 text-sm text-gray-700">
                <p className="font-semibold">基本登録無料</p>
                <p className="mt-2">
                  • 親同士の情報交換
                  <br />
                  • マイナンバーカード認証
                  <br />
                  <br />
                </p>
                <p className="font-semibold">以下の機能は月額 ¥980</p>
                <p className="mt-2">
                  • AI成長写真生成
                  <br />
                  • 子どもとのマッチング機能
                  <br />
                  • 安全なメッセージ機能
                </p>
              </div>
              <Link
                href="/auth/register?role=parent"
                className="block rounded-lg bg-parent-600 px-6 py-3 text-white hover:bg-parent-700"
              >
                親として登録
              </Link>
            </div>

            {/* 子ども向けカード */}
            <div className="rounded-2xl border-2 border-child-200 bg-child-50 p-8 shadow-lg">
              <div className="mb-4 text-4xl">👦👧</div>
              <h3 className="mb-4 text-2xl font-bold text-gray-900">
                親を探す子どもの方へ
              </h3>
              <p className="mb-6 text-gray-600">
                12歳以上の方が対象です。プロフィールを登録して、
                親御さんとの再会を目指しましょう。
              </p>
              <div className="mb-4 rounded-lg bg-white p-4 text-sm text-gray-700">
                <p className="font-semibold">完全無料</p>
                <p className="mt-2">
                  • 子ども同士の情報交換
                  <br />
                  • マイナンバーカード認証
                  <br />
                  • 親とのマッチング機能
                  <br />
                  • 安全なメッセージ機能
                </p>
              </div>
              <Link
                href="/auth/register?role=child"
                className="block rounded-lg bg-child-600 px-6 py-3 text-white hover:bg-child-700"
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
                <h4 className="mb-2 text-lg font-bold text-gray-900">厳格な本人確認</h4>
                <p className="text-sm text-gray-600">
                  マイナンバーカードによる確実な本人確認で、安全性を確保
                </p>
              </div>
              <div className="rounded-lg bg-white p-6 shadow">
                <div className="mb-4 text-3xl">🤖</div>
                <h4 className="mb-2 text-lg font-bold text-gray-900">AIマッチング</h4>
                <p className="text-sm text-gray-600">
                  プロフィール情報をもとに、高精度なマッチングを実現
                </p>
              </div>
              <div className="rounded-lg bg-white p-6 shadow">
                <div className="mb-4 text-3xl">🛡️</div>
                <h4 className="mb-2 text-lg font-bold text-gray-900">プライバシー保護</h4>
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
            <Link href="/terms" className="hover:text-gray-900">
              利用規約
            </Link>
            <Link href="/privacy" className="hover:text-gray-900">
              プライバシーポリシー
            </Link>
            <Link href="/contact" className="hover:text-gray-900">
              お問い合わせ
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><p className="text-gray-600">読み込み中...</p></div>}>
      <HomeContent />
    </Suspense>
  );
}
