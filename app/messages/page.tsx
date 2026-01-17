'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

interface Match {
  id: string;
  parent_id: string;
  child_id: string;
  status: string;
  similarity_score: number;
  created_at: string;
}

interface MatchWithProfile extends Match {
  other_user_name: string;
  other_user_role: string;
}

export default function MessagesPage() {
  const [matches, setMatches] = useState<MatchWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get matches where user is involved
      const { data: matchesData, error: matchesError } = await supabase
        .from('matches')
        .select('*')
        .or(`parent_id.eq.${user.id},child_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (matchesError) throw matchesError;

      // Get profiles for other users
      const matchesWithProfiles = await Promise.all(
        (matchesData || []).map(async (match) => {
          const otherUserId = match.parent_id === user.id ? match.child_id : match.parent_id;
          
          const { data: userData } = await supabase
            .from('users')
            .select('role')
            .eq('id', otherUserId)
            .single();

          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', otherUserId)
            .single();

          return {
            ...match,
            other_user_name: profile?.full_name || '名前なし',
            other_user_role: userData?.role || 'unknown',
          };
        })
      );

      setMatches(matchesWithProfiles);
    } catch (err: any) {
      setError(err.message || 'マッチングの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (matchId: string) => {
    try {
      const { error } = await supabase
        .from('matches')
        .update({ status: 'accepted' })
        .eq('id', matchId);

      if (error) throw error;

      await loadMatches();
    } catch (err: any) {
      alert(err.message || 'マッチングの承認に失敗しました');
    }
  };

  const handleReject = async (matchId: string) => {
    try {
      const { error } = await supabase
        .from('matches')
        .update({ status: 'rejected' })
        .eq('id', matchId);

      if (error) throw error;

      await loadMatches();
    } catch (err: any) {
      alert(err.message || 'マッチングの拒否に失敗しました');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-800">保留中</span>;
      case 'accepted':
        return <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800">承認済み</span>;
      case 'rejected':
        return <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-800">拒否済み</span>;
      case 'blocked':
        return <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-800">ブロック済み</span>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">メッセージ</h1>
          <p className="mt-2 text-gray-600">
            マッチング相手とのメッセージ履歴
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
              <div className="mb-4 text-4xl">💬</div>
              <p className="text-gray-600">読み込み中...</p>
            </div>
          </div>
        ) : matches.length === 0 ? (
          <div className="rounded-lg bg-white p-12 text-center shadow">
            <div className="mb-4 text-6xl">📭</div>
            <h2 className="mb-2 text-xl font-semibold text-gray-900">
              まだマッチングがありません
            </h2>
            <p className="mb-6 text-gray-600">
              マッチングを探して、再会への第一歩を踏み出しましょう
            </p>
            <Link
              href="/matching"
              className="inline-block rounded-lg bg-blue-600 px-6 py-3 text-white hover:bg-blue-700"
            >
              マッチングを探す
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {matches.map((match) => (
              <div
                key={match.id}
                className="rounded-lg bg-white p-6 shadow hover:shadow-lg transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-2xl">
                      {match.other_user_role === 'parent' ? '👨‍👩‍👧‍👦' : '👦'}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {match.other_user_name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        類似度: {(match.similarity_score * 100).toFixed(0)}%
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(match.created_at).toLocaleDateString('ja-JP')}
                      </p>
                    </div>
                  </div>
                  <div>
                    {getStatusBadge(match.status)}
                  </div>
                </div>

                {match.status === 'pending' && (
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => handleAccept(match.id)}
                      className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700"
                    >
                      承認
                    </button>
                    <button
                      onClick={() => handleReject(match.id)}
                      className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700"
                    >
                      拒否
                    </button>
                  </div>
                )}

                {match.status === 'accepted' && (
                  <div className="mt-4">
                    <Link
                      href={`/messages/${match.id}`}
                      className="block w-full rounded-lg bg-blue-600 px-4 py-2 text-center text-white hover:bg-blue-700"
                    >
                      メッセージを見る
                    </Link>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
