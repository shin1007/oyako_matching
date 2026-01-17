'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  isWebAuthnSupported,
  isPlatformAuthenticatorAvailable,
  authenticateWithPasskey,
  getWebAuthnErrorMessage,
} from '@/lib/webauthn/client';
import { createClient } from '@/lib/supabase/client';

export default function PasskeyLoginPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [supported, setSupported] = useState<boolean | null>(null);
  const router = useRouter();
  const supabase = createClient();

  // Email validation function
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Check browser support on mount
  useEffect(() => {
    (async () => {
      const isSupported = isWebAuthnSupported();
      const hasPlatform = await isPlatformAuthenticatorAvailable();
      setSupported(isSupported && hasPlatform);
    })();
  }, []);

  const handlePasskeyLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validate email format if provided
    if (email && !isValidEmail(email)) {
      setError('メールアドレスの形式が正しくありません。例: user@example.com');
      setLoading(false);
      return;
    }

    try {
      // Check support
      if (!isWebAuthnSupported()) {
        throw new Error(
          'このブラウザはパスキーに対応していません。Chrome、Safari、またはFirefoxをお使いください。'
        );
      }

      // Get authentication challenge from server
      const challengeResponse = await fetch(
        '/api/auth/passkey/login-challenge',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email || undefined }),
        }
      );

      if (!challengeResponse.ok) {
        const data = await challengeResponse.json();
        // User-friendly error messages
        if (data.error?.includes('not found') || data.error?.includes('No passkeys')) {
          throw new Error('このメールアドレスに登録されたパスキーが見つかりません。');
        }
        throw new Error(data.error || 'ログインの準備に失敗しました');
      }

      const { options } = await challengeResponse.json();

      // Start authentication with WebAuthn
      const credential = await authenticateWithPasskey(options);

      // Verify authentication with server
      const verifyResponse = await fetch('/api/auth/passkey/login-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential }),
      });

      if (!verifyResponse.ok) {
        const data = await verifyResponse.json();
        throw new Error(data.error || 'ログインに失敗しました');
      }

      const { user: userData } = await verifyResponse.json();

      // Passkey authentication was successful
      // However, we still need to create a Supabase session
      // Since we've verified the passkey on the server, we can trust this user
      // We'll redirect to dashboard and let the backend handle the session
      // Note: This is a limitation of the current implementation
      // In production, we would implement a proper session token exchange
      console.log('Passkey authentication successful for:', userData.email);
      
      // Show success message
      alert('パスキー認証に成功しました。ダッシュボードにリダイレクトします。');
      
      // Redirect to dashboard
      // The session should be created server-side in the verify endpoint
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      let errorMessage = getWebAuthnErrorMessage(err);
      
      // Translate Supabase rate limit errors
      if (errorMessage.includes('For security purposes')) {
        const match = errorMessage.match(/after (\d+) seconds?/);
        if (match) {
          const seconds = match[1];
          errorMessage = `セキュリティのため、${seconds}秒後に再試行してください。`;
        } else {
          errorMessage = 'セキュリティのため、しばらくしてから再試行してください。';
        }
      }
      
      setError(errorMessage);
      console.error('Passkey login error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (supported === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center text-gray-500">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">
            パスキーでログイン
          </h1>
          <p className="mt-2 text-gray-600">
            指紋、顔認証、またはデバイスのロック解除でログイン
          </p>
        </div>

        <div className="rounded-lg bg-white p-8 shadow-lg">
          {!supported ? (
            <div className="space-y-4">
              <div className="rounded-lg bg-yellow-50 p-4 text-sm text-yellow-800">
                <p className="font-medium">パスキーが利用できません</p>
                <p className="mt-1">
                  このブラウザまたはデバイスはパスキーに対応していません。Chrome、Safari、またはFirefoxの最新版をお使いください。
                </p>
              </div>
              <Link
                href="/auth/login"
                className="block w-full rounded-lg bg-gray-600 px-4 py-2 text-center text-white hover:bg-gray-700"
              >
                メール/パスワードでログイン
              </Link>
            </div>
          ) : (
            <form onSubmit={handlePasskeyLogin} className="space-y-6">
              {error && (
                <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">
                  {error}
                </div>
              )}

              <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-800">
                <p>
                  🔐 パスキーを使用すると、指紋や顔認証などで安全にログインできます
                </p>
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-900"
                >
                  メールアドレス（任意）
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="登録したメールアドレス"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                />
                <p className="mt-1 text-sm text-gray-500">
                  入力すると、そのアカウントのパスキーのみが表示されます
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'ログイン中...' : 'パスキーでログイン'}
              </button>
            </form>
          )}

          <div className="mt-6 space-y-2 text-center text-sm">
            <p className="text-gray-600">
              <Link
                href="/auth/login"
                className="text-blue-600 hover:underline"
              >
                メール/パスワードでログイン
              </Link>
            </p>
            <p className="text-gray-600">
              アカウントをお持ちでない方は{' '}
              <Link
                href="/auth/register"
                className="text-blue-600 hover:underline"
              >
                新規登録
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
