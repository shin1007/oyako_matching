'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/api/request';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

interface Category {
  id: string;
  name: string;
  icon: string;
}

export default function NewPostPage() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [retryAfter, setRetryAfter] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState<string>('');
  const [userRole, setUserRole] = useState<'parent' | 'child' | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    checkAuth();
    loadCategories();
  }, []);

  useEffect(() => {
    if (!retryAfter) return;

    const updateCountdown = () => {
      const now = new Date();
      const diff = retryAfter.getTime() - now.getTime();
      
      if (diff <= 0) {
        setRetryAfter(null);
        setCountdown('');
        setError('');
        return;
      }

      const seconds = Math.ceil(diff / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      
      if (hours > 0) {
        const remainingMinutes = minutes % 60;
        setCountdown(`${hours}時間${remainingMinutes > 0 ? remainingMinutes + '分' : ''}後に投稿可能`);
      } else if (minutes > 0) {
        const remainingSeconds = seconds % 60;
        setCountdown(`${minutes}分${remainingSeconds > 0 ? remainingSeconds + '秒' : ''}後に投稿可能`);
      } else {
        setCountdown(`${seconds}秒後に投稿可能`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    
    return () => clearInterval(interval);
  }, [retryAfter]);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/auth/login');
      return;
    }

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    // 親または子のみが投稿を作成できる
    if (userData?.role !== 'parent' && userData?.role !== 'child') {
      router.push('/dashboard');
      return;
    }

    setUserRole(userData.role as 'parent' | 'child');
  };

  const loadCategories = async () => {
    try {
      const res = await apiRequest('/api/forum/categories');
      if (!res.ok) throw new Error(res.error || 'Failed to load categories');
      setCategories(res.data?.categories || []);
    } catch (err: any) {
      console.error('Error loading categories:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setRetryAfter(null);

    try {
      const res = await apiRequest('/api/forum/posts', {
        method: 'POST',
        body: {
          title,
          content,
          category_id: categoryId || null,
        },
      });
      if (!res.ok) {
        if (res.status === 429 && res.data?.retryAfter) {
          setRetryAfter(new Date(res.data.retryAfter));
        }
        throw new Error(res.error || '投稿に失敗しました');
      }
      // 投稿作成後は適切なフォーラムにリダイレクト
      const forumPath = userRole === 'parent' ? '/forum/parent' : '/forum/child';
      router.push(forumPath);
      router.refresh(); // キャッシュをリフレッシュ
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`min-h-screen ${userRole === 'parent' ? 'bg-parent-50' : 'bg-child-50'}`}>
      <main className="container mx-auto max-w-3xl px-4 py-8">
        <div className="mb-4">
          <Link
            href={userRole === 'parent' ? '/forum/parent' : '/forum/child'}
            className={`inline-flex items-center rounded-lg border px-3 py-2 text-sm ${
              userRole === 'parent' 
                ? 'border-parent-200 bg-parent-50 text-parent-700 hover:bg-parent-100'
                : 'border-child-200 bg-child-50 text-child-700 hover:bg-child-100'
            }`}
          >
            ← ピアサポート掲示板に戻る
          </Link>
        </div>
        <div className="mb-8">
          <h1 className={`text-3xl font-bold ${userRole === 'parent' ? 'text-parent-900' : 'text-child-900'}`}>
            新規投稿
          </h1>
          <p className={`mt-2 ${userRole === 'parent' ? 'text-parent-800' : 'text-child-800'}`}>
            {userRole === 'parent' ? '親同士' : '子ども同士'}で情報交換や相談をするための投稿を作成
          </p>
        </div>

        <div className="rounded-lg bg-white p-8 shadow">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-lg bg-red-50 p-4">
                <p className="text-sm text-red-600">{error}</p>
                {countdown && (
                  <p className="mt-2 text-sm font-semibold text-red-700">
                    ⏱️ {countdown}
                  </p>
                )}
              </div>
            )}

            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-900">
                カテゴリ（任意）
              </label>
              <select
                id="category"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className={`mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:outline-none focus:ring-1 ${
                  userRole === 'parent' 
                    ? 'focus:border-parent-500 focus:ring-parent-500'
                    : 'focus:border-child-500 focus:ring-child-500'
                }`}
              >
                <option value="">カテゴリを選択</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.icon} {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-900">
                タイトル
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                maxLength={200}
                className={`mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:outline-none focus:ring-1 text-gray-900 ${
                  userRole === 'parent' 
                    ? 'focus:border-parent-500 focus:ring-parent-500'
                    : 'focus:border-child-500 focus:ring-child-500'
                }`}
                placeholder="投稿のタイトルを入力"
              />
            </div>

            <div>
              <label htmlFor="content" className="block text-sm font-medium text-gray-900">
                内容
              </label>
              <textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
                rows={10}
                className={`mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:outline-none focus:ring-1 text-gray-900 ${
                  userRole === 'parent' 
                    ? 'focus:border-parent-500 focus:ring-parent-500'
                    : 'focus:border-child-500 focus:ring-child-500'
                }`}
                placeholder="投稿の内容を詳しく記入してください"
              />
              <p className="mt-1 text-xs text-gray-500">
                投稿内容は自動でモデレーションされます
              </p>
            </div>

            <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-800">
              <p className="font-semibold mb-2">⚠️ 注意事項</p>
              <ul className="list-disc list-inside space-y-1">
                <li>個人を特定できる情報（住所、電話番号など）は投稿しないでください</li>
                <li>他者を誹謗中傷する内容は禁止されています</li>
                <li>不適切な内容は自動的に削除される場合があります</li>
              </ul>
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={submitting || !!retryAfter}
                className={`flex-1 rounded-lg px-4 py-3 text-white disabled:opacity-50 disabled:cursor-not-allowed ${
                  userRole === 'parent' 
                    ? 'bg-parent-600 hover:bg-parent-700'
                    : 'bg-child-600 hover:bg-child-700'
                }`}
              >
                {submitting ? '投稿中...' : retryAfter ? countdown : '投稿する'}
              </button>
              <Link
                href={userRole === 'parent' ? '/forum/parent' : '/forum/child'}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-3 text-center text-gray-900 hover:bg-gray-50"
              >
                キャンセル
              </Link>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
