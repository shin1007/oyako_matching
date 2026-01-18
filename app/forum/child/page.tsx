'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

interface Category {
  id: string;
  name: string;
  description: string;
  icon: string;
  order_index: number;
}

interface Post {
  id: string;
  title: string;
  content: string;
  author_profile: {
    last_name_kanji: string;
    first_name_kanji: string;
  };
  category: {
    id: string;
    name: string;
    icon: string;
  } | null;
  view_count: number;
  comment_count: Array<any>;
  created_at: string;
  is_pinned: boolean;
}

export default function ChildForumPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isChild, setIsChild] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    checkAuth();
    loadCategories();
    loadPosts();
  }, [selectedCategory]);

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

    if (userData?.role !== 'child') {
      // 子アカウントでない場合はダッシュボードにリダイレクト
      router.push('/dashboard');
      return;
    }

    setIsChild(userData?.role === 'child');
  };

  const loadCategories = async () => {
    try {
      const response = await fetch('/api/forum/categories?userType=child');
      if (!response.ok) throw new Error('Failed to load categories');
      const data = await response.json();
      setCategories(data.categories || []);
    } catch (err: any) {
      console.error('Error loading categories:', err);
    }
  };

  const loadPosts = async () => {
    setLoading(true);
    setError('');

    try {
      const url = selectedCategory
        ? `/api/forum/posts?userType=child&category_id=${selectedCategory}`
        : '/api/forum/posts?userType=child';
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to load posts');
      
      const data = await response.json();
      setPosts(data.posts || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 1) return '1時間以内';
    if (hours < 24) return `${hours}時間前`;
    if (hours < 48) return '1日前';
    
    return date.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-orange-50">
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-orange-900">ピアサポート掲示板</h1>
            <p className="mt-2 text-orange-800">
              子ども同士で情報交換や相談ができるコミュニティ
            </p>
          </div>
          {isChild && (
            <Link
              href="/forum/new?userType=child"
              className="rounded-lg bg-orange-600 px-4 py-2 text-white hover:bg-orange-700"
            >
              新規投稿
            </Link>
          )}
        </div>

        {!isChild && (
          <div className="mb-6 rounded-lg bg-yellow-50 border border-yellow-200 p-4">
            <p className="text-sm text-yellow-800">
              掲示板の投稿は子アカウントのみが可能です。閲覧は誰でもできます。
            </p>
          </div>
        )}

        {/* Categories */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`rounded-full px-4 py-2 text-sm transition ${
                selectedCategory === null
                  ? 'bg-orange-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              すべて
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`rounded-full px-4 py-2 text-sm transition ${
                  selectedCategory === category.id
                    ? 'bg-orange-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                {category.icon} {category.name}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-600">
            {error}
          </div>
        )}

        {/* Posts */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-gray-600">読み込み中...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="rounded-lg bg-white p-12 text-center shadow">
            <div className="mb-4 text-6xl">📝</div>
            <h2 className="mb-2 text-xl font-semibold text-gray-900">
              まだ投稿がありません
            </h2>
            <p className="text-gray-600">
              最初の投稿者になりませんか？
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/forum/${post.id}?userType=child`}
                className="block rounded-lg bg-white p-6 shadow hover:shadow-lg transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="mb-2 flex items-center gap-2">
                      {post.is_pinned && (
                        <span className="rounded bg-yellow-100 px-2 py-1 text-xs font-semibold text-yellow-800">
                          📌 ピン留め
                        </span>
                      )}
                      {post.category && (
                        <span className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-700">
                          {post.category.icon} {post.category.name}
                        </span>
                      )}
                    </div>
                    <h3 className="mb-2 text-lg font-semibold text-gray-900">
                      {post.title}
                    </h3>
                    <p className="mb-4 text-sm text-gray-600 line-clamp-2">
                      {post.content}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>👤 {post.author_profile.forum_display_name}</span>
                      <span>💬 {post.comment_count.length || 0}件のコメント</span>
                      <span>👁️ {post.view_count}回閲覧</span>
                      <span>🕒 {formatDate(post.created_at)}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
