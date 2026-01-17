'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

export default function SubscribePage() {
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [userRole, setUserRole] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    checkUserAndSubscription();
  }, []);

  const checkUserAndSubscription = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }

      // Check user role
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!userData) {
        setError('ユーザー情報が見つかりません');
        return;
      }

      setUserRole(userData.role);

      // Check if user is a child (children don't need subscription)
      if (userData.role === 'child') {
        setError('子どもアカウントはサブスクリプション不要です');
        return;
      }

      // Check if already subscribed
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('status')
        .eq('user_id', user.id)
        .single();

      if (subscription && subscription.status === 'active') {
        router.push('/dashboard');
        return;
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async () => {
    setProcessing(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('ログインが必要です');

      // Create checkout session
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          email: user.email,
        }),
      });

      if (!response.ok) {
        throw new Error('決済セッションの作成に失敗しました');
      }

      const data = await response.json();
      
      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch (err: any) {
      setError(err.message || 'サブスクリプションの開始に失敗しました');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-600">読み込み中...</p>
      </div>
    );
  }

  if (userRole === 'child') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
          <div className="mb-4 text-center text-6xl">👦👧</div>
          <h1 className="mb-4 text-center text-2xl font-bold text-gray-900">
            サブスクリプション不要
          </h1>
          <p className="mb-6 text-center text-gray-600">
            子どもアカウントは無料でご利用いただけます
          </p>
          <Link
            href="/dashboard"
            className="block w-full rounded-lg bg-blue-600 px-4 py-3 text-center text-white hover:bg-blue-700"
          >
            ダッシュボードへ戻る
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="container mx-auto max-w-2xl px-4 py-16">
        <div className="mb-8 text-center">
          <h1 className="mb-4 text-4xl font-bold text-gray-900">
            サブスクリプション登録
          </h1>
          <p className="text-gray-600">
            親アカウントでマッチング機能を利用するには、サブスクリプションが必要です
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-red-50 p-4 text-center text-red-600">
            {error}
          </div>
        )}

        <div className="rounded-2xl border-2 border-blue-200 bg-white p-8 shadow-xl">
          <div className="mb-6 text-center">
            <div className="mb-4 text-6xl">👨‍👩‍👧‍👦</div>
            <h2 className="mb-2 text-3xl font-bold text-gray-900">親プラン</h2>
            <div className="mb-4">
              <span className="text-5xl font-bold text-blue-600">¥1,000</span>
              <span className="text-gray-600"> / 月</span>
            </div>
          </div>

          <div className="mb-8 space-y-4">
            <div className="flex items-start gap-3">
              <div className="text-xl">✓</div>
              <div>
                <p className="font-semibold text-gray-900">マイナンバーカード認証</p>
                <p className="text-sm text-gray-600">厳格な本人確認で安全性を確保</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="text-xl">✓</div>
              <div>
                <p className="font-semibold text-gray-900">AIマッチング</p>
                <p className="text-sm text-gray-600">プロフィール情報による高精度マッチング</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="text-xl">✓</div>
              <div>
                <p className="font-semibold text-gray-900">メッセージ機能</p>
                <p className="text-sm text-gray-600">マッチング相手との安全なメッセージ</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="text-xl">✓</div>
              <div>
                <p className="font-semibold text-gray-900">AI成長写真生成</p>
                <p className="text-sm text-gray-600">子どもの成長をシミュレーション</p>
              </div>
            </div>
          </div>

          <button
            onClick={handleSubscribe}
            disabled={processing}
            className="w-full rounded-lg bg-blue-600 px-6 py-4 text-lg font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {processing ? '処理中...' : 'サブスクリプションを開始'}
          </button>

          <p className="mt-4 text-center text-xs text-gray-500">
            Stripeによる安全な決済システムを使用しています
          </p>
        </div>
      </main>
    </div>
  );
}
