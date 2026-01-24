import React from 'react';
import Link from 'next/link';

interface NoTargetRegisteredCardProps {
  userRole: string | null;
}

export const NoTargetRegisteredCard: React.FC<NoTargetRegisteredCardProps> = ({ userRole }) => (
  <div className="rounded-lg bg-white p-12 text-center shadow">
    <div className="mb-4 text-6xl">📝</div>
    <h2 className="mb-2 text-xl font-semibold text-gray-900">
      {userRole === 'parent' ? '探している子どもを登録してください' : '探している親を登録してください'}
    </h2>
    <p className="mb-6 text-gray-600">
      {userRole === 'parent'
        ? '探している子どもの情報を登録すると、マッチングが表示されます'
        : '探している親の情報を登録すると、マッチングが表示されます'}
    </p>
    <Link
      href="/dashboard/profile"
      className="inline-block rounded-lg px-6 py-3 text-white bg-role-primary bg-role-primary-hover"
    >
      プロフィールを編集
    </Link>
  </div>
);
