'use client';

import { useState } from 'react';
import type { ReportReason, ReportContentType } from '@/types/database';

interface ReportModalProps {
  contentType: ReportContentType;
  contentId: string;
  contentPreview?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const REPORT_REASONS: { value: ReportReason; label: string; description: string }[] = [
  {
    value: 'spam',
    label: 'スパム',
    description: '宣伝や勧誘など、関連性のないコンテンツ',
  },
  {
    value: 'harassment',
    label: '誹謗中傷・ハラスメント',
    description: '他のユーザーを傷つける言動や嫌がらせ',
  },
  {
    value: 'personal_info',
    label: '個人情報の掲載',
    description: '許可なく個人情報を公開している',
  },
  {
    value: 'inappropriate',
    label: '不適切なコンテンツ',
    description: '暴力的、性的、または違法なコンテンツ',
  },
  {
    value: 'other',
    label: 'その他',
    description: '上記に当てはまらない理由',
  },
];

export default function ReportModal({
  contentType,
  contentId,
  contentPreview,
  isOpen,
  onClose,
  onSuccess,
}: ReportModalProps) {
  const [selectedReason, setSelectedReason] = useState<ReportReason | ''>('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedReason) {
      setError('通報理由を選択してください');
      return;
    }

    if (selectedReason === 'other' && !details.trim()) {
      setError('「その他」を選択した場合は、詳細を入力してください');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/forum/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reported_content_type: contentType,
          reported_content_id: contentId,
          report_reason: selectedReason,
          report_details: details || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '通報の送信に失敗しました');
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess?.();
        handleClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedReason('');
    setDetails('');
    setError('');
    setSuccess(false);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
      onClick={handleClose}
    >
      <div
        className="rounded-lg bg-white p-6 shadow-2xl max-w-2xl mx-4 w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {success ? (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">✅</div>
            <h3 className="text-2xl font-bold text-green-600 mb-2">
              通報を受け付けました
            </h3>
            <p className="text-gray-900">
              ご報告ありがとうございます。内容を確認させていただきます。
            </p>
          </div>
        ) : (
          <>
            <h2 id="report-modal-title" className="text-2xl font-bold text-gray-900 mb-4">
              🚨 不適切なコンテンツを通報
            </h2>

            {contentPreview && (
              <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
                <p className="text-sm text-gray-900 mb-1">通報対象:</p>
                <p className="text-sm text-gray-900 line-clamp-3">{contentPreview}</p>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="mb-6">
                <label className="mb-3 block text-sm font-medium text-gray-900">
                  通報理由を選択してください <span className="text-red-500">*</span>
                </label>
                <div className="space-y-3">
                  {REPORT_REASONS.map((reason) => (
                    <label
                      key={reason.value}
                      className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                        selectedReason === reason.value
                          ? 'border-red-500 bg-red-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="report_reason"
                        value={reason.value}
                        checked={selectedReason === reason.value}
                        onChange={(e) => setSelectedReason(e.target.value as ReportReason)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900">{reason.label}</div>
                        <div className="text-sm text-gray-900">{reason.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <label className="mb-2 block text-sm font-medium text-gray-900">
                  詳細説明
                  {selectedReason === 'other' && (
                    <span className="text-red-500"> *</span>
                  )}
                </label>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  rows={4}
                  placeholder="通報の理由について詳しく説明してください（任意）"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 text-gray-900"
                />
                <p className="mt-1 text-xs text-gray-500">
                  ※ 通報者の情報は匿名で保護されます
                </p>
              </div>

              {error && (
                <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-600">
                  {error}
                </div>
              )}

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={submitting}
                  className="rounded-lg bg-gray-200 px-6 py-2 text-gray-900 hover:bg-gray-300 disabled:opacity-50"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={submitting || !selectedReason}
                  className="rounded-lg bg-red-600 px-6 py-2 text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {submitting ? '送信中...' : '通報する'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
