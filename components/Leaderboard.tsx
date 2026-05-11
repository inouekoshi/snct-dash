'use client'

import { useState, useEffect } from 'react'
import type { ScoreEntry, LeaderboardFilter } from '@/lib/types'

const AREA_EMOJIS = ['', '⚙', '⚡', '💻', '🧬', '💎']

async function fetchScores(filter: LeaderboardFilter): Promise<ScoreEntry[]> {
  const res = await fetch(`/api/leaderboard?filter=${filter}`, { cache: 'no-store' })
  if (!res.ok) return []
  const { scores } = await res.json()
  return scores
}

export default function Leaderboard() {
  const [filter, setFilter] = useState<LeaderboardFilter>('all')
  const [scores, setScores] = useState<ScoreEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetchScores(filter).then((data) => {
      setScores(data)
      setLoading(false)
    })
  }, [filter])

  return (
    <div className="w-full max-w-md space-y-4 pb-24">
      <div className="flex gap-2">
        {(['all', 'today'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 py-2 rounded-xl font-bold text-sm transition-colors ${
              filter === f
                ? 'bg-yellow-400 text-gray-950'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {f === 'all' ? '全期間 TOP20' : '本日 TOP10'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center text-gray-500 py-12">読み込み中...</div>
      ) : scores.length === 0 ? (
        <div className="text-center text-gray-500 py-12">
          <p className="text-4xl mb-2">🎮</p>
          <p>まだスコアがありません</p>
          <p className="text-sm mt-1">最初のプレイヤーになろう！</p>
        </div>
      ) : (
        <div className="space-y-2">
          {scores.map((entry, i) => (
            <div
              key={entry.id}
              className={`flex items-center gap-3 p-3 rounded-xl ${
                i === 0 ? 'bg-yellow-900/30 border border-yellow-700' :
                i === 1 ? 'bg-gray-600/30 border border-gray-500' :
                i === 2 ? 'bg-orange-900/30 border border-orange-800' :
                'bg-gray-800/50'
              }`}
            >
              <span className="text-xl font-black w-8 text-center">
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-bold truncate">{entry.nickname}</p>
                <p className="text-xs text-gray-400">
                  {AREA_EMOJIS[entry.max_area]} エリア{entry.max_area} · {entry.distance.toLocaleString()}m
                </p>
              </div>
              <span className="font-black text-yellow-400 text-lg">
                {entry.score.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
