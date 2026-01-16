'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

export default function VerifyEmailPendingPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [email, setEmail] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [attemptsRemaining, setAttemptsRemaining] = useState(3);
  const [nextAllowedAt, setNextAllowedAt] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState<number>(0);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  useEffect(() => {
    checkUserStatus();
    
    // Check URL params for verification status
    const verified = searchParams.get('verified');
    const errorParam = searchParams.get('error');
    
    if (verified === 'true') {
      setSuccess('メールアドレスの確認が完了しました！');
      setIsVerified(true);
      // Redirect to dashboard after 3 seconds
      setTimeout(() => {
        router.push('/dashboard');
      }, 3000);
    }
    
    if (errorParam) {
      switch (errorParam) {
        case 'verification_failed':
          setError('メール確認に失敗しました。リンクが無効か期限切れです。');
          break;
        case 'missing_params':
          setError('無効な確認リンクです。');
          break;
        case 'unexpected':
          setError('予期しないエラーが発生しました。');
          break;
      }
    }
  }, [searchParams, router]);

  // Countdown timer for rate limit
  useEffect(() => {
    if (!nextAllowedAt) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const timeLeft = nextAllowedAt.getTime() - now;
      
      if (timeLeft <= 0) {
        setCountdown(0);
        setNextAllowedAt(null);
      } else {
        setCountdown(Math.ceil(timeLeft / 1000));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [nextAllowedAt]);

  const checkUserStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/auth/login');
        return;
      }

      setEmail(user.email || '');

      // Check if email is verified in Supabase Auth
      if (user.email_confirmed_at) {
        setIsVerified(true);
        // Update our database
        await supabase
          .from('users')
          .update({ email_verified_at: user.email_confirmed_at })
          .eq('id', user.id);
      }

      // Check recent attempts for rate limiting
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const { data: attempts } = await supabase
        .from('email_verification_attempts')
        .select('*')
        .eq('user_id', user.id)
        .gte('attempted_at', oneHourAgo.toISOString())
        .order('attempted_at', { ascending: false });

      if (attempts && attempts.length > 0) {
        const remaining = Math.max(0, 3 - attempts.length);
        setAttemptsRemaining(remaining);
        
        if (attempts.length >= 3) {
          const oldestAttempt = attempts[attempts.length - 1];
          const nextTime = new Date(
            new Date(oldestAttempt.attempted_at).getTime() + 60 * 60 * 1000
          );
          setNextAllowedAt(nextTime);
        }
      }
    } catch (err) {
      console.error('Error checking user status:', err);
    }
  };

  const handleResendEmail = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/auth/send-verification-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          setError(data.error);
          if (data.nextAllowedAt) {
            setNextAllowedAt(new Date(data.nextAllowedAt));
          }
        } else {
          throw new Error(data.error || '送信に失敗しました');
        }
      } else {
        setSuccess(data.message);
        setAttemptsRemaining(data.attemptsRemaining);
        // Refresh status after sending
        setTimeout(() => checkUserStatus(), 1000);
      }
    } catch (err: any) {
      setError(err.message || '認証メールの送信に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const formatCountdown = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  if (isVerified) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md">
          <div className="rounded-lg bg-white p-8 shadow-lg">
            <div className="text-center">
              <div className="mb-4 text-6xl">✅</div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                メール確認完了
              </h1>
              <p className="text-gray-600 mb-6">
                メールアドレスの確認が完了しました
              </p>
              {success && (
                <div className="mb-4 rounded-lg bg-green-50 p-4 text-sm text-green-600">
                  {success}
                </div>
              )}
              <p className="text-sm text-gray-500 mb-4">
                ダッシュボードに移動しています...
              </p>
              <Link
                href="/dashboard"
                className="inline-block rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700"
              >
                ダッシュボードへ
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="rounded-lg bg-white p-8 shadow-lg">
          <div className="mb-6 text-center">
            <div className="mb-4 text-6xl">📧</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              メールアドレスの確認
            </h1>
            <p className="text-gray-600">
              {email} に確認メールを送信しました
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-600">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 rounded-lg bg-green-50 p-4 text-sm text-green-600">
              {success}
            </div>
          )}

          <div className="mb-6 space-y-4 rounded-lg bg-blue-50 p-4">
            <h2 className="font-semibold text-blue-900 text-sm">
              確認手順
            </h2>
            <ol className="list-inside list-decimal space-y-2 text-sm text-blue-800">
              <li>受信したメールを開く</li>
              <li>メール内の確認リンクをクリック</li>
              <li>自動的にログインされます</li>
            </ol>
          </div>

          <div className="mb-6 text-sm text-gray-600">
            <p className="mb-2">メールが届かない場合：</p>
            <ul className="list-inside list-disc space-y-1 text-sm">
              <li>迷惑メールフォルダを確認</li>
              <li>メールアドレスが正しいか確認</li>
              <li>数分待ってから再送信</li>
            </ul>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleResendEmail}
              disabled={loading || countdown > 0 || attemptsRemaining === 0}
              className="w-full rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? '送信中...'
                : countdown > 0
                ? `再送信可能まで ${formatCountdown(countdown)}`
                : attemptsRemaining === 0
                ? '送信回数の上限に達しました'
                : '確認メールを再送信'}
            </button>

            {attemptsRemaining > 0 && countdown === 0 && (
              <p className="text-center text-xs text-gray-500">
                残り送信回数: {attemptsRemaining}/3（1時間あたり）
              </p>
            )}

            <Link
              href="/auth/login"
              className="block w-full rounded-lg border border-gray-300 px-4 py-2 text-center text-gray-700 hover:bg-gray-50"
            >
              ログイン画面に戻る
            </Link>
          </div>

          <div className="mt-6 text-center text-xs text-gray-500">
            <p>
              問題が解決しない場合は、サポートにお問い合わせください
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
