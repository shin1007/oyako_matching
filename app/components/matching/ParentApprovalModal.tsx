interface ParentApprovalModalProps {
  open: boolean;
  onApprove: () => void;
  onCancel: () => void;
}

export function ParentApprovalModal({ open, onApprove, onCancel }: ParentApprovalModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-orange-50 rounded-lg shadow-lg p-8 max-w-md w-full border-2 border-orange-300">
        <h2 className="text-xl font-bold mb-4 text-orange-700">親の同意が必要です</h2>
        <p className="mb-6 text-orange-800">18歳未満の方は親の同意が必要です。親御様の同意を得てから申請してください。</p>
        <div className="flex gap-4 justify-end">
          <button onClick={onCancel} className="px-4 py-2 rounded bg-orange-200 text-orange-900 font-semibold hover:bg-orange-300">キャンセル</button>
          <button onClick={onApprove} className="px-4 py-2 rounded bg-orange-500 text-white font-semibold hover:bg-orange-600">親の同意を得たので申請</button>
        </div>
      </div>
    </div>
  );
}
