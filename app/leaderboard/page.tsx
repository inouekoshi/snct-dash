import Link from 'next/link'
import { Suspense } from 'react'
import Leaderboard from '@/components/Leaderboard'

export const revalidate = 10

export default function LeaderboardPage() {
  return (
    <main className="flex flex-col items-center min-h-screen gap-6 px-4 py-8">
      <div className="flex items-center gap-4 w-full max-w-md">
        <Link href="/" className="text-gray-400 hover:text-white transition-colors">
          ← ホーム
        </Link>
        <h1 className="text-2xl font-black flex-1 text-center">🏆 ランキング</h1>
        <div className="w-12" />
      </div>
      <Suspense fallback={<div className="text-gray-500 py-12">読み込み中...</div>}>
        <Leaderboard />
      </Suspense>
      <Link
        href="/game"
        className="fixed bottom-6 left-1/2 -translate-x-1/2 px-8 py-4 bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-black text-lg rounded-2xl transition-colors shadow-xl"
      >
        プレイする
      </Link>
    </main>
  )
}
