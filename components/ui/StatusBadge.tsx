// 承認/拒否/ブロック状態バッジの共通UI
import React from 'react';

export type MatchStatus = 'pending' | 'accepted' | 'rejected' | 'blocked' | string;

export interface StatusBadgeProps {
  status: MatchStatus;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  switch (status) {
    case 'pending':
      return <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-800">保留中</span>;
    case 'accepted':
      return <span className="rounded-full bg-parent-100 px-3 py-1 text-xs font-medium text-parent-800">承認済み</span>;
    case 'rejected':
      return <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-800">拒否済み</span>;
    case 'blocked':
      return <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-800">ブロック済み</span>;
    default:
      return null;
  }
};
