import React from 'react';

interface DeleteProfileDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
}


export const DeleteProfileDialog: React.FC<DeleteProfileDialogProps> = ({ open, onClose, onConfirm, loading }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm">
        <h4 className="text-lg font-semibold mb-2 text-gray-900">本当に退会しますか？</h4>
        <p className="text-sm text-gray-700 mb-4">退会すると、すべてのデータが完全に削除されます。この操作は取り消せません。</p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="px-4 py-2 rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
            onClick={onClose}
            disabled={loading}
          >
            キャンセル
          </button>
          <button
            type="button"
            className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
            onClick={onConfirm}
            disabled={loading}
          >
            退会する
          </button>
        </div>
      </div>
    </div>
  );
};
