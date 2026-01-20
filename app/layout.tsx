import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { HeaderNav } from "@/app/components/layout/header-nav";
import { GlobalErrorBoundary } from "@/components/GlobalErrorBoundary";
import "./globals.css";

export const metadata: Metadata = {
  title: "親子マッチング - 親子の再会を支援",
  description: "親子断絶・実子誘拐後の再会を支援するマッチングプラットフォーム",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let displayName: string | null = null;

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("last_name_kanji, first_name_kanji")
      .eq("user_id", user.id)
      .single();
    const displayNameFromProfile = (profile?.last_name_kanji || '') + (profile?.first_name_kanji || '');
    displayName = displayNameFromProfile || user.email || "ログイン中";
  }

  const heroHref = user ? "/dashboard" : "/";

  const handleSignOut = async () => {
    "use server";
    const supabase = await createClient();
    await supabase.auth.signOut();
  };

  return (
    <html lang="ja" suppressHydrationWarning>
      <body className="font-sans antialiased bg-gray-50">
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
      </body>
    </html>
  );
}
