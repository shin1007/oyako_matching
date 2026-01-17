'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

interface Post {
  id: string;
  title: string;
  content: string;
  author_profile: {
    last_name_kanji: string;
    first_name_kanji: string;
    profile_image_url?: string;
  };
  category: {
    id: string;
    name: string;
    icon: string;
  } | null;
  view_count: number;
  created_at: string;
  is_pinned: boolean;
  author_id: string;
}

interface Comment {
  id: string;
  content: string;
  author_profile: {
    last_name_kanji: string;
    first_name_kanji: string;
  };
  created_at: string;
  author_id: string;
}

export default function PostDetailPage() {
  const params = useParams();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isParent, setIsParent] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    checkAuth();
    if (params.id) {
      loadPost();
    }
  }, [params.id]);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/auth/login');
      return;
    }

    setCurrentUserId(user.id);

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    setIsParent(userData?.role === 'parent');
  };

  const loadPost = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/forum/posts/${params.id}`);
      if (!response.ok) throw new Error('Failed to load post');
      
      const data = await response.json();
      setPost(data.post);
      setComments(data.comments || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/forum/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          post_id: params.id,
          content: newComment,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'コメントの投稿に失敗しました');
      }

      const data = await response.json();
      setComments([...comments, data.comment]);
      setNewComment('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-600">読み込み中...</p>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="mb-4 text-gray-600">投稿が見つかりません</p>
          <Link href="/forum" className="text-blue-600 hover:underline">
            掲示板に戻る
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="container mx-auto max-w-4xl px-4 py-8">
        {/* Post */}
        <div className="mb-8 rounded-lg bg-white p-8 shadow">
          <div className="mb-4 flex items-center gap-2">
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

          <h1 className="mb-4 text-3xl font-bold text-gray-900">{post.title}</h1>

          <div className="mb-6 flex items-center gap-4 text-sm text-gray-500">
            <span>👤 {post.author_profile.last_name_kanji}{post.author_profile.first_name_kanji}</span>
            <span>👁️ {post.view_count}回閲覧</span>
            <span>🕒 {formatDate(post.created_at)}</span>
          </div>

          <div className="prose max-w-none whitespace-pre-wrap text-gray-700">
            {post.content}
          </div>
        </div>

        {/* Comments Section */}
        <div className="rounded-lg bg-white p-8 shadow">
          <h2 className="mb-6 text-2xl font-bold text-gray-900">
            コメント ({comments.length})
          </h2>

          {error && (
            <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Comment Form */}
          {isParent ? (
            <form onSubmit={handleSubmitComment} className="mb-8">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="コメントを入力..."
                rows={4}
                className="mb-4 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
              />
              <button
                type="submit"
                disabled={submitting || !newComment.trim()}
                className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? 'コメント中...' : 'コメントする'}
              </button>
            </form>
          ) : (
            <div className="mb-8 rounded-lg bg-yellow-50 border border-yellow-200 p-4">
              <p className="text-sm text-yellow-800">
                コメントの投稿は親アカウントのみが可能です
              </p>
            </div>
          )}

          {/* Comments List */}
          {comments.length === 0 ? (
            <p className="text-center text-gray-500">まだコメントがありません</p>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => (
                <div key={comment.id} className="border-l-4 border-blue-200 bg-gray-50 p-4">
                  <div className="mb-2 flex items-center gap-4 text-sm text-gray-500">
                    <span className="font-semibold text-gray-700">
                      {comment.author_profile.last_name_kanji}{comment.author_profile.first_name_kanji}
                    </span>
                    <span>🕒 {formatDate(comment.created_at)}</span>
                  </div>
                  <p className="whitespace-pre-wrap text-gray-700">{comment.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
