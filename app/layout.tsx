import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
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
      .select("full_name")
      .eq("user_id", user.id)
      .single();
    displayName = profile?.full_name || user.email || "ログイン中";
  }

  const handleSignOut = async () => {
    "use server";
    const supabase = await createClient();
    await supabase.auth.signOut();
  };

  return (
    <html lang="ja">
      <body className="font-sans antialiased bg-gray-50">
        <header className="sticky top-0 z-50 border-b border-slate-200 bg-white shadow-sm">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Oyako Matching</p>
              <h1 className="text-xl font-bold text-slate-900">親子マッチング - 親子の再会を支援</h1>
            </div>
            <nav className="flex items-center gap-3 text-sm text-slate-700">
              {user ? (
                <>
                  <span className="font-medium">{displayName}</span>
                  <form action={handleSignOut}>
                    <button
                      type="submit"
                      className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-800 hover:bg-slate-100"
                    >
                      ログアウト
                    </button>
                  </form>
                </>
              ) : (
                <Link
                  href="/auth/login"
                  className="rounded-lg border border-blue-600 px-4 py-2 font-semibold text-blue-700 hover:bg-blue-50"
                >
                  ログイン
                </Link>
              )}
            </nav>
          </div>
        </header>
        <main className="min-h-screen bg-gray-50 pt-4 md:pt-6 lg:pt-8">
          {children}
        </main>
      </body>
    </html>
  );
}
