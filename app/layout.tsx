import type { Metadata, Viewport } from "next";
import "./globals.css";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

// OGP画像などの絶対URLの基準。Vercel では本番・プレビューそれぞれの URL を使う
function siteUrl(): string {
  const host =
    process.env.VERCEL_ENV === "production"
      ? process.env.VERCEL_PROJECT_PRODUCTION_URL
      : process.env.VERCEL_BRANCH_URL ?? process.env.VERCEL_URL;
  return host ? `https://${host}` : "http://localhost:3000";
}

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: "高専ダッシュ！",
  description: "鈴鹿高専の5学科をテーマにしたタイムアタックゲーム。学科を選んでクリアタイムを競おう！",
  applicationName: "高専ダッシュ！",
  appleWebApp: { capable: true, title: "高専ダッシュ", statusBarStyle: "black-translucent" },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#030712",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="h-full">
      <body className="min-h-full bg-gray-950 text-white">
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
