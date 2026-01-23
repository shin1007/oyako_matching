import React from 'react';

interface DeleteProfileDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
}

export const DeleteProfileDialog: React.FC<DeleteProfileDialogProps> = ({ open, onClose, onConfirm, loading }) => (
  <div>
    {/* ここに削除確認ダイアログUIを実装 */}
    {/* ... */}
  </div>
);
