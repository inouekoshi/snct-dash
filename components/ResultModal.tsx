'use client'

import { useEffect, useState } from 'react'
import type { GameClearResult } from '@/lib/types'
import { AREAS } from '@/lib/game/areas'
import type { AreaId } from '@/lib/game/areas'

function formatTime(ms: number): string {
  const m = Math.floor(ms / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  const cs = Math.floor((ms % 1000) / 10)
  return `${m}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`
}

interface Props {
  nickname: string
  result: GameClearResult
  onRetry: () => void
  onHome: () => void
  onLeaderboard: () => void
}

export default function ResultModal({ nickname, result, onRetry, onHome, onLeaderboard }: Props) {
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [rank, setRank] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const theme = AREAS[result.departmentId as AreaId]

  useEffect(() => {
    async function submitClear() {
      setSubmitting(true)
      try {
        const res = await fetch('/api/stage-clears', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nickname,
            department: result.departmentId,
            clear_time_ms: result.timeMs,
          }),
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(`HTTP ${res.status}: ${body.error ?? 'unknown'}`)
        }
        setSubmitted(true)

        const rankRes = await fetch(`/api/leaderboard?department=${result.departmentId}`)
        if (rankRes.ok) {
          const { entries } = await rankRes.json()
          const idx = (entries as { clear_time_ms: number }[]).findIndex(
            (e) => e.clear_time_ms >= result.timeMs,
          )
          setRank(idx === -1 ? entries.length + 1 : idx + 1)
        }
      } catch (e) {
        setError(`クリアタイムの登録に失敗しました (${e instanceof Error ? e.message : String(e)})`)
      } finally {
        setSubmitting(false)
      }
    }
    submitClear()
  }, [nickname, result])

  return (
    <main className="flex flex-col items-center justify-center min-h-screen gap-6 px-4 text-center">
      <div className="space-y-1">
        <p className="text-yellow-400 font-bold tracking-widest text-lg">STAGE CLEAR!</p>
        <h2 className="text-2xl font-black">{nickname} さんのタイム</h2>
      </div>

      <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-xs space-y-4">
        <div>
          <p className="text-gray-400 text-sm">{theme.emoji} {theme.name}</p>
          <p className="text-5xl font-black text-yellow-400 mt-1">{formatTime(result.timeMs)}</p>
        </div>

        {submitted && rank !== null && (
          <div className="border-t border-gray-700 pt-4">
            <p className="text-gray-400 text-sm">現在のランキング</p>
            <p className="text-2xl font-black text-blue-400">{rank} 位</p>
          </div>
        )}
        {submitting && <p className="text-gray-500 text-sm">登録中...</p>}
        {error && <p className="text-red-400 text-sm">{error}</p>}
      </div>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          onClick={onRetry}
          className="w-full py-4 bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-black text-xl rounded-2xl transition-colors"
        >
          もう一度！
        </button>
        <button
          onClick={onLeaderboard}
          className="w-full py-3 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-2xl transition-colors border border-gray-700"
        >
          ランキングを見る 🏆
        </button>
        <button
          onClick={onHome}
          className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
        >
          タイトルに戻る
        </button>
      </div>
    </main>
  )
}
