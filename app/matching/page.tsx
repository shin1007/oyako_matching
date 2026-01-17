'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import type { UserRole } from '@/types/database';

interface Match {
  userId: string;
  similarityScore: number;
  profile: {
    full_name: string;
    birth_date: string;
    bio?: string;
    profile_image_url?: string;
  };
}

export default function MatchingPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    checkAuth();
    loadMatches();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/auth/login');
    }
  };

  const loadMatches = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/matching/search');
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'マッチングの検索に失敗しました');
      }

      const data = await response.json();
      setMatches(data.matches || []);
      setUserRole(data.userRole);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMatch = async (targetUserId: string, similarityScore: number) => {
    setCreating(targetUserId);

    try {
      const response = await fetch('/api/matching/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetUserId,
          similarityScore,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'マッチングの作成に失敗しました');
      }

      // Success - redirect to messages
      router.push('/messages');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCreating(null);
    }
  };

  const getSimilarityColor = (score: number) => {
    if (score >= 0.9) return 'text-green-600';
    if (score >= 0.8) return 'text-blue-600';
    if (score >= 0.7) return 'text-yellow-600';
    return 'text-gray-600';
  };

  const getSimilarityLabel = (score: number) => {
    if (score >= 0.9) return '非常に高い';
    if (score >= 0.8) return '高い';
    if (score >= 0.7) return '中程度';
    return '低い';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/dashboard" className="text-2xl font-bold text-blue-600">
            親子マッチング
          </Link>
          <Link
            href="/dashboard"
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            ダッシュボードに戻る
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {userRole === 'child' ? '親を探す' : '子を探す'}
          </h1>
          <p className="mt-2 text-gray-600">
            {userRole === 'child' 
              ? 'エピソードの類似度に基づいて、あなたに合った親を表示しています'
              : 'エピソードの類似度に基づいて、あなたに合った子を表示しています'
            }
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-600">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="mb-4 text-4xl">🔍</div>
              <p className="text-gray-600">マッチングを検索中...</p>
            </div>
          </div>
        ) : matches.length === 0 ? (
          <div className="rounded-lg bg-white p-12 text-center shadow">
            <div className="mb-4 text-6xl">😔</div>
            <h2 className="mb-2 text-xl font-semibold text-gray-900">
              マッチングが見つかりませんでした
            </h2>
            <p className="mb-6 text-gray-600">
              エピソードを追加すると、マッチングの精度が向上します
            </p>
            <Link
              href="/dashboard/episodes"
              className="inline-block rounded-lg bg-blue-600 px-6 py-3 text-white hover:bg-blue-700"
            >
              エピソードを追加
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {matches.map((match) => (
              <div
                key={match.userId}
                className="rounded-lg bg-white p-6 shadow hover:shadow-lg transition"
              >
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-2xl">
                      👤
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {match.profile.full_name}
                      </h3>
                      <p className="text-xs text-gray-500">
                        {new Date(match.profile.birth_date).toLocaleDateString('ja-JP', {
                          year: 'numeric',
                          month: 'long',
                        })}
                      </p>
                    </div>
                  </div>
                </div>

                {match.profile.bio && (
                  <p className="mb-4 text-sm text-gray-600 line-clamp-3">
                    {match.profile.bio}
                  </p>
                )}

                <div className="mb-4 rounded-lg bg-gray-50 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">類似度</span>
                    <span className={`text-lg font-bold ${getSimilarityColor(match.similarityScore)}`}>
                      {(match.similarityScore * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="mt-1 h-2 w-full rounded-full bg-gray-200">
                    <div
                      className={`h-full rounded-full ${
                        match.similarityScore >= 0.9
                          ? 'bg-green-600'
                          : match.similarityScore >= 0.8
                          ? 'bg-blue-600'
                          : match.similarityScore >= 0.7
                          ? 'bg-yellow-600'
                          : 'bg-gray-600'
                      }`}
                      style={{ width: `${match.similarityScore * 100}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500 text-center">
                    {getSimilarityLabel(match.similarityScore)}
                  </p>
                </div>

                <button
                  onClick={() => handleCreateMatch(match.userId, match.similarityScore)}
                  disabled={creating === match.userId}
                  className="w-full rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {creating === match.userId ? 'マッチング中...' : 'マッチングを申請'}
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
