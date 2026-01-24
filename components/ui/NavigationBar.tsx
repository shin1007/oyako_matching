// ナビゲーションボタン共通UIコンポーネント
'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React from 'react';

export interface NavigationBarProps {
  user?: any;
  displayName?: string;
  links: Array<{
    href: string;
    label: string;
    icon?: React.ReactNode;
    badge?: number;
  }>;
}

export const NavigationBar: React.FC<NavigationBarProps> = ({ user, displayName, links }) => {
  return (
    <nav className="flex items-center gap-3 text-sm text-slate-700">
      {user && displayName && (
        <Link
          href="/dashboard"
          className="font-medium text-slate-800 hover:text-slate-600 hover:underline"
        >
          {displayName}
        </Link>
      )}
      {links.map(({ href, label, icon, badge }) => (
        <Link
          key={href}
          href={href}
          className="relative rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-800 hover:bg-slate-100"
        >
          {icon} {label}
          {badge && badge > 0 && (
            <span className="absolute -top-2 -right-2 inline-flex items-center justify-center w-6 h-6 text-xs font-bold text-white bg-red-500 rounded-full">
              {badge > 9 ? '9+' : badge}
            </span>
          )}
        </Link>
      ))}
    </nav>
  );
};
