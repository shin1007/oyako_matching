import React from 'react';
import Link from 'next/link';

interface NoMatchingCardProps {
  userRole: string | null;
}

export const NoMatchingCard: React.FC<NoMatchingCardProps> = ({ userRole }) => (
  <div className="rounded-lg bg-white p-12 text-center shadow">
    <div className="mb-4 text-6xl">😔</div>
    <h2 className="mb-2 text-xl font-semibold text-gray-900">
      マッチングが見つかりませんでした
    </h2>
    <p className="mb-6 text-gray-600">
      プロフィールを充実させると、マッチングの精度が向上します
    </p>
    <Link
      href="/dashboard/profile"
      className="inline-block rounded-lg px-6 py-3 text-white bg-role-primary bg-role-primary-hover"
    >
      プロフィールを編集
    </Link>
  </div>
);
