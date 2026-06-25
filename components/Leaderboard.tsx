'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import type { StageClearEntry } from '@/lib/types'
import { AREAS } from '@/lib/game/areas'
import type { AreaId } from '@/lib/game/areas'

function formatTime(ms: number): string {
  const m = Math.floor(ms / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  const cs = Math.floor((ms % 1000) / 10)
  return `${m}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`
}

async function fetchEntries(department: number): Promise<StageClearEntry[]> {
  const res = await fetch(`/api/leaderboard?department=${department}`, { cache: 'no-store' })
  if (!res.ok) return []
  const { entries } = await res.json()
  return entries
}

const DEPARTMENTS = [1, 2, 3, 4, 5] as const

export default function Leaderboard() {
  const searchParams = useSearchParams()
  const initialDept = parseInt(searchParams.get('department') ?? '1', 10)
  const [department, setDepartment] = useState<number>(
    initialDept >= 1 && initialDept <= 5 ? initialDept : 1,
  )
  const [entries, setEntries] = useState<StageClearEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let ignore = false
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    fetchEntries(department).then((data) => {
      if (!ignore) { setEntries(data); setLoading(false) }
    })
    return () => { ignore = true }
  }, [department])

  return (
    <div className="w-full max-w-md space-y-4 pb-24">
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
                {theme.name.replace('工学科', '')}
              </span>
            </button>
          )
        })}
      </div>

      {loading ? (
        <div className="text-center text-gray-500 py-12">読み込み中...</div>
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
