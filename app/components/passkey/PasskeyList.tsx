'use client';

import { useState, useEffect } from 'react';

interface Passkey {
  id: string;
  device_name: string;
  created_at: string;
  last_used_at?: string;
  transports?: string[];
}

export default function PasskeyList() {
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadPasskeys = async () => {
    try {
      const response = await fetch('/api/auth/passkey/list');
      if (!response.ok) {
        throw new Error('パスキーの取得に失敗しました');
      }
      const data = await response.json();
      setPasskeys(data.passkeys);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'パスキーの取得に失敗しました'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPasskeys();
  }, []);

  const handleDelete = async (passkeyId: string) => {
    if (
      !confirm(
        'このパスキーを削除してもよろしいですか？\n削除後は、このデバイスでパスキーログインができなくなります。'
      )
    ) {
      return;
    }

    setDeleting(passkeyId);
    try {
      const response = await fetch(`/api/auth/passkey/${passkeyId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'パスキーの削除に失敗しました');
      }

      // Reload the list
      await loadPasskeys();
    } catch (err) {
      alert(
        err instanceof Error ? err.message : 'パスキーの削除に失敗しました'
      );
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTransportIcon = (transports?: string[]) => {
    if (!transports || transports.length === 0) return '🔑';
    if (transports.includes('internal')) return '📱';
    if (transports.includes('usb')) return '🔐';
    if (transports.includes('nfc')) return '📡';
    if (transports.includes('ble')) return '📶';
    return '🔑';
  };

  if (loading) {
    return (
      <div className="text-center text-gray-500">読み込み中...</div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">
        {error}
      </div>
    );
  }

  if (passkeys.length === 0) {
    return (
      <div className="rounded-lg bg-gray-50 p-6 text-center">
        <p className="text-gray-900">登録されているパスキーはありません</p>
        <p className="mt-2 text-sm text-gray-500">
          パスキーを登録すると、より安全で便利にログインできます
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {passkeys.map((passkey) => (
        <div
          key={passkey.id}
          className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4"
        >
          <div className="flex items-start space-x-3">
            <div className="text-2xl">{getTransportIcon(passkey.transports)}</div>
            <div>
              <p className="font-medium text-gray-900">{passkey.device_name}</p>
              <p className="text-sm text-gray-500">
                登録: {formatDate(passkey.created_at)}
              </p>
              {passkey.last_used_at && (
                <p className="text-sm text-gray-500">
                  最終使用: {formatDate(passkey.last_used_at)}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={() => handleDelete(passkey.id)}
            disabled={deleting === passkey.id}
            className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-100 disabled:opacity-50"
          >
            {deleting === passkey.id ? '削除中...' : '削除'}
          </button>
        </div>
      ))}
    </div>
  );
}
