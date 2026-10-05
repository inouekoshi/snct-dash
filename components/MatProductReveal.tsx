'use client'

import { useEffect, useState } from 'react'

// 材料工学科のクリア演出：工程が並び、チタン眼鏡フレームが組み上がる。
// （ゲームのキャンバスはクリア時に描画を止めるので、結果画面側で見せる）
const STEPS = ['🔥 溶解', '🛞 圧延', '♨️ 熱処理', '🔬 検査']

export default function MatProductReveal({ accent }: { accent: string }) {
  const [shown, setShown] = useState(0)

  useEffect(() => {
    const timers = STEPS.map((_, i) => setTimeout(() => setShown(i + 1), 300 + i * 350))
    const done = setTimeout(() => setShown(STEPS.length + 1), 300 + STEPS.length * 350 + 200)
    return () => { timers.forEach(clearTimeout); clearTimeout(done) }
  }, [])

  const frameDone = shown > STEPS.length

  return (
    <div
      className="w-full max-w-xs rounded-2xl px-4 py-3 space-y-2"
      style={{ backgroundColor: `${accent}14`, border: `1px solid ${accent}40` }}
    >
      <div className="flex items-center justify-center gap-1 text-xs font-bold flex-wrap">
        {STEPS.map((s, i) => (
          <span key={s} className="flex items-center gap-1">
            <span
              className="px-2 py-0.5 rounded-full transition-all duration-300"
              style={{
                opacity: i < shown ? 1 : 0.15,
                transform: i < shown ? 'scale(1)' : 'scale(0.8)',
                backgroundColor: `${accent}33`,
                color: '#fff',
              }}
            >
              {s}
            </span>
            {i < STEPS.length - 1 && <span className="text-gray-500">›</span>}
          </span>
        ))}
      </div>

      <svg viewBox="0 0 200 70" className="w-full h-16" aria-label="チタン眼鏡フレーム">
        <path
          d="M10 30 Q12 14 30 14 L46 14 Q72 14 74 32 Q74 54 46 54 L36 54 Q10 54 10 30 Z
             M126 32 Q128 14 154 14 L170 14 Q188 14 190 30 Q190 54 164 54 L154 54 Q126 54 126 32 Z
             M74 30 Q100 18 126 30"
          fill="none"
          stroke="#d7dde6"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1}
          style={{
            strokeDasharray: 1,
            strokeDashoffset: frameDone ? 0 : 1,
            transition: 'stroke-dashoffset 1.2s ease-out',
            filter: `drop-shadow(0 0 6px ${accent})`,
          }}
        />
      </svg>

      <p
        className="text-sm font-black transition-opacity duration-500"
        style={{ color: accent, opacity: frameDone ? 1 : 0 }}
      >
        チタン眼鏡フレーム 完成！
      </p>
      <p className="text-xs text-gray-300 transition-opacity duration-500" style={{ opacity: frameDone ? 1 : 0 }}>
        ゴムのように曲がるチタン眼鏡は、材料工学科の卒業生が実現させた製品です
      </p>
    </div>
  )
}
