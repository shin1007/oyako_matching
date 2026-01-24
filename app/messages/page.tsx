'use client';

import { useState, useEffect } from 'react';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { useErrorNotification } from '@/lib/utils/useErrorNotification';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { TargetPeopleList } from '@/components/ui/TargetPeopleList';

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
  other_user_image?: string | null;
  target_person_photos?: string[];
  is_requester: boolean; // 現在のユーザーがリクエスター（申請者）か
  unread_count?: number; // 未読メッセージ数
  last_message?: {
    content: string;
    created_at: string;
    is_own: boolean;
  } | null;
}

export default function MessagesPage() {
  const [matches, setMatches] = useState<MatchWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const notifyError = useErrorNotification(setError, { log: true });
  const [testModeBypassVerification, setTestModeBypassVerification] = useState(false);
  const [testModeBypassSubscription, setTestModeBypassSubscription] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    checkAuth();
    checkTestMode();
    loadMatches();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/auth/login');
      return;
    }

    // Get user role
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userData) {
      setUserRole(userData.role);
    }
  };

  const checkTestMode = async () => {
    try {
      const response = await fetch('/api/test-mode/status');
      if (response.ok) {
        const data = await response.json();
        console.log('[MessagesPage] Test mode status:', data);
        setTestModeBypassVerification(data.bypassVerification);
        setTestModeBypassSubscription(data.bypassSubscription);
      }
    } catch (err) {
      notifyError(err);
    }
  };

  const loadMatches = async () => {
    setLoading(true);
    setError('');

    try {
      // APIを通じてマッチ情報を取得（管理者権限で他ユーザー情報も取得）
      const response = await fetch('/api/messages/matches', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'マッチングの読み込みに失敗しました');
      }

      const data = await response.json();
      console.log('[MessagesPage] Loaded matches:', data.matches);
      if (data.matches && data.matches.length > 0) {
        console.log('[MessagesPage] First match details:', {
          other_user_image: data.matches[0].other_user_image,
          target_person_photos: data.matches[0].target_person_photos,
          other_user_name: data.matches[0].other_user_name
        });
      }
      setMatches(data.matches);
    } catch (err: any) {
      notifyError(err);
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
      notifyError(err);
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
      notifyError(err);
    }
  };

  // getStatusBadgeはStatusBadgeコンポーネントで代替

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="container mx-auto px-4 py-8">
        {testModeBypassVerification && (
          <div className="mb-6 rounded-lg border-2 border-blue-400 bg-blue-50 p-4 text-blue-700">
            <div className="flex items-center gap-2">
              <span className="text-xl">✅</span>
              <span className="font-semibold">テストモード: マイナンバー認証がスキップされています</span>
            </div>
          </div>
        )}

        {testModeBypassSubscription && (
          <div className="mb-6 rounded-lg border-2 border-purple-400 bg-purple-50 p-4 text-purple-700">
            <div className="flex items-center gap-2">
              <span className="text-xl">✅</span>
              <span className="font-semibold">テストモード: サブスクリプションがスキップされています</span>
            </div>
          </div>
        )}

        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">メッセージ</h1>
              <p className="mt-2 text-gray-900">
                マッチング相手とのメッセージ履歴
              </p>
            </div>
            <Link
              href="/matching"
              className="inline-block rounded-lg px-4 py-2 text-white bg-role-primary bg-role-primary-hover ml-4"
            >
              マッチング一覧に戻る
            </Link>
          </div>
        </div>

        <ErrorAlert message={error} onClose={() => setError('')} />

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="mb-4 text-4xl">💬</div>
              <p className="text-gray-900">読み込み中...</p>
            </div>
          </div>
        ) : matches.length === 0 ? (
          <div className="rounded-lg bg-white p-12 text-center shadow">
            <div className="mb-4 text-6xl">📭</div>
            <h2 className="mb-2 text-xl font-semibold text-gray-900">
              まだマッチングがありません
            </h2>
            <p className="mb-6 text-gray-900">
              マッチングを探して、再会への第一歩を踏み出しましょう
            </p>
            <Link
              href="/matching"
              className="inline-block rounded-lg px-6 py-3 text-white bg-role-primary bg-role-primary-hover"
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
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    {match.other_user_image ? (
                      <img
                        src={match.other_user_image}
                        alt={match.other_user_name}
                        className="h-12 w-12 rounded-full object-cover border border-gray-200 flex-shrink-0"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-2xl flex-shrink-0">
                        {match.other_user_role === 'parent' ? '👨‍👩‍👧‍👦' : '👦'}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">
                          {match.other_user_name}
                        </h3>
                        {match.unread_count && match.unread_count > 0 && (
                          <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-bold text-white bg-red-500 rounded-full flex-shrink-0">
                            {match.unread_count > 9 ? '9+' : match.unread_count}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        類似度: {(match.similarity_score * 100).toFixed(0)}%
                      </p>
                      {match.last_message ? (
                        <p className="text-sm text-gray-900 mt-1 line-clamp-1">
                          {match.last_message.is_own && '自分: '}
                          {match.last_message.content}
                        </p>
                      ) : (
                        <p className="text-xs text-gray-400 mt-1">
                          メッセージなし
                        </p>
                      )}
                      <p className="text-xs text-gray-400">
                        {match.last_message
                          ? new Date(match.last_message.created_at).toLocaleString('ja-JP', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : new Date(match.created_at).toLocaleDateString('ja-JP')}
                      </p>
                      {/* ターゲット情報表示を追加 */}
                      {Array.isArray(match.target_people) && match.target_people.length > 0 && (
                        <TargetPeopleList targetPeople={match.target_people} role={match.other_user_role} />
                      )}
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold bg-role-bg text-role-primary">
                      登録済み{match.other_user_role === 'parent' ? '親' : '子'}ユーザー
                    </span>
                    <StatusBadge status={match.status} />
                  </div>
                </div>

                {match.status === 'pending' && !match.is_requester && (
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => handleAccept(match.id)}
                      className="flex-1 rounded-lg px-4 py-2 text-white bg-role-primary bg-role-primary-hover"
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

                {match.status === 'pending' && match.is_requester && (
                  <div className="mt-4">
                    <div className="rounded-lg bg-yellow-50 px-4 py-2 text-center text-sm text-yellow-800">
                      相手の返信を待っています...
                    </div>
                  </div>
                )}

                {(match.status === 'accepted' || match.status === 'blocked') && (
                  <div className="mt-4">
                    <Link
                      href={`/messages/${match.id}`}
                      className="block w-full rounded-lg px-4 py-2 text-center text-white bg-role-primary bg-role-primary-hover"
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
