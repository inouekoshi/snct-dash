'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import type { StageClearEntry } from '@/lib/types'
import { AREAS } from '@/lib/game/areas'
import type { AreaId } from '@/lib/game/areas'
import { fetchLeaderboard } from '@/lib/client/game-api'
import { formatTime } from '@/lib/format'

const DEPARTMENTS = [1, 2, 3, 4, 5] as const

export default function Leaderboard() {
  const searchParams = useSearchParams()
  const initialDept = parseInt(searchParams.get('department') ?? '1', 10)
  const [department, setDepartment] = useState<number>(
    initialDept >= 1 && initialDept <= 5 ? initialDept : 1,
  )
  // null = 読み込み失敗
  const [entries, setEntries] = useState<StageClearEntry[] | null>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let ignore = false
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    fetchLeaderboard(department).then((data) => {
      if (!ignore) { setEntries(data); setLoading(false) }
    })
    return () => { ignore = true }
  }, [department])

  return (
    <div className="w-full max-w-md space-y-4">
      {/* 学科タブ */}
      <div className="grid grid-cols-5 gap-1">
        {DEPARTMENTS.map((id) => {
          const theme = AREAS[id as AreaId]
          return (
            <button
              key={id}
              onClick={() => setDepartment(id)}
              className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xl text-xs font-bold transition-colors ${
                department === id
                  ? 'bg-yellow-400 text-gray-950'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              <span className="text-lg">{theme.emoji}</span>
              <span className="leading-tight text-center" style={{ fontSize: '10px' }}>
                {theme.short}
              </span>
            </button>
          )
        })}
      </div>

      {loading ? (
        <div className="text-center text-gray-500 py-12">読み込み中...</div>
      ) : entries === null ? (
        <div className="text-center text-gray-500 py-12" role="alert">
          <p>ランキングを読み込めませんでした</p>
          <p className="text-sm mt-1">少し待ってから開き直してね</p>
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center text-gray-500 py-12">
          <p className="text-4xl mb-2">🎮</p>
          <p>まだクリアデータがありません</p>
          <p className="text-sm mt-1">最初のクリアを目指そう！</p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry, i) => (
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
              </div>
              <span className="font-black text-yellow-400 text-lg tabular-nums">
                {formatTime(entry.clear_time_ms)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
