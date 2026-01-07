'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    checkAuth();
    loadCategories();
  }, []);

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

    if (userData?.role !== 'parent') {
      router.push('/forum');
    }
  };

  const loadCategories = async () => {
    try {
      const response = await fetch('/api/forum/categories');
      if (!response.ok) throw new Error('Failed to load categories');
      const data = await response.json();
      setCategories(data.categories || []);
    } catch (err: any) {
      console.error('Error loading categories:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/forum/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          content,
          category_id: categoryId || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '投稿に失敗しました');
      }

      const data = await response.json();
      router.push(`/forum/${data.post.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/dashboard" className="text-2xl font-bold text-blue-600">
            親子マッチング
          </Link>
          <Link
            href="/forum"
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            掲示板に戻る
          </Link>
        </div>
      </header>

      <main className="container mx-auto max-w-3xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">新規投稿</h1>
          <p className="mt-2 text-gray-600">
            親同士で情報交換や相談をするための投稿を作成
          </p>
        </div>

        <div className="rounded-lg bg-white p-8 shadow">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                カテゴリ（任意）
              </label>
              <select
                id="category"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
              <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                タイトル
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                maxLength={200}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="投稿のタイトルを入力"
              />
            </div>

            <div>
              <label htmlFor="content" className="block text-sm font-medium text-gray-700">
                内容
              </label>
              <textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
                rows={10}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                disabled={submitting}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-3 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? '投稿中...' : '投稿する'}
              </button>
              <Link
                href="/forum"
                className="flex-1 rounded-lg border border-gray-300 px-4 py-3 text-center text-gray-700 hover:bg-gray-50"
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
