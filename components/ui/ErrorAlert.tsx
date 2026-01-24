import React from 'react';

interface ErrorAlertProps {
  message: string | null;
  onClose?: () => void;
  className?: string;
}

/**
 * 共通エラー表示用アラートコンポーネント
 * - message: エラーメッセージ（null/空文字なら非表示）
 * - onClose: 閉じるボタン押下時のコールバック（省略可）
 * - className: 追加クラス
 */
export const ErrorAlert: React.FC<ErrorAlertProps> = ({ message, onClose, className = '' }) => {
  if (!message) return null;
  return (
    <div className={`mb-4 rounded-lg bg-red-50 border border-red-200 p-4 text-red-700 flex items-start gap-2 shadow-sm ${className}`} role="alert">
      <span className="text-xl mt-0.5">❗</span>
      <span className="flex-1">{message}</span>
      {onClose && (
        <button
          type="button"
          className="ml-2 text-red-400 hover:text-red-700 font-bold text-lg px-2"
          aria-label="閉じる"
          onClick={onClose}
        >
          ×
        </button>
      )}
    </div>
  );
};
