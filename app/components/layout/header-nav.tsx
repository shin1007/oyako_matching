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
  const [totalNotifications, setTotalNotifications] = useState(0);
  const [loading, setLoading] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const router = useRouter();

  // user/displayNameが変化したらリフレッシュ（サインアウト直後のヘッダー反映対策）
  useEffect(() => {
    router.refresh();
  }, [user, displayName, router]);

  useEffect(() => {
    if (!user) return;
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/notifications/summary');
      if (response.ok) {
        const data = await response.json();
        setPendingCount(data.pending_matches_count || 0);
        setTotalNotifications(data.total_notifications || 0);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      setSigningOut(true);
      console.log('[HeaderNav] Attempting to sign out...');
      const response = await fetch('/api/auth/signout', { method: 'POST' });
      console.log('[HeaderNav] SignOut response:', response.status);
      
      if (response.ok) {
        console.log('[HeaderNav] SignOut successful, refreshing page and redirecting to home');
        // Refresh to clear server-side session data
        router.refresh();
        // Redirect to home
        router.push('/');
      } else {
        const data = await response.json();
        console.error('[HeaderNav] SignOut failed:', data.error);
        alert('ログアウトに失敗しました。もう一度お試しください。');
      }
    } catch (err) {
      console.error('[HeaderNav] Failed to sign out:', err);
      alert('ログアウトに失敗しました。もう一度お試しください。');
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <nav className="flex items-center gap-3 text-sm text-slate-700">
      {user ? (
        <>
          <Link
            href="/dashboard"
            className="font-medium text-slate-800 hover:text-slate-600 hover:underline"
          >
            {displayName}
          </Link>
          
          {/* Notifications - Messages Link with Badge */}
          <Link
            href="/messages"
            className="relative rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-800 hover:bg-slate-100"
          >
            💬 メッセージ
            {totalNotifications > 0 && (
              <span className="absolute -top-2 -right-2 inline-flex items-center justify-center w-6 h-6 text-xs font-bold text-white bg-red-500 rounded-full">
                {totalNotifications > 9 ? '9+' : totalNotifications}
              </span>
            )}
          </Link>

          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-800 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {signingOut ? 'ログアウト中...' : 'ログアウト'}
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
