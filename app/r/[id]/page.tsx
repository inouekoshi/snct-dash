import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getClear } from '@/lib/server/clears'
import { AREAS, type AreaId } from '@/lib/game/areas'
import { formatTime } from '@/lib/format'
import SponsorCredit from '@/components/SponsorCredit'

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const clear = await getClear((await params).id)
  if (!clear) return { title: '高専ダッシュ！' }
  const dept = AREAS[clear.department as AreaId]
  const title = `${clear.nickname}さんは${dept.name}を ${formatTime(clear.clear_time_ms)} でクリア！`
  return {
    title: `${title} | 高専ダッシュ！`,
    description: `鈴鹿高専祭の5学科タイムアタック「高専ダッシュ！」。${dept.name}ランキング ${clear.rank}位。きみも挑戦しよう！`,
    twitter: { card: 'summary_large_image' },
  }
}

// シェアされたクリア記録のページ（X / LINE のリンク先）
export default async function SharedResultPage({ params }: Props) {
  const clear = await getClear((await params).id)
  if (!clear) notFound()
  const dept = AREAS[clear.department as AreaId]

  return (
    <main className="relative flex flex-col items-center justify-center min-h-screen gap-6 px-4 pt-8 pb-14 text-center">
      <p className="text-blue-400 text-sm tracking-widest">鈴鹿高専祭</p>
      <h1 className="text-4xl font-black">
        高専ダッシュ<span className="text-yellow-400">！</span>
      </h1>
      <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-xs space-y-2">
        <p className="text-gray-400 text-sm">{dept.emoji} {dept.name}</p>
        <p className="text-5xl font-black text-yellow-400 tabular-nums">{formatTime(clear.clear_time_ms)}</p>
        <p className="font-bold">{clear.nickname} さん</p>
        <p className="text-2xl font-black text-blue-400">{clear.rank} 位</p>
      </div>
      <Link
        href="/"
        className="w-full max-w-xs py-4 bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-black text-xl rounded-2xl transition-colors"
      >
        きみも挑戦する！
      </Link>
      <Link href={`/leaderboard?department=${clear.department}`} className="text-gray-400 text-sm underline">
        {dept.name}のランキングを見る
      </Link>
      <SponsorCredit />
    </main>
  )
}
