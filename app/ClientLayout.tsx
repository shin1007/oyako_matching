"use client";
import Link from "next/link";
import { HeaderNav } from "@/app/components/layout/header-nav";
import { GlobalErrorBoundary } from "@/components/GlobalErrorBoundary";
import { RoleThemeProvider } from '@/contexts/RoleThemeContext';
import { useApplyRoleTheme } from '@/contexts/useApplyRoleTheme';

function RoleThemeWrapper({ children }: { children: React.ReactNode }) {
  useApplyRoleTheme();
  return <>{children}</>;
}

export default function ClientLayout({
  children,
  user = null,
  displayName = null,
  heroHref = "/",
}: {
  children: React.ReactNode;
  user?: any;
  displayName?: string | null;
  heroHref?: string;
}) {
  return (
    <RoleThemeProvider>
      <RoleThemeWrapper>
        <header className="sticky top-0 z-50 border-b border-slate-200 bg-white shadow-sm">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <Link href={heroHref} className="group block">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 group-hover:text-slate-700">
                Oyako Matching
              </p>
              <h1 className="text-xl font-bold text-slate-900 group-hover:text-slate-950">
                親子マッチング - 親子の再会を支援
              </h1>
            </Link>
            <HeaderNav user={user} displayName={displayName} />
          </div>
        </header>
        <main className="min-h-screen bg-gray-50 pt-4 md:pt-6 lg:pt-8">
          <GlobalErrorBoundary>
            {children}
          </GlobalErrorBoundary>
        </main>
      </RoleThemeWrapper>
    </RoleThemeProvider>
  );
}
