import { apiRequest } from '@/lib/api/request';
'use client';

import { useState, useEffect } from 'react';
import { isValidEmail } from '@/lib/validation/validators';
import { Turnstile } from '@marsidev/react-turnstile';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  // Check if user is already logged in on component mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          if (user.email_confirmed_at) {
            console.log('[Login] User already authenticated, redirecting to dashboard');
            setIsVerified(true);
            router.push('/dashboard');
          } else {
            console.log('[Login] User logged in but email not verified');
            setIsVerified(false);
          }
        }
      } catch (err) {
        console.log('[Login] No active session');
      }
    };
    checkSession();
  }, [router, supabase]);

  // Get email from URL parameters if available
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get('email');
    if (emailParam) {
      console.log('[Login] Email from URL params:', emailParam);
      setEmail(emailParam);
    }
    
    // Check for message or verified status
    const messageParam = params.get('message');
    const verifiedParam = params.get('verified');
    
    if (messageParam) {
      setMessage(decodeURIComponent(messageParam));
    }
    
    if (verifiedParam === 'true') {
      setMessage('メールアドレスの確認が完了しました！ログインしてください。');
    }
  }, []);



  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validate email format before attempting login
    if (!isValidEmail(email)) {
      setError('メールアドレスの形式が正しくありません。例: user@example.com');
      setLoading(false);
      return;
    }

    try {
      console.log('Attempting login...');
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      console.log('Login response:', { data, error });

      if (error) throw error;

      if (data.user) {
        // Check if email is verified
        if (!data.user.email_confirmed_at) {
          // Email not verified, redirect to verification pending page
          router.push('/auth/verify-email-pending');
          return;
        }

        // 監査ログ記録（API経由）
        await apiRequest('/api/log-audit', {
          method: 'POST',
          body: {
            user_id: data.user.id,
            event_type: 'login',
            target_table: 'users',
            target_id: data.user.id,
            description: '通常ログイン成功'
          }
        });

        router.push('/dashboard');
        router.refresh();
      }
    } catch (err: any) {
      console.error('Login error:', err);
      let errorMessage = 'ログインに失敗しました';
      let failReason = '';
      // Check for network/fetch errors
      if (err.name === 'TypeError' && err.message?.includes('fetch')) {
        errorMessage = 'サーバーに接続できません。ネットワーク接続を確認してください。';
        failReason = 'fetch error';
      }
      // Handle authentication errors
      else if (err.message?.includes('Invalid login credentials') || 
               err.message?.includes('Invalid email or password') ||
               err.name === 'AuthApiError') {
        errorMessage = 'メールアドレスまたはパスワードが正しくありません。';
        failReason = 'invalid credentials';
      }
      // Handle email not confirmed error
      else if (err.message?.includes('Email not confirmed')) {
        errorMessage = 'メールアドレスの確認が完了していません。';
        failReason = 'email not confirmed';
        // Redirect to verification page
        setTimeout(() => router.push('/auth/verify-email-pending'), 2000);
      }
      // Translate Supabase rate limit errors
      else if (err.message?.includes('For security purposes')) {
        const match = err.message.match(/after (\d+) seconds?/);
        if (match) {
          const seconds = match[1];
          errorMessage = `セキュリティのため、${seconds}秒後に再試行してください。`;
          failReason = `rate limit: ${seconds} seconds`;
        } else {
          errorMessage = 'セキュリティのため、しばらくしてから再試行してください。';
          failReason = 'rate limit';
        }
      } else {
        failReason = err?.message || 'unknown error';
      }

      // 監査ログ記録（API経由）
      await apiRequest('/api/log-audit', {
        method: 'POST',
        body: {
          event_type: 'login_failed',
          target_table: 'users',
          description: `ログイン失敗: ${failReason}`,
          // user_id, target_idは不明（ログイン失敗時）
        }
      });

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">ログイン</h1>
          <p className="mt-2 text-gray-900">親子マッチング</p>
        </div>

        <div className="rounded-lg bg-white p-8 shadow-lg">
          <form onSubmit={handleLogin} className="space-y-6">
            {message && (
              <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 text-sm text-blue-700">
                {message}
              </div>
            )}
            
            {error && (
              <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-900">
                メールアドレス
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-900">
                パスワード
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
              />
              <p className="mt-1 text-xs text-gray-500">8文字以上で、大文字・小文字・数字をすべて含めてください</p>
            </div>

            <div className="flex items-center justify-between">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'ログイン中...' : 'ログイン'}
              </button>
            </div>

            <div>
              <Link
                href="/auth/forgot-password"
                className="text-sm text-blue-600 hover:underline"
              >
                パスワードをお忘れですか？
              </Link>
            </div>
          </form>

          <div className="mt-6 space-y-4">
            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-2 text-gray-500">または</span>
              </div>
            </div>

            {/* Passkey Login Button */}
            <Link
              href="/auth/passkey-login"
              className="block w-full rounded-lg border-2 border-blue-600 bg-white px-4 py-2 text-center font-medium text-blue-600 hover:bg-blue-50"
            >
              🔐 パスキーでログイン
            </Link>

            <p className="text-center text-sm text-gray-900">
              アカウントをお持ちでない方は{' '}
              <Link href="/auth/register" className="text-blue-600 hover:underline">
                新規登録
              </Link>
            </p>
            
            {!isVerified && (
              <p className="text-center text-sm text-gray-900">
                メール確認がまだの方は{' '}
                <Link href="/auth/verify-email-pending" className="text-blue-600 hover:underline">
                  こちら
                </Link>
              </p>
            )}
            <div className="flex justify-center mt-4">
              <Turnstile
                siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ''}
                onSuccess={setCaptchaToken}
                options={{ theme: 'light' }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
