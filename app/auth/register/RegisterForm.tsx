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
        // Handle already registered users: Supabase may resend confirmation emails
        if (signUpError.message?.includes('User already registered')) {
          console.log('[Register] User already registered, likely resent verification email');
          // Treat as verification flow: guide user to verification pending
          setError('このメールアドレスは既に登録されています。確認メールを再送しました。メールをご確認ください。');
          setTimeout(() => {
            router.push(`/auth/verify-email-pending?email=${encodeURIComponent(email)}`);
          }, 1500);
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
        const { error: insertError } = await supabase.from('users').insert({
          id: data.user.id,
          email,
          role,
          verification_status: 'pending',
          mynumber_verified: false,
        });

        if (insertError) {
          console.error('[Register] Error inserting user to database:', insertError);
          console.error('[Register] Insert error details:', JSON.stringify(insertError, null, 2));
          
          // If it's a unique constraint error, user already exists in database
          // This means they went through signup before - redirect to login
          if (insertError.code === '23505' || insertError.message?.includes('duplicate')) {
            console.log('[Register] Duplicate email in public.users detected');
            // UX: continue with email verification pending to avoid confusion
            setError('確認メールを送信しました。メールをご確認ください。');
            setTimeout(() => {
              router.push(`/auth/verify-email-pending?email=${encodeURIComponent(email)}`);
            }, 1500);
            return;
          }
          
          // For any other database error, since auth.users was created, 
          // continue with email verification
          console.warn('[Register] Database insert failed but auth user exists, continuing with verification');
          setError('登録処理を続行しています。確認メールをご確認ください。');
          setTimeout(() => {
            router.push(`/auth/verify-email-pending?email=${encodeURIComponent(email)}`);
          }, 1500);
          return;
        }

        // Create profile record
        const { error: profileError } = await supabase.from('profiles').insert({
          user_id: data.user.id,
          last_name_kanji: '',
          first_name_kanji: '',
          birth_date: new Date().toISOString().split('T')[0],
          bio: '',
          gender: null,
        });

        if (profileError) {
          console.error('[Register] Error creating profile:', profileError);
          // Continue anyway - profile can be created later
        }
        
        // Redirect to email verification pending page with email parameter
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
          <p className="mt-1 text-xs text-gray-500">8文字以上で、大文字・小文字・数字をすべて含めてください</p>
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
