'use client'

import { useEffect, useState } from 'react'

// 材料工学科のクリア演出：粗い粒の塊を叩いて、細かい粒の板になる絵を見せる。
// 絵は、教員の研究キーワード「結晶粒微細化」を表したもの。叩くと粒が細かくなる、とは書かない。
// （ゲームのキャンバスはクリア時に描画を止めるので、結果画面側で見せる）
export default function MatProductReveal({ accent }: { accent: string }) {
  const [step, setStep] = useState(0)

  useEffect(() => {
    const timers = [
      setTimeout(() => setStep(1), 300),
      setTimeout(() => setStep(2), 1100),
    ]
    return () => timers.forEach(clearTimeout)
  }, [])

  const done = step >= 2

  return (
    <div
      className="w-full max-w-xs rounded-2xl px-4 py-3 space-y-2"
      style={{ backgroundColor: `${accent}14`, border: `1px solid ${accent}40` }}
    >
      <svg viewBox="0 0 220 80" className="w-full h-20" aria-label="粗い粒の塊と、細かい粒の板">
        {/* 粗い粒の塊 */}
        <g style={{ opacity: step >= 1 ? 1 : 0, transition: 'opacity 0.4s' }}>
          <rect x="10" y="22" width="64" height="44" rx="6" fill="#d9482a" stroke="#ffd9a0" strokeWidth="2" />
          <path
            d="M32 22 L28 42 L42 52 L40 66 M28 42 L10 38 M42 52 L58 46 L54 22 M58 46 L74 50"
            fill="none" stroke="#5a0a05" strokeWidth="2" strokeLinejoin="round"
          />
          <text x="42" y="78" textAnchor="middle" fontSize="9" fill="#cccccc">粗い粒の塊</text>
        </g>

        <text x="110" y="48" textAnchor="middle" fontSize="18" fill="#aaaaaa" style={{ opacity: done ? 1 : 0, transition: 'opacity 0.4s' }}>›</text>

        {/* 細かい粒の板 */}
        <g style={{ opacity: done ? 1 : 0, transform: done ? 'translateY(0)' : 'translateY(-8px)', transition: 'opacity 0.5s, transform 0.5s' }}>
          <rect x="140" y="46" width="70" height="14" rx="3" fill="#cfd6e0" stroke="#ffffff" strokeWidth="1.5" />
          <path
            d={Array.from({ length: 13 }, (_, i) => `M${145 + i * 5} 47 L${147 + i * 5} 53 L${144 + i * 5} 59`).join(' ')}
            fill="none" stroke="#6d7888" strokeWidth="1"
          />
          <text x="175" y="78" textAnchor="middle" fontSize="9" fill="#cccccc">細かい粒の板</text>
        </g>
      </svg>

      <p
        className="text-sm font-black transition-opacity duration-500"
        style={{ color: accent, opacity: done ? 1 : 0 }}
      >
        叩いて板ができた！
      </p>
      <p className="text-xs text-gray-300 transition-opacity duration-500" style={{ opacity: done ? 1 : 0 }}>
        鈴鹿高専の材料工学科には、「加工熱処理」や「結晶粒微細化」を研究している先生がいます
      </p>
    </div>
  )
}
