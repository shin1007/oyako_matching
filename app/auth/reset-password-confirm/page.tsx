import { apiRequest } from '@/lib/api/request';
'use client';

import { Suspense, useState, useEffect } from 'react';
import { isStrongPassword, isPasswordMatch } from '@/lib/validation/validators';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function ResetPasswordConfirmContent() {
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [code, setCode] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // URLからコードを取得
    const resetCode = searchParams.get('code');
    if (resetCode) {
      setCode(resetCode);
    }
  }, [searchParams]);



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // バリデーション
    if (!password || !passwordConfirm) {
      setError('パスワードを両方入力してください');
      setLoading(false);
      return;
    }

    if (!isStrongPassword(password)) {
      setError('8文字以上で、大文字・小文字・数字をすべて含めてください');
      setLoading(false);
      return;
    }

    if (!isPasswordMatch(password, passwordConfirm)) {
      setError('パスワードが一致しません');
      setLoading(false);
      return;
    }

    if (!code) {
      setError('リセットコードが見つかりません。リセットリンクを確認してください。');
      setLoading(false);
      return;
    }

    try {
        const res = await apiRequest('/api/auth/reset-password/confirm', {
          method: 'POST',
          body: { code, password },
        });
        if (!res.ok) {
          setError(res.error || 'パスワードリセットに失敗しました');
          return;
        }

      setSuccess(true);
      // 3秒後にログインページにリダイレクト
      setTimeout(() => {
        router.push('/auth/login');
      }, 3000);
    } catch (err: any) {
      console.error('Error:', err);
      setError('エラーが発生しました。もう一度試してください。');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-lg">
          <div className="text-center mb-6">
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">パスワード変更完了</h1>
          </div>

          <p className="text-gray-900 text-center mb-6">
            パスワードが正常にリセットされました。ログインページにリダイレクトしています...
          </p>

          <div className="space-y-3">
            <Link
              href="/auth/login"
              className="w-full inline-block text-center bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
            >
              ログインページに移動
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!code) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-lg">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">リセットリンクが無効です</h1>
            <p className="text-gray-900 mb-6">
              パスワードリセットのリンクが見つかりません。メール内のリンクから再度アクセスしてください。
            </p>
            <Link
              href="/auth/forgot-password"
              className="inline-block bg-blue-600 text-white font-semibold py-2 px-6 rounded-lg hover:bg-blue-700 transition-colors"
            >
              パスワード忘れページに戻る
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">新しいパスワードを設定</h1>
        <p className="text-gray-900 mb-6">新しいパスワードを入力してください。</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-900 mb-2">
              新しいパスワード
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="8文字以上"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
              required
            />
            <p className="text-xs text-gray-500 mt-1">8文字以上で、大文字・小文字・数字をすべて含めてください</p>
          </div>

          <div>
            <label htmlFor="passwordConfirm" className="block text-sm font-medium text-gray-900 mb-2">
              パスワード確認
            </label>
            <input
              type="password"
              id="passwordConfirm"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              placeholder="パスワードをもう一度入力"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? 'パスワード設定中...' : 'パスワードをリセット'}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-center text-gray-900 text-sm">
            <Link href="/auth/login" className="text-blue-600 hover:text-blue-700 font-semibold">
              ログインページに戻る
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordConfirmPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><p className="text-gray-900">読み込み中...</p></div>}>
      <ResetPasswordConfirmContent />
    </Suspense>
  );
}
