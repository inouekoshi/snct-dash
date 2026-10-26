import Link from 'next/link'
import { Suspense } from 'react'
import Leaderboard from '@/components/Leaderboard'
import SponsorCredit from '@/components/SponsorCredit'

export default function LeaderboardPage() {
  return (
    <main className="flex flex-col items-center min-h-svh px-4 pt-8">
      <div className="flex flex-col items-center gap-6 w-full flex-1">
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
      </div>
      {/* 下部はスクロールしても画面下に貼りつく。一覧が長いときは行がボタンの裏でフェードし、
          短いときは画面の下端に並ぶ（固定配置ではないので、件数が変わっても最後の行や表記を隠さない） */}
      <div className="sticky bottom-0 z-10 w-full flex flex-col items-center gap-3 pt-8 pb-4 bg-linear-to-t from-gray-950 from-75% to-gray-950/0">
        <Link
          href="/game"
          className="px-8 py-4 bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-black text-lg rounded-2xl transition-colors shadow-xl"
        >
          プレイする
        </Link>
        <SponsorCredit inFlow />
      </div>
    </main>
  )
}
