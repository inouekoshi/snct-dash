'use client'

import { useEffect } from 'react'
import './globals.css'

// ルートレイアウトごと落ちたときの最後の受け皿。layout.tsx の代わりに html / body から描く
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <html lang="ja" className="h-full">
      <body className="min-h-full bg-gray-950 text-white">
        <title>高専ダッシュ！</title>
        <main className="flex flex-col items-center justify-center min-h-svh gap-6 px-4 py-8 text-center">
          <p className="text-5xl">🙇</p>
          <div className="space-y-2">
            <h1 className="text-2xl font-black">うまく表示できませんでした</h1>
            <p className="text-gray-400 text-sm">もう一度試すか、タイトルからやり直してね</p>
          </div>
          <div className="flex flex-col gap-3 w-full max-w-xs">
            <button
              onClick={() => retry()}
              className="w-full py-4 bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-black text-xl rounded-2xl transition-colors"
            >
              もう一度試す
            </button>
            {/* 画面の状態ごと作り直したいので、Link ではなくページを読み込み直してタイトルに戻す */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              className="w-full py-3 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-2xl transition-colors border border-gray-700"
            >
              タイトルに戻る
            </a>
          </div>
        </main>
      </body>
    </html>
  )
}
