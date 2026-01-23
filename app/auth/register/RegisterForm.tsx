'use client';

import { useState, useEffect } from 'react';
import { Turnstile } from '@marsidev/react-turnstile';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function RegisterForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'parent' | 'child'>('parent');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  // Email validation function
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  useEffect(() => {
    const roleParam = searchParams.get('role');
    if (roleParam === 'parent' || roleParam === 'child') {
      setRole(roleParam);
    }
  }, [searchParams]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

      if (!agreeTerms || !agreePrivacy) {
        setError('利用規約とプライバシーポリシーに同意してください');
        setLoading(false);
        return;
      }

    // Validate email format
    if (!isValidEmail(email)) {
      setError('メールアドレスの形式が正しくありません。例: user@example.com');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('パスワードが一致しません');
      setLoading(false);
      return;
    }

    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);

    if (!(password.length >= 8 && hasUpper && hasLower && hasNumber)) {
      setError('8文字以上で、大文字・小文字・数字をすべて含めてください');
      setLoading(false);
      return;
    }

    try {
        <div className="space-y-3 border-t pt-4">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
              className="mt-1 rounded border-gray-300"
            />
            <span className="text-sm text-gray-900">
              <Link href="/terms" target="_blank" className="text-blue-600 hover:underline">
                利用規約
              </Link>
              に同意します
            </span>
          </label>
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={agreePrivacy}
              onChange={(e) => setAgreePrivacy(e.target.checked)}
              className="mt-1 rounded border-gray-300"
            />
            <span className="text-sm text-gray-900">
              <Link href="/privacy" target="_blank" className="text-blue-600 hover:underline">
                プライバシーポリシー
              </Link>
              に同意します
            </span>
          </label>
        </div>
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/api/auth/verify-email`,
          data: {
            role,
          },
        },
      });

      if (signUpError) {
        // Handle already registered users: attempt sign-in when correct credentials
        if (signUpError.message?.includes('User already registered')) {
          console.log('[Register] User already registered, attempting sign-in');
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (signInError) {
            // If email not confirmed, silently redirect to verification pending
            if (
              signInError.message?.includes('Email not confirmed') ||
              signInError.message?.includes('Email not verified') ||
              signInError.message?.toLowerCase().includes('confirm your email')
            ) {
              router.push(`/auth/verify-email-pending?email=${encodeURIComponent(email)}`);
              return;
            }

            // Invalid credentials or other auth error: silently redirect to login
            router.push('/auth/login');
            return;
          }

          // Sign-in success: route to dashboard
          if (signInData?.user) {
            router.push('/dashboard');
            return;
          }

          // Fallback: silently go to verification pending
          router.push(`/auth/verify-email-pending?email=${encodeURIComponent(email)}`);
          return;
        }
        
        if (signUpError.message?.includes('Invalid email')) {
          throw new Error('メールアドレスの形式が正しくありません。');
        }
        // Translate Supabase rate limit errors
        if (signUpError.message?.includes('For security purposes')) {
          const match = signUpError.message.match(/after (\d+) seconds?/);
          if (match) {
            const seconds = match[1];
            throw new Error(`セキュリティのため、${seconds}秒後に再試行してください。`);
          } else {
            throw new Error('セキュリティのため、しばらくしてから再試行してください。');
          }
        }
        throw signUpError;
      }

      if (data.user) {
        // 監査ログ記録（API経由）
        await fetch('/api/log-audit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: data.user.id,
            event_type: 'register',
            target_table: 'users',
            target_id: data.user.id,
            description: '新規ユーザー登録'
          })
        });

        // Attempt to sign in after successful sign-up
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (!signInError && signInData?.user) {
          // Email confirmed: route to dashboard
          router.push('/dashboard');
          return;
        }

        // Email not confirmed or other error: redirect to verification pending
        router.push(`/auth/verify-email-pending?email=${encodeURIComponent(email)}`);
      }
    } catch (err: any) {
      setError(err.message || '登録に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg bg-white p-8 shadow-lg">
      <form onSubmit={handleRegister} className="space-y-6">
        <div>
          <Turnstile
            siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ''}
            onSuccess={setCaptchaToken}
            options={{ theme: 'light' }}
          />
        </div>
        {error && (
          <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">
            登録タイプ
          </label>
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setRole('parent')}
              className={`rounded-lg border-2 px-4 py-3 text-center transition ${
                role === 'parent'
                  ? 'border-green-600 bg-green-50 text-green-700'
                  : 'border-gray-300 text-gray-900 hover:border-gray-400'
              }`}
            >
              <div className="text-2xl mb-1">👨‍👩‍👧‍👦</div>
              <div className="font-medium">親</div>
              <div className="text-xs">登録無料</div>
            </button>
            <button
              type="button"
              onClick={() => setRole('child')}
              className={`rounded-lg border-2 px-4 py-3 text-center transition ${
                role === 'child'
                  ? 'border-orange-600 bg-orange-50 text-orange-700'
                  : 'border-gray-300 text-gray-900 hover:border-gray-400'
              }`}
            >
              <div className="text-2xl mb-1">👦👧</div>
              <div className="font-medium">子ども</div>
              <div className="text-xs">完全無料</div>
            </button>
          </div>
        </div>

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
            minLength={8}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
          />
          <p className="mt-1 text-xs text-gray-500">8文字以上で、大文字・小文字・数字をすべて含めてください</p>
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-900">
            パスワード（確認）
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
          />
        </div>

        <div className="space-y-3 border-t pt-4">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
              className="mt-1 rounded border-gray-300"
            />
            <span className="text-sm text-gray-900">
              <Link href="/terms" target="_blank" className="text-blue-600 hover:underline">利用規約</Link>に同意します
            </span>
          </label>
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={agreePrivacy}
              onChange={(e) => setAgreePrivacy(e.target.checked)}
              className="mt-1 rounded border-gray-300"
            />
            <span className="text-sm text-gray-900">
              <Link href="/privacy" target="_blank" className="text-blue-600 hover:underline">プライバシーポリシー</Link>に同意します
            </span>
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`w-full rounded-lg px-4 py-2 text-white disabled:opacity-50 ${
            role === 'parent' ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-600 hover:bg-orange-700'
          }`}
        >
          {loading ? '登録中...' : '登録'}
        </button>
      </form>

      <div className="mt-6 text-center text-sm">
        <p className="text-gray-900">
          すでにアカウントをお持ちの方は{' '}
          <Link href="/auth/login" className="text-blue-600 hover:underline">
            ログイン
          </Link>
        </p>
      </div>
    </div>
  );
}
