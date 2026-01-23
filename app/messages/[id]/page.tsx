'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { linkifyText } from '@/lib/utils/linkify';
import { MessageList } from '../components/MessageList';
import { MessageInputForm } from '../components/MessageInputForm';
import { ParentWarningBox } from '../components/ParentWarningBox';
import { UserHeader } from '../components/UserHeader';

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
          <p className="text-gray-900">読み込み中...</p>
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

  // ブロック状態の場合のUI（警告＋メッセージ一覧のみ表示、入力欄は非表示）
  if (match.status === 'blocked') {
    return (
      <div className="min-h-screen bg-gray-50">
        <main className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="mb-6">
            <Link
              href="/messages"
              className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4"
            >
              ← メッセージ一覧に戻る
            </Link>
            <UserHeader match={match} />
          </div>
          <div className="bg-red-100 border-l-8 border-red-500 rounded-lg p-6 text-red-700 shadow mb-4">
            <div className="text-2xl mb-2">🚫 このマッチはブロックされています</div>
            <div className="text-sm">このユーザーとのメッセージ送信はできません。必要に応じて設定画面からブロック解除してください。</div>
          </div>
          {/* メッセージ一覧のみ表示 */}
          <div className="bg-white rounded-lg shadow mb-4" style={{ minHeight: '300px' }}>
            <div className="h-full flex flex-col">
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <MessageList
                  messages={messages}
                  currentUserId={currentUserId}
                  userRole={userRole}
                  linkifyText={linkifyText}
                />
                <div ref={messagesEndRef} />
              </div>
            </div>
          </div>
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
          {userRole === 'parent' && <ParentWarningBox />}
          <UserHeader match={match} />
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
              <MessageList
                messages={messages}
                currentUserId={currentUserId}
                userRole={userRole}
                linkifyText={linkifyText}
              />
              <div ref={messagesEndRef} />
            </div>
            {/* Message Input */}
            <div className="border-t border-gray-200 p-4">
              <MessageInputForm
                newMessage={newMessage}
                setNewMessage={setNewMessage}
                sending={sending}
                onSend={handleSendMessage}
              />
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
