'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface HeaderNavProps {
  user: any;
  displayName: string | null;
}

export function HeaderNav({ user, displayName }: HeaderNavProps) {
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!user) return;

    // 初回読み込み
    fetchPendingCount();

    // 30秒ごとにポーリング
    const interval = setInterval(fetchPendingCount, 30000);

    return () => clearInterval(interval);
  }, [user]);

  const fetchPendingCount = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/notifications/pending-matches');
      if (response.ok) {
        const data = await response.json();
        setPendingCount(data.pending_count || 0);
      }
    } catch (err) {
      console.error('Failed to fetch pending count:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      const response = await fetch('/api/auth/signout', { method: 'POST' });
      if (response.ok) {
        router.push('/');
      }
    } catch (err) {
      console.error('Failed to sign out:', err);
    }
  };

  return (
    <nav className="flex items-center gap-3 text-sm text-slate-700">
      {user ? (
        <>
          <span className="font-medium">{displayName}</span>
          
          {/* Notifications - Messages Link with Badge */}
          <Link
            href="/messages"
            className="relative rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-800 hover:bg-slate-100"
          >
            💬 メッセージ
            {pendingCount > 0 && (
              <span className="absolute -top-2 -right-2 inline-flex items-center justify-center w-6 h-6 text-xs font-bold text-white bg-red-500 rounded-full">
                {pendingCount > 9 ? '9+' : pendingCount}
              </span>
            )}
          </Link>

          <button
            onClick={handleSignOut}
            className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-800 hover:bg-slate-100"
          >
            ログアウト
          </button>
        </>
      ) : (
        <Link
          href="/auth/login"
          className="rounded-lg border border-blue-600 px-4 py-2 font-semibold text-blue-700 hover:bg-blue-50"
        >
          ログイン
        </Link>
      )}
    </nav>
  );
}
