import type { NextConfig } from "next";

// E2E テスト用のフック（components/Game.tsx）。未設定でも "0" としてビルド時に埋め込ませ、
// 本番ビルドからコードごと消す（NEXT_PUBLIC_* は設定されているときだけ埋め込まれるため）
process.env.NEXT_PUBLIC_E2E = process.env.NEXT_PUBLIC_E2E === "1" ? "1" : "0";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      {
        // Service Worker 本体は常に最新を取りに行かせる
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
        ],
      },
    ];
  },
};

export default nextConfig;
