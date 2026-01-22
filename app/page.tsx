'use client';

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";


function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showDeletedMessage, setShowDeletedMessage] = useState(false);

  useEffect(() => {
    // ログイン済みならダッシュボードへリダイレクト
    const redirectIfAuthenticated = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        router.replace("/dashboard");
      }
    };
    redirectIfAuthenticated();
  }, [router]);

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
    <div className="relative flex min-h-screen flex-col bg-gradient-to-b from-blue-100 to-white overflow-x-hidden">
      {/* ヒーローセクション背景SVG */}
      {/* SVG背景は削除 */}
      {/* Hero Section */}
      <main className="container mx-auto flex-1 px-4 py-20 relative z-10">
        {/* Account Deleted Success Message */}
        {showDeletedMessage && (
          <div className="mx-auto max-w-4xl mb-8">
            <div className="rounded-lg bg-parent-50 p-4 text-sm text-parent-800 border border-parent-200">
              ✓ アカウントが正常に削除されました。ご利用ありがとうございました。
            </div>
          </div>
        )}
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="mb-6 text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-700 via-blue-400 to-blue-700 drop-shadow-lg leading-snug">
            親子の再会を支援する
            <br />
            マッチングプラットフォーム
          </h2>
          <p className="mb-12 text-xl text-gray-700 font-medium">
            マイナンバーカード認証による厳格な本人確認で
            <br />
            離れ離れになった親子の再会を支援します
          </p>

          <div className="grid gap-8 md:grid-cols-2">
            {/* 親向けカード */}
            <div className="flex flex-col h-full rounded-2xl border-2 border-parent-200 bg-parent-50 p-8 shadow-xl transition-transform duration-300 hover:scale-105 hover:shadow-2xl">
              <div>
                <div className="mb-4 text-4xl">👨‍👩‍👧‍👦</div>
                <h3 className="mb-4 text-2xl font-bold text-gray-900">離別した親の方へ</h3>
                <p className="mb-6 text-gray-600">プロフィール情報を登録して、<br />お子さまとの再会を目指しましょう。</p>
                <div className="mb-4 rounded-lg bg-white p-4 text-sm text-gray-700">
                  <p className="font-semibold">基本登録無料</p>
                  <p className="mt-2">
                    • 親同士の情報交換<br /><br />
                  </p>
                  <p className="font-semibold">以下の機能は月額 ¥980</p>
                  <p className="mt-2">
                    • マイナンバーカード認証<br />• 子どもとのマッチング機能<br />• 安全なメッセージ機能
                  </p>
                </div>
              </div>
              <div className="mt-auto">
                <Link
                  href="/auth/register?role=parent"
                  className="group block rounded-lg bg-parent-600 px-6 py-3 text-white hover:bg-parent-700 font-bold text-lg shadow-md transition-all duration-300 hover:scale-105"
                >
                  <span className="inline-flex items-center justify-center gap-2">
                    <svg className="w-5 h-5 text-white group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                    親として登録
                  </span>
                </Link>
              </div>
            </div>

            {/* 子ども向けカード */}
            <div className="flex flex-col h-full rounded-2xl border-2 border-child-200 bg-child-50 p-8 shadow-xl transition-transform duration-300 hover:scale-105 hover:shadow-2xl">
              <div>
                <div className="mb-4 text-4xl">👦👧</div>
                <h3 className="mb-4 text-2xl font-bold text-gray-900">親を探す子どもの方へ</h3>
                <p className="mb-6 text-gray-600">12歳以上の方が対象です。プロフィールを登録して、親御さんとの再会を目指しましょう。</p>
                <div className="mb-4 rounded-lg bg-white p-4 text-sm text-gray-700">
                  <p className="font-semibold">完全無料</p>
                  <p className="mt-2">
                    • 子ども同士の情報交換<br />• マイナンバーカード認証<br />• 親とのマッチング機能<br />• 安全なメッセージ機能<br />
                  </p>
                </div>
              </div>
              <div className="mt-auto">
                <Link
                  href="/auth/register?role=child"
                  className="group block rounded-lg bg-child-600 px-6 py-3 text-white hover:bg-child-700 font-bold text-lg shadow-md transition-all duration-300 hover:scale-105"
                >
                  <span className="inline-flex items-center justify-center gap-2">
                    <svg className="w-5 h-5 text-white group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                    子どもとして登録
                  </span>
                </Link>
              </div>
            </div>
          </div>

          {/* 特徴セクション */}
          <div className="mt-24">
            <h3 className="mb-8 text-3xl font-bold text-gray-900">
              プラットフォームの特徴
            </h3>
            <div className="flex justify-center">
              <div className="grid gap-8 md:grid-cols-2">
                <div className="rounded-xl bg-white p-8 shadow-xl border-t-4 border-blue-300 transition-transform duration-300 hover:scale-105 hover:shadow-2xl">
                  <div className="mb-4 text-4xl">🔒</div>
                  <h4 className="mb-2 text-lg font-extrabold text-blue-700">厳格な本人確認</h4>
                  <p className="text-base text-gray-700 font-medium">
                    マイナンバーカードによる確実な本人確認で、
                    <br />
                    両者の安全を守ります
                  </p>
                </div>
                <div className="rounded-xl bg-white p-8 shadow-xl border-t-4 border-blue-300 transition-transform duration-300 hover:scale-105 hover:shadow-2xl">
                  <div className="mb-4 text-4xl">🛡️</div>
                  <h4 className="mb-2 text-lg font-extrabold text-blue-700">プライバシー保護</h4>
                  <p className="text-base text-gray-700 font-medium">
                    ストーカー規制法に準拠した非公開照合で、
                    <br />
                    両者の安全を守ります
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-gradient-to-r from-blue-100 to-white py-8 mt-12">
        <div className="container mx-auto px-4 text-center text-sm text-gray-600">
          <p className="font-semibold tracking-wide">&copy; 2025 親子マッチング. All rights reserved.</p>
          <div className="mt-4 flex justify-center gap-8">
            <Link href="/terms" className="hover:text-blue-700 font-medium transition-colors">利用規約</Link>
            <span className="text-gray-400">|</span>
            <Link href="/privacy" className="hover:text-blue-700 font-medium transition-colors">プライバシーポリシー</Link>
            <span className="text-gray-400">|</span>
            <Link href="/contact" className="hover:text-blue-700 font-medium transition-colors">お問い合わせ</Link>
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
