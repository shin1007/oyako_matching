import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "親子マッチング - 親子の再会を支援",
  description: "親子断絶・実子誘拐後の再会を支援するマッチングプラットフォーム",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
