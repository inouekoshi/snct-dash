import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "高専ダッシュ！",
  description: "鈴鹿高専の5学科を走り抜けろ！高専祭限定エンドレスランナーゲーム",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="h-full">
      <body className="min-h-full bg-gray-950 text-white">{children}</body>
    </html>
  );
}
