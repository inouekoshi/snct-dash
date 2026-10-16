'use client'

import { AREAS } from '@/lib/game/areas'
import type { AreaId } from '@/lib/game/areas'
import { STAGE_INFO } from '@/lib/game/stage-info'
import { isUnderMaintenance } from '@/lib/maintenance'

const DEPARTMENTS = [1, 2, 3, 4, 5] as const

interface Props {
  onSelect: (departmentId: number) => void
  onBack: () => void
}

export default function DepartmentSelect({ onSelect, onBack }: Props) {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen gap-8 px-4 text-center">
      <div className="space-y-2">
        <h2 className="text-3xl font-black">学科を選択</h2>
        <p className="text-gray-400 text-sm">選んだ学科のステージをクリアタイムで競う！</p>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-sm">
        {DEPARTMENTS.map((id) => {
          const theme = AREAS[id as AreaId]
          const closed = isUnderMaintenance(id)
          return (
            <button
              key={id}
              onClick={() => onSelect(id)}
              disabled={closed}
              aria-disabled={closed}
              className={closed
                ? 'flex items-center gap-4 p-4 rounded-2xl text-left border bg-gray-900 border-gray-800 cursor-not-allowed'
                : 'flex items-center gap-4 p-4 rounded-2xl transition-colors text-left border bg-gray-800 hover:bg-gray-700 border-gray-700 hover:border-gray-500 active:scale-95'}
            >
              <span className={`text-4xl w-12 text-center ${closed ? 'grayscale opacity-40' : ''}`}>{theme.emoji}</span>
              <div>
                <p className={`font-black text-lg ${closed ? 'text-gray-500' : ''}`}>{theme.name}</p>
                {closed
                  ? <p className="text-xs text-amber-400 mt-0.5">🔧 メンテナンス中のため、いまは遊べません</p>
                  : <p className="text-xs text-gray-400 mt-0.5">{STAGE_INFO[id].catch}</p>}
              </div>
            </button>
          )
        })}
      </div>

      <button
        onClick={onBack}
        className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
      >
        ← タイトルに戻る
      </button>
    </main>
  )
}
