'use client';

import { useState, useEffect } from 'react';
import { useAutoSignOut } from '@/app/components/matching/hooks/useAutoSignOut';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { apiRequest } from '@/lib/api/request';
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
    forum_display_name?: string;
    profile_image_url?: string | null;
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

export default function ForumPage() {
    useAutoSignOut(15); // 15分無操作で自動サインアウト
  const [categories, setCategories] = useState<Category[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isParent, setIsParent] = useState(false);
  const router = useRouter();
  // supabaseはシングルトンとしてimport

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

    setIsParent(userData?.role === 'parent');
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

  const loadPosts = async () => {
    setLoading(true);
    setError('');

    try {
      let url = '';
      if (selectedCategory) {
        url = `/api/forum/posts?category_id=${selectedCategory}&userType=${isParent ? 'parent' : 'child'}`;
      } else {
        url = `/api/forum/posts?userType=${isParent ? 'parent' : 'child'}`;
      }
      const res = await apiRequest(url);
      if (!res.ok) throw new Error(res.error || 'Failed to load posts');
      setPosts(res.data?.posts || []);
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
    <div className="min-h-screen bg-gray-50">
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">ピアサポート掲示板</h1>
            <p className="mt-2 text-gray-900">
              親同士で情報交換や相談ができるコミュニティ
            </p>
          </div>
          {isParent && (
            <Link
              href="/forum/new"
              className={`rounded-lg px-4 py-2 text-white ${isParent ? 'bg-parent-600 hover:bg-parent-700' : 'bg-child-600 hover:bg-child-700'}`}
            >
              新規投稿
            </Link>
          )}
        </div>


        {/* Categories */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`rounded-full px-4 py-2 text-sm transition ${
                selectedCategory === null
                  ? isParent 
                    ? 'bg-parent-600 text-white'
                    : 'bg-child-600 text-white'
                  : 'bg-white text-gray-900 hover:bg-gray-100'
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
                    ? isParent 
                      ? 'bg-parent-600 text-white'
                      : 'bg-child-600 text-white'
                    : 'bg-white text-gray-900 hover:bg-gray-100'
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
            <p className="text-gray-900">読み込み中...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="rounded-lg bg-white p-12 text-center shadow">
            <div className="mb-4 text-6xl">📝</div>
            <h2 className="mb-2 text-xl font-semibold text-gray-900">
              まだ投稿がありません
            </h2>
            <p className="text-gray-900">
              最初の投稿者になりませんか？
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/forum/${post.id}`}
                className="block rounded-lg bg-white p-6 shadow hover:shadow-lg transition"
              >
                <div className="flex items-start gap-4 justify-between">
                  {post.author_profile?.profile_image_url && (
                    <img
                      src={post.author_profile.profile_image_url}
                      alt={post.author_profile.forum_display_name}
                      className="h-12 w-12 rounded-full object-cover border border-gray-200 flex-shrink-0"
                    />
                  )}
                  <div className="flex-1">
                    <div className="mb-2 flex items-center gap-2">
                      {post.is_pinned && (
                        <span className="rounded bg-yellow-100 px-2 py-1 text-xs font-semibold text-yellow-800">
                          📌 ピン留め
                        </span>
                      )}
                      {post.category && (
                        <span className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-900">
                          {post.category.icon} {post.category.name}
                        </span>
                      )}
                    </div>
                    <h3 className="mb-2 text-lg font-semibold text-gray-900">
                      {post.title}
                    </h3>
                    <p className="mb-4 text-sm text-gray-900 line-clamp-2">
                      {post.content}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>👤 {post.author_profile.forum_display_name}</span>
                      <span>💬 {Array.isArray(post.comment_count) ? (post.comment_count[0]?.count ?? 0) : (typeof post.comment_count === 'number' ? post.comment_count : 0)}件のコメント</span>
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
