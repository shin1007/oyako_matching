'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface PendingNotificationProps {
  userRole?: string;
}

export function PendingNotification({ userRole }: PendingNotificationProps) {
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingCount();
  }, []);

  const fetchPendingCount = async () => {
    try {
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

  if (loading || pendingCount === 0) {
    return null;
  }

  const bgColor = userRole === 'child' ? 'bg-orange-100 border-orange-300' : 'bg-green-100 border-green-300';
  const textColor = userRole === 'child' ? 'text-orange-900' : 'text-green-900';
  const subTextColor = userRole === 'child' ? 'text-orange-800' : 'text-green-800';
  const buttonColor = userRole === 'child' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-green-600 hover:bg-green-700';

  return (
    <div className={`rounded-lg border-2 ${bgColor} p-4 mb-6`}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className={`font-semibold ${textColor}`}>
            🔔 新しいマッチング申請 {pendingCount} 件
          </h3>
          <p className={`mt-1 text-sm ${subTextColor}`}>
            あなたへのマッチング申請があります。確認して承認または拒否してください。
          </p>
        </div>
        <Link
          href="/messages"
          className={`${buttonColor} text-white px-4 py-2 rounded-lg font-semibold whitespace-nowrap ml-4`}
        >
          確認する
        </Link>
      </div>
    </div>
  );
}
