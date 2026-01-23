'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function VerificationPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [verificationUrl, setVerificationUrl] = useState('');
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/auth/login');
      return;
    }

    // Check if already verified
    const { data: userData } = await supabase
      .from('users')
      .select('verification_status, mynumber_verified')
      .eq('id', user.id)
      .single();

    if (userData?.mynumber_verified) {
      router.push('/dashboard');
    }
  };

  const handleStartVerification = async () => {
    setLoading(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('ログインが必要です');

      // Call API to initiate xID verification
      const response = await fetch('/api/auth/verify/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          callbackUrl: `${window.location.origin}/api/auth/verify/callback`,
        }),
      });

      if (!response.ok) {
        throw new Error('認証の開始に失敗しました');
      }

      const data = await response.json();
      setVerificationUrl(data.authUrl);
      
      // Redirect to xID authentication
      window.location.href = data.authUrl;
    } catch (err: any) {
      setError(err.message || '認証の開始に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-2xl">
        <div className="rounded-lg bg-white p-8 shadow-lg">
          <div className="mb-8 text-center">
            <div className="mb-4 text-6xl">🔐</div>
            <h1 className="text-3xl font-bold text-gray-900">本人確認</h1>
            <p className="mt-2 text-gray-900">
              マイナンバーカードによる本人確認が必要です
            </p>
          </div>

          {error && (
            <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="mb-8 space-y-4 rounded-lg bg-blue-50 p-6">
            <h2 className="font-semibold text-blue-900">本人確認について</h2>
            <ul className="list-inside list-disc space-y-2 text-sm text-blue-800">
              <li>マイナンバーカードとスマートフォンが必要です</li>
              <li>マイナンバーカードの4桁の暗証番号を準備してください</li>
              <li>本人確認は安全な外部サービス（xID）を使用します</li>
              <li>確認後、プロフィール登録に進みます</li>
            </ul>
          </div>

          <div className="space-y-4">
            <button
              onClick={handleStartVerification}
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 px-4 py-3 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? '認証開始中...' : 'マイナンバーカード認証を開始'}
            </button>
          </div>

          <div className="mt-6 text-center text-xs text-gray-500">
            <p>
              xIDによる認証では、お名前と生年月日のみが取得されます。
              <br />
              マイナンバー（個人番号）は取得されません。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
