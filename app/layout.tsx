import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import ClientLayout from "./ClientLayout";
import "./globals.css";


export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let displayName: string | null = '';
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
  return (
    <html lang="ja" suppressHydrationWarning>
      <body className="font-sans antialiased bg-gray-50">
        <ClientLayout user={user} displayName={displayName} heroHref={heroHref}>
          {children}
        </ClientLayout>
      </body>
    </html>
  );
}
