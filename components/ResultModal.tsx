'use client'

import { useEffect, useState } from 'react'
import type { GameResult } from '@/lib/types'

const AREA_NAMES = ['', '機械工学科', '電気電子工学科', '電子情報工学科', '生物応用化学科', '材料工学科']

interface ResultModalProps {
  nickname: string
  result: GameResult
  onRetry: () => void
  onHome: () => void
  onLeaderboard: () => void
}

export default function ResultModal({ nickname, result, onRetry, onHome, onLeaderboard }: ResultModalProps) {
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [rank, setRank] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function submitScore() {
      setSubmitting(true)
      try {
        const res = await fetch('/api/scores', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nickname,
            score: result.score,
            distance: result.distance,
            max_area: result.maxArea,
          }),
        })
        if (!res.ok) throw new Error('submit failed')
        setSubmitted(true)

        const rankRes = await fetch('/api/leaderboard?filter=all')
        if (rankRes.ok) {
          const { scores } = await rankRes.json()
          const idx = (scores as { score: number }[]).findIndex((s) => s.score <= result.score)
          setRank(idx === -1 ? scores.length + 1 : idx + 1)
        }
      } catch {
        setError('スコア登録に失敗しました')
      } finally {
        setSubmitting(false)
      }
    }
    submitScore()
  }, [nickname, result])

  return (
    <main className="flex flex-col items-center justify-center min-h-screen gap-6 px-4 text-center">
      <div className="space-y-1">
        <p className="text-red-400 font-bold tracking-widest">GAME OVER</p>
        <h2 className="text-2xl font-black">{nickname} さんのスコア</h2>
      </div>

      <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-xs space-y-4">
        <div>
          <p className="text-gray-400 text-sm">スコア</p>
          <p className="text-5xl font-black text-yellow-400">{result.score.toLocaleString()}</p>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-400">走行距離</p>
            <p className="font-bold">{result.distance.toLocaleString()} m</p>
          </div>
          <div>
            <p className="text-gray-400">到達エリア</p>
            <p className="font-bold">{AREA_NAMES[result.maxArea]}</p>
          </div>
        </div>
        {result.lap >= 1 && (
          <div className="border-t border-gray-700 pt-3 text-sm">
            <p className="text-gray-400">最高周回</p>
            <p className="font-black text-orange-400 text-lg">LAP {result.lap + 1}</p>
          </div>
        )}
        {submitted && rank !== null && (
          <div className="border-t border-gray-700 pt-4">
            <p className="text-gray-400 text-sm">現在のランキング</p>
            <p className="text-2xl font-black text-blue-400">{rank} 位</p>
          </div>
        )}
        {submitting && <p className="text-gray-500 text-sm">スコアを登録中...</p>}
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
