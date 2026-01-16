'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

interface Episode {
  id: string;
  title: string;
  content: string;
  moderation_status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export default function EpisodesPage() {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    checkAuth();
    loadEpisodes();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/auth/login');
    }
  };

  const loadEpisodes = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('episodes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEpisodes(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('ログインが必要です');

      // Moderate content first
      const moderationResponse = await fetch('/api/openai/moderate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: `${title} ${content}` }),
      });

      if (!moderationResponse.ok) {
        throw new Error('コンテンツのモデレーションに失敗しました');
      }

      const moderation = await moderationResponse.json();
      
      if (moderation.flagged) {
        throw new Error('不適切なコンテンツが検出されました。内容を修正してください。');
      }

      // Create embedding
      const embeddingResponse = await fetch('/api/openai/embed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: `${title} ${content}` }),
      });

      let embedding = null;
      if (embeddingResponse.ok) {
        const embeddingData = await embeddingResponse.json();
        embedding = embeddingData.embedding;
      }

      // Insert episode
      const { error } = await supabase.from('episodes').insert({
        user_id: user.id,
        title,
        content,
        embedding: embedding ? JSON.stringify(embedding) : null,
        moderation_status: 'approved',
      });

      if (error) throw error;

      setTitle('');
      setContent('');
      setShowForm(false);
      await loadEpisodes();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800">確認中</span>;
      case 'approved':
        return <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">承認済み</span>;
      case 'rejected':
        return <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-800">拒否</span>;
      default:
        return null;
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

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">エピソード</h1>
            <p className="mt-2 text-gray-600">思い出のエピソードを登録・管理</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            {showForm ? 'キャンセル' : '新規エピソード'}
          </button>
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-600">
            {error}
          </div>
        )}

        {showForm && (
          <div className="mb-8 rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-xl font-semibold">新しいエピソード</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
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
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                  placeholder="例: 公園での思い出"
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
                  rows={6}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                  placeholder="できるだけ詳しく、具体的なエピソードを記入してください。日時、場所、会話の内容など..."
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? '登録中...' : 'エピソードを登録'}
              </button>
            </form>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-gray-600">読み込み中...</p>
          </div>
        ) : episodes.length === 0 ? (
          <div className="rounded-lg bg-white p-12 text-center shadow">
            <div className="mb-4 text-6xl">📝</div>
            <h2 className="mb-2 text-xl font-semibold text-gray-900">
              エピソードがまだありません
            </h2>
            <p className="text-gray-600">
              思い出のエピソードを登録して、マッチングの精度を向上させましょう
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {episodes.map((episode) => (
              <div key={episode.id} className="rounded-lg bg-white p-6 shadow">
                <div className="mb-2 flex items-start justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">{episode.title}</h3>
                  {getStatusBadge(episode.moderation_status)}
                </div>
                <p className="mb-4 text-gray-600 whitespace-pre-wrap">{episode.content}</p>
                <p className="text-xs text-gray-400">
                  {new Date(episode.created_at).toLocaleString('ja-JP')}
                </p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
