'use client';

import { useState, useEffect } from 'react';
import {
  isWebAuthnSupported,
  isPlatformAuthenticatorAvailable,
  registerPasskey,
  getWebAuthnErrorMessage,
} from '@/lib/webauthn/client';

interface PasskeyRegisterProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export default function PasskeyRegister({
  onSuccess,
  onError,
}: PasskeyRegisterProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [supported, setSupported] = useState<boolean | null>(null);

  // Check browser support on mount
  useEffect(() => {
    (async () => {
      const isSupported = isWebAuthnSupported();
      const hasPlatform = await isPlatformAuthenticatorAvailable();
      setSupported(isSupported && hasPlatform);
    })();
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Check support again
      if (!isWebAuthnSupported()) {
        throw new Error(
          'このブラウザはパスキーに対応していません。Chrome、Safari、またはFirefoxをお使いください。'
        );
      }

      // Get registration challenge from server
      const challengeResponse = await fetch(
        '/api/auth/passkey/register-challenge',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (!challengeResponse.ok) {
        const data = await challengeResponse.json();
        throw new Error(data.error || '登録の準備に失敗しました');
      }

      const { options } = await challengeResponse.json();

      // Start registration with WebAuthn
      const credential = await registerPasskey(options);

      // Verify registration with server
      const verifyResponse = await fetch(
        '/api/auth/passkey/register-verify',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            credential,
            deviceName: deviceName || 'パスキー',
          }),
        }
      );

      if (!verifyResponse.ok) {
        const data = await verifyResponse.json();
        throw new Error(data.error || 'パスキーの登録に失敗しました');
      }

      // Success!
      setDeviceName('');
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      const errorMessage = getWebAuthnErrorMessage(err);
      setError(errorMessage);
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  if (supported === null) {
    return (
      <div className="text-center text-gray-500">
        パスキー対応を確認中...
      </div>
    );
  }

  if (!supported) {
    return (
      <div className="rounded-lg bg-yellow-50 p-4 text-sm text-yellow-800">
        <p className="font-medium">パスキーが利用できません</p>
        <p className="mt-1">
          このブラウザまたはデバイスはパスキーに対応していません。Chrome、Safari、またはFirefoxの最新版をお使いください。
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-800">
        <p className="font-medium">🔐 パスキーとは？</p>
        <p className="mt-1">
          指紋、顔認証、またはデバイスのロック解除でログインできる安全で便利な認証方法です。パスワードを覚える必要がありません。
        </p>
      </div>

      <form onSubmit={handleRegister} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        )}

        <div>
          <label
            htmlFor="deviceName"
            className="block text-sm font-medium text-gray-900"
          >
            デバイス名（任意）
          </label>
          <input
            id="deviceName"
            type="text"
            value={deviceName}
            onChange={(e) => setDeviceName(e.target.value)}
            placeholder="例: iPhone、MacBook など"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
          />
          <p className="mt-1 text-sm text-gray-500">
            どのデバイスで登録したか区別するための名前です
          </p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? '登録中...' : 'パスキーを登録'}
        </button>
      </form>
    </div>
  );
}
