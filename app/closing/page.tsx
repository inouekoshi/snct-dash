import type { Metadata } from 'next'
import Link from 'next/link'
import SponsorCredit from '@/components/SponsorCredit'
import { AREAS } from '@/lib/game/areas'
import { formatTime } from '@/lib/format'
import { DEPARTMENT_RESULTS, FESTIVAL_PERIOD_LABEL, FESTIVAL_TOTALS } from '@/lib/closing'

export const metadata: Metadata = {
  title: '高専祭の結果 | 高専ダッシュ！',
  description: '高専ダッシュ！で遊んでくださったみなさん、ありがとうございました。各学科の最終1位と全体の記録です。',
}

const maxPlays = Math.max(...DEPARTMENT_RESULTS.map(r => r.plays))

// 高専祭のクロージング画面。結果は lib/closing.ts に固定してあり、DB は読まない
export default function ClosingPage() {
  const totals = [
    { label: 'プレイ回数', value: FESTIVAL_TOTALS.plays, unit: '回' },
    { label: 'クリア回数', value: FESTIVAL_TOTALS.clears, unit: '回' },
    { label: '参加者', value: FESTIVAL_TOTALS.players, unit: '人' },
  ]

  return (
    <main className="flex flex-col items-center min-h-svh px-4 pt-10 pb-6 text-center">
      <div className="flex flex-col items-center gap-8 w-full max-w-md">
        <div className="space-y-3">
          <p className="text-blue-400 text-sm tracking-widest">鈴鹿高専祭 2026</p>
          <h1 className="text-[clamp(2rem,10vw,3rem)] leading-tight font-black">
            <span className="block">ありがとう</span>
            <span className="block text-yellow-400">ございました！</span>
          </h1>
          <p className="text-gray-400 text-sm leading-relaxed">
            高専ダッシュ！で遊んでくださったみなさん、
            <br />
            本当にありがとうございました。
          </p>
        </div>

        <section className="w-full space-y-3" aria-labelledby="totals-heading">
          <h2 id="totals-heading" className="text-xs text-gray-500 tracking-widest">
            みんなの記録（{FESTIVAL_PERIOD_LABEL}）
          </h2>
          <div className="grid grid-cols-3 gap-2">
            {totals.map(t => (
              <div key={t.label} className="py-3 rounded-xl bg-gray-900 border border-gray-800">
                <p className="text-[clamp(1.25rem,6vw,1.75rem)] font-black tabular-nums">
                  {t.value.toLocaleString('ja-JP')}
                  <span className="text-sm text-gray-400 font-bold ml-0.5">{t.unit}</span>
                </p>
                <p className="text-xs text-gray-400">{t.label}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="w-full space-y-3" aria-labelledby="champions-heading">
          <h2 id="champions-heading" className="text-xl font-black">🏆 各学科の最終1位</h2>
          <ul className="space-y-2">
            {DEPARTMENT_RESULTS.map(r => {
              const dept = AREAS[r.department]
              return (
                <li
                  key={r.department}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl border text-left"
                  style={{ borderColor: `${dept.groundLineColor}88`, backgroundColor: `${dept.groundLineColor}14` }}
                >
                  <span className="text-2xl w-8 text-center shrink-0">{dept.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-400">{dept.name}</p>
                    <p className="font-bold text-lg truncate">{r.champion.nickname}</p>
                  </div>
                  <p className="font-mono font-bold text-lg tabular-nums" style={{ color: dept.groundLineColor }}>
                    {formatTime(r.champion.clearTimeMs)}
                  </p>
                </li>
              )
            })}
          </ul>
        </section>

        <section className="w-full space-y-3" aria-labelledby="popular-heading">
          <h2 id="popular-heading" className="text-sm font-bold text-gray-300">学科別のプレイ回数</h2>
          <ul className="space-y-2">
            {DEPARTMENT_RESULTS.map(r => {
              const dept = AREAS[r.department]
              return (
                <li key={r.department} className="flex items-center gap-2 text-xs">
                  <span className="w-16 shrink-0 text-left text-gray-400 whitespace-nowrap">{dept.short}</span>
                  <div className="flex-1 h-3 rounded-full bg-gray-900 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${(r.plays / maxPlays) * 100}%`, backgroundColor: dept.groundLineColor }}
                    />
                  </div>
                  <span className="w-14 shrink-0 text-right tabular-nums text-gray-300">
                    {r.plays.toLocaleString('ja-JP')}回
                  </span>
                </li>
              )
            })}
          </ul>
        </section>

        <div className="flex flex-col gap-3 w-full max-w-xs">
          <p className="text-gray-400 text-sm">高専祭が終わっても、まだ遊べます！</p>
          <Link
            href="/"
            className="w-full py-4 bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-black text-xl rounded-2xl transition-colors"
          >
            もう一度遊ぶ
          </Link>
          <Link
            href="/leaderboard"
            className="w-full py-3 bg-gray-800 hover:bg-gray-700 text-white font-bold text-base rounded-2xl transition-colors border border-gray-700"
          >
            いまのランキングを見る
          </Link>
        </div>

        <SponsorCredit inFlow />
      </div>
    </main>
  )
}
