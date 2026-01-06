'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

export default function ProfilePage() {
  const [fullName, setFullName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    checkAuth();
    loadProfile();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/auth/login');
    }
  };

  const loadProfile = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (data) {
        setFullName(data.full_name || '');
        setBirthDate(data.birth_date || '');
        setBio(data.bio || '');
      }
    } catch (err: any) {
      // Profile might not exist yet
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('ログインが必要です');

      const { error } = await supabase.from('profiles').upsert({
        user_id: user.id,
        full_name: fullName,
        birth_date: birthDate,
        bio: bio,
      });

      if (error) throw error;

      setSuccess('プロフィールを保存しました');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'プロフィールの保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/dashboard" className="text-2xl font-bold text-blue-600">
            親子マッチング
          </Link>
          <Link href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900">
            ダッシュボードに戻る
          </Link>
        </div>
      </header>

      <main className="container mx-auto max-w-2xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">プロフィール</h1>
          <p className="mt-2 text-gray-600">あなたの基本情報を管理</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-gray-600">読み込み中...</p>
          </div>
        ) : (
          <div className="rounded-lg bg-white p-8 shadow">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">
                  {error}
                </div>
              )}

              {success && (
                <div className="rounded-lg bg-green-50 p-4 text-sm text-green-600">
                  {success}
                </div>
              )}

              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
                  氏名
                </label>
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="birthDate" className="block text-sm font-medium text-gray-700">
                  生年月日
                </label>
                <input
                  id="birthDate"
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  required
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="bio" className="block text-sm font-medium text-gray-700">
                  自己紹介
                </label>
                <textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={4}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="簡単な自己紹介を記入してください"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-lg bg-blue-600 px-4 py-3 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? '保存中...' : 'プロフィールを保存'}
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
