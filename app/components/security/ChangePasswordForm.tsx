'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [userRole, setUserRole] = useState<string>('parent');
  const supabase = createClient();

  useEffect(() => {
    loadUserRole();
  }, []);

  const loadUserRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userData) {
      setUserRole(userData.role);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    // バリデーション
    if (!currentPassword) {
      setError('現在のパスワードを入力してください');
      setLoading(false);
      return;
    }

    if (!newPassword) {
      setError('新しいパスワードを入力してください');
      setLoading(false);
      return;
    }

    const hasUpper = /[A-Z]/.test(newPassword);
    const hasLower = /[a-z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);

    if (!(newPassword.length >= 8 && hasUpper && hasLower && hasNumber)) {
      setError('8文字以上で、大文字・小文字・数字をすべて含めてください');
      setLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('新しいパスワードが一致しません');
      setLoading(false);
      return;
    }

    if (currentPassword === newPassword) {
      setError('新しいパスワードは現在のパスワードと異なる必要があります');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'パスワード変更に失敗しました');
        return;
      }

      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      // 3秒後にメッセージをクリア
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (err: any) {
      console.error('Error:', err);
      setError('エラーが発生しました。もう一度試してください。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      <div>
        <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-2">
          現在のパスワード
        </label>
        <input
          type="password"
          id="currentPassword"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          placeholder="現在のパスワードを入力"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={loading}
          required
        />
      </div>

      <div>
        <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
          新しいパスワード
        </label>
        <input
          type="password"
          id="newPassword"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="8文字以上の新しいパスワード"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={loading}
          required
        />
        <p className="text-xs text-gray-500 mt-1">8文字以上で、大文字・小文字・数字をすべて含めてください</p>
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
          新しいパスワード（確認）
        </label>
        <input
          type="password"
          id="confirmPassword"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="新しいパスワードをもう一度入力"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={loading}
          required
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className={`border px-4 py-3 rounded-lg text-sm flex items-center ${userRole === 'child' ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-green-50 border-green-200 text-green-700'}`}>
          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          パスワードが正常に変更されました
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className={`w-full text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed ${userRole === 'child' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-green-600 hover:bg-green-700'}`}
      >
        {loading ? 'パスワード変更中...' : 'パスワードを変更'}
      </button>

      <div className={`border rounded-lg p-4 text-sm ${userRole === 'child' ? 'bg-orange-50 border-orange-200 text-orange-900' : 'bg-green-50 border-green-200 text-green-900'}`}>
        <p className="font-medium mb-2">セキュリティのヒント：</p>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li>大文字、小文字、数字を含むパスワードを使用してください</li>
          <li>他のアカウントと同じパスワードを使用しないでください</li>
          <li>定期的にパスワードを変更することをお勧めします</li>
        </ul>
      </div>
    </form>
  );
}
