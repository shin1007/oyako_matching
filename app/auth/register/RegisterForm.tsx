'use client';

import { useState, useEffect } from 'react';
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

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

    if (password !== confirmPassword) {
      setError('パスワードが一致しません');
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError('パスワードは8文字以上である必要があります');
      setLoading(false);
      return;
    }

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role,
          },
        },
      });

      if (signUpError) throw signUpError;

      if (data.user) {
        const { error: insertError } = await supabase.from('users').insert({
          id: data.user.id,
          email,
          role,
          verification_status: 'pending',
          mynumber_verified: false,
        });

        if (insertError) throw insertError;
        router.push('/auth/verification');
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
        {error && (
          <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            登録タイプ
          </label>
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setRole('parent')}
              className={`rounded-lg border-2 px-4 py-3 text-center transition ${
                role === 'parent'
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-gray-300 text-gray-700 hover:border-gray-400'
              }`}
            >
              <div className="text-2xl mb-1">👨‍👩‍👧‍👦</div>
              <div className="font-medium">親</div>
              <div className="text-xs">月額¥1,000</div>
            </button>
            <button
              type="button"
              onClick={() => setRole('child')}
              className={`rounded-lg border-2 px-4 py-3 text-center transition ${
                role === 'child'
                  ? 'border-green-600 bg-green-50 text-green-700'
                  : 'border-gray-300 text-gray-700 hover:border-gray-400'
              }`}
            >
              <div className="text-2xl mb-1">👦👧</div>
              <div className="font-medium">子ども</div>
              <div className="text-xs">無料</div>
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
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
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
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
          <p className="mt-1 text-xs text-gray-500">8文字以上</p>
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
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

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? '登録中...' : '登録'}
        </button>
      </form>

      <div className="mt-6 text-center text-sm">
        <p className="text-gray-600">
          すでにアカウントをお持ちの方は{' '}
          <Link href="/auth/login" className="text-blue-600 hover:underline">
            ログイン
          </Link>
        </p>
      </div>
    </div>
  );
}
