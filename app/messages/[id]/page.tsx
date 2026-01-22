'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { linkifyText } from '@/lib/utils/linkify';

interface Message {
  id: string;
  match_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
}

interface Match {
  id: string;
  parent_id: string;
  child_id: string;
  status: string;
  other_user_name: string;
  other_user_role: string;
  other_user_image?: string | null;
  target_people?: Array<{
    id: string;
    last_name_kanji?: string;
    first_name_kanji?: string;
    photo_url?: string | null;
  }>;
}

interface PaginationInfo {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export default function MessageDetailPage() {
  const params = useParams();
  const matchId = params?.id as string;
  const router = useRouter();
  const supabase = createClient();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [match, setMatch] = useState<Match | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (currentUserId) {
      loadMatchAndMessages();
      // リアルタイムで新しいメッセージを購読
      const channel = supabase
        .channel(`messages:${matchId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `match_id=eq.${matchId}`,
          },
          (payload) => {
            setMessages((prev) => [...prev, payload.new as Message]);
            scrollToBottom();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [currentUserId, matchId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // メッセージを日付順にソートするヘルパー関数
  const sortMessagesByDate = (messages: Message[]) => {
    return [...messages].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  };

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/auth/login');
      return;
    }
    setCurrentUserId(user.id);

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

  const loadMatchAndMessages = async () => {
    setLoading(true);
    setError('');

    try {
      // マッチ情報を取得（最新50件を降順で取得）
      const matchResponse = await fetch(`/api/messages/${matchId}?limit=50&sort=desc`, {
        method: 'GET',
      });

      if (!matchResponse.ok) {
        const data = await matchResponse.json();
        throw new Error(data.error || 'マッチ情報の取得に失敗しました');
      }

      const matchData = await matchResponse.json();
      setMatch(matchData.match);
      
      // 降順で取得したメッセージを昇順に並び替えて表示
      const sortedMessages = sortMessagesByDate(matchData.messages || []);
      setMessages(sortedMessages);
      setPagination(matchData.pagination);

      // 未読メッセージを既読にする
      await markMessagesAsRead();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'マッチ情報の取得に失敗しました';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const markMessagesAsRead = async () => {
    try {
      await fetch(`/api/messages/${matchId}/read`, {
        method: 'POST',
      });
    } catch (err) {
      console.error('Failed to mark messages as read:', err);
    }
  };

  const loadMoreMessages = async () => {
    if (!pagination || !pagination.hasMore || loadingMore) return;

    setLoadingMore(true);

    try {
      const newOffset = pagination.offset + pagination.limit;
      const response = await fetch(
        `/api/messages/${matchId}?limit=${pagination.limit}&offset=${newOffset}&sort=desc`,
        {
          method: 'GET',
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '古いメッセージの取得に失敗しました');
      }

      const data = await response.json();
      
      // 降順で取得したメッセージを昇順に並び替えて既存のメッセージの前に追加
      const sortedOlderMessages = sortMessagesByDate(data.messages || []);
      
      setMessages((prev) => [...sortedOlderMessages, ...prev]);
      setPagination(data.pagination);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '古いメッセージの取得に失敗しました';
      console.error('Failed to load more messages:', err);
      alert(errorMessage);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || sending) return;

    setSending(true);

    try {
      const response = await fetch(`/api/messages/${matchId}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: newMessage.trim(),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'メッセージの送信に失敗しました');
      }

      const data = await response.json();
      setMessages((prev) => [...prev, data.message]);
      setNewMessage('');
      scrollToBottom();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'メッセージの送信に失敗しました';
      alert(errorMessage);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-4xl">💬</div>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <main className="container mx-auto px-4 py-8">
          <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-600">
            {error}
          </div>
          <Link
            href="/messages"
            className={`inline-block rounded-lg px-6 py-3 text-white ${userRole === 'child' ? 'bg-child-600 hover:bg-child-700' : 'bg-parent-600 hover:bg-parent-700'}`}
          >
            ← メッセージ一覧に戻る
          </Link>
        </main>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="min-h-screen bg-gray-50">
        <main className="container mx-auto px-4 py-8">
          <div className="mb-6 rounded-lg bg-yellow-50 p-4 text-yellow-600">
            マッチ情報が見つかりません
          </div>
          <Link
            href="/messages"
            className={`inline-block rounded-lg px-6 py-3 text-white ${userRole === 'child' ? 'bg-child-600 hover:bg-child-700' : 'bg-parent-600 hover:bg-parent-700'}`}
          >
            ← メッセージ一覧に戻る
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/messages"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4"
          >
            ← メッセージ一覧に戻る
          </Link>
          {/* 親ユーザー向け注意喚起ボックス */}
          {userRole === 'parent' && (
            <div className="mb-4 rounded-lg border-l-8 border-red-500 bg-red-50 p-4 shadow flex gap-3">
              <div className="text-3xl">⚠️</div>
              <div>
                <div className="font-bold text-red-700 mb-1">【ご利用にあたっての重要なお願い】</div>
                <div className="text-sm text-red-800 mb-2">
                  お子様との再会を望むお気持ちは大切ですが、以下の行為は刑法（未成年者略取・誘拐罪）やストーカー規制法、住居侵入罪などの法令に抵触し、警察の捜査対象となる可能性があります。
                </div>
                <ul className="list-disc ml-5 text-sm text-red-800 mb-2">
                  <li>相手の同意なく、現在の居住地や学校、職場へ押し掛けること</li>
                  <li>相手の意思に反して、無理やり連れ出そうとすること</li>
                  <li>拒絶されているにもかかわらず、執拗にメッセージを送り続けること</li>
                </ul>
                <div className="text-xs text-gray-700 mb-2">お互いの安全と法的保護のため、節度ある交流をお願いいたします。</div>
                <div className="text-xs text-gray-700">
                  <span className="font-bold">未成年者略取・誘拐罪（刑法224条）</span><br />
                  たとえ親であっても、監護権（育てている側の権利）を持つ親の同意なく子供を連れ去ると犯罪になります。連れ去られた子供を引き戻すとしても同様です。<br />
                  <span className="font-bold">ストーカー行為等の規制等に関する法律</span><br />
                  2021年の改正以降、GPSによる位置情報の取得や、拒否されている中での連続したメッセージ送信も規制対象に含まれます。<br />
                  <span className="font-bold">住居侵入罪（刑法130条）</span><br />
                  敷地内に無断で入る行為です。<br />
                  <span className="font-bold">民法（不法行為）</span><br />
                  精神的苦痛を与えたとして、慰謝料請求の対象になります。
                </div>
              </div>
            </div>
          )}
          <div className="rounded-lg bg-white p-4 shadow">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex gap-2">
                {match.other_user_image ? (
                  <img
                    src={match.other_user_image}
                    alt={match.other_user_name}
                    className="h-12 w-12 rounded-full object-cover border border-gray-200"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-2xl">
                    {match.other_user_role === 'parent' ? '👨‍👩‍👧‍👦' : '👦'}
                  </div>
                )}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {match.other_user_name}
                </h1>
                <p className="text-sm text-gray-600">
                  {match.other_user_role === 'parent' ? '親' : '子'}
                </p>
              </div>
            </div>

            {/* 探している子どもの情報 */}
            {match.target_people && match.target_people.length > 0 && (
              <div className="border-t pt-4">
                <p className="text-xs font-semibold text-gray-700 mb-2">この方が探している{match.other_user_role === 'parent' ? '子ども' : '親'}:</p>
                <div className="flex flex-wrap gap-2">
                  {match.target_people.map((child) => (
                    <div key={child.id} className="flex items-center gap-2 bg-blue-50 rounded p-2">
                      {child.photo_url && (
                        <img
                          src={child.photo_url}
                          alt={`${child.last_name_kanji || ''}${child.first_name_kanji || ''}`}
                          className="h-10 w-10 rounded object-cover border border-gray-200"
                        />
                      )}
                      <p className="text-sm font-semibold text-gray-900">
                        {child.last_name_kanji || ''}{child.first_name_kanji || ''}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Messages Container */}
        <div className="bg-white rounded-lg shadow mb-4" style={{ height: 'calc(100vh - 340px)', minHeight: '400px' }}>
          <div className="h-full flex flex-col">
            {/* Messages List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {pagination && pagination.hasMore && (
                <div className="flex justify-center mb-4">
                  <button
                    onClick={loadMoreMessages}
                    disabled={loadingMore}
                    className={`rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed ${
                      userRole === 'child' 
                        ? 'bg-child-600 hover:bg-child-700' 
                        : 'bg-parent-600 hover:bg-parent-700'
                    }`}
                  >
                    {loadingMore ? '読み込み中...' : '古いメッセージを読み込む'}
                  </button>
                </div>
              )}
              {messages.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <div className="text-4xl mb-2">💬</div>
                  <p>まだメッセージがありません</p>
                  <p className="text-sm mt-1">最初のメッセージを送ってみましょう</p>
                </div>
              ) : (
                messages.map((message) => {
                  const isOwnMessage = message.sender_id === currentUserId;
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg px-4 py-2 ${
                            isOwnMessage
                              ? userRole === 'child' 
                                ? 'bg-child-600 text-white'
                                : 'bg-parent-500 text-white'
                              : 'bg-gray-200 text-gray-900'
                          }`}
                      >
                        <p className="whitespace-pre-wrap break-words">
                          {linkifyText(message.content)}
                        </p>
                        <div className={`flex items-center justify-between gap-2 mt-1`}>
                          <p
                            className={`text-xs ${
                              isOwnMessage 
                                ? userRole === 'child'
                                  ? 'text-child-100'
                                  : 'text-parent-100'
                                : 'text-gray-500'
                            }`}
                          >
                            {new Date(message.created_at).toLocaleString('ja-JP', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                          {isOwnMessage && (
                            <span
                              className={`text-xs ${
                                message.read_at 
                                  ? userRole === 'child'
                                    ? 'text-child-200'
                                    : 'text-parent-200'
                                  : userRole === 'child'
                                    ? 'text-child-300'
                                    : 'text-parent-300'
                              }`}
                            >
                              {message.read_at ? '既読' : '未読'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="border-t border-gray-200 p-4">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="メッセージを入力..."
                  className={`flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:outline-none resize-none ${userRole === 'child' ? 'focus:border-child-500' : 'focus:border-parent-500'}`}
                  rows={2}
                  disabled={sending}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(e);
                    }
                  }}
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || sending}
                  className={`rounded-lg px-6 py-2 text-white disabled:opacity-50 disabled:cursor-not-allowed ${userRole === 'child' ? 'bg-child-600 hover:bg-child-700' : 'bg-parent-600 hover:bg-parent-700'}`}
                >
                  {sending ? '送信中...' : '送信'}
                </button>
              </form>
              <p className="text-xs text-gray-500 mt-2">
                Shift + Enter で改行、Enter で送信
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
