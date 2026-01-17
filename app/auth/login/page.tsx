'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isVerified, setIsVerified] = useState(false);
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
  }, []);

  // Email validation function
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

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
        
        router.push('/dashboard');
        router.refresh();
      }
    } catch (err: any) {
      console.error('Login error:', err);
      let errorMessage = 'ログインに失敗しました';
      
      // Check for network/fetch errors
      if (err.name === 'TypeError' && err.message?.includes('fetch')) {
        errorMessage = 'サーバーに接続できません。ネットワーク接続を確認してください。';
      }
      // Handle authentication errors
      else if (err.message?.includes('Invalid login credentials') || 
               err.message?.includes('Invalid email or password') ||
               err.name === 'AuthApiError') {
        errorMessage = 'メールアドレスまたはパスワードが正しくありません。';
      }
      // Handle email not confirmed error
      else if (err.message?.includes('Email not confirmed')) {
        errorMessage = 'メールアドレスの確認が完了していません。';
        // Redirect to verification page
        setTimeout(() => router.push('/auth/verify-email-pending'), 2000);
      }
      // Translate Supabase rate limit errors
      else if (err.message?.includes('For security purposes')) {
        const match = err.message.match(/after (\d+) seconds?/);
        if (match) {
          const seconds = match[1];
          errorMessage = `セキュリティのため、${seconds}秒後に再試行してください。`;
        } else {
          errorMessage = 'セキュリティのため、しばらくしてから再試行してください。';
        }
      }
      
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
          <p className="mt-2 text-gray-600">親子マッチング</p>
        </div>

        <div className="rounded-lg bg-white p-8 shadow-lg">
          <form onSubmit={handleLogin} className="space-y-6">
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
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'ログイン中...' : 'ログイン'}
            </button>
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

            <p className="text-center text-sm text-gray-600">
              アカウントをお持ちでない方は{' '}
              <Link href="/auth/register" className="text-blue-600 hover:underline">
                新規登録
              </Link>
            </p>
            
            {!isVerified && (
              <p className="text-center text-sm text-gray-600">
                メール確認がまだの方は{' '}
                <Link href="/auth/verify-email-pending" className="text-blue-600 hover:underline">
                  こちら
                </Link>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
