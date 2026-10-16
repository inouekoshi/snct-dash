'use client'

import { AREAS, type AreaId } from '@/lib/game/areas'
import { STAGE_INFO } from '@/lib/game/stage-info'

interface StageBriefingProps {
  nickname: string
  departmentId: number
  onStartGame: () => void
  onQuit: () => void
}

export default function StageBriefing({
  nickname,
  departmentId,
  onStartGame,
  onQuit,
}: StageBriefingProps) {
  const theme = AREAS[departmentId as AreaId] ?? AREAS[1]
  const info = STAGE_INFO[departmentId] ?? STAGE_INFO[1]
  const accent = theme.groundLineColor
  const isSwim = departmentId === 4
  const isForge = departmentId === 5

  return (
    <main className="flex flex-col items-center justify-center min-h-screen gap-4 px-4 py-8 text-center overflow-y-auto">
      {/* 学科ヘッダー */}
      <div className="flex flex-col items-center gap-1">
        <span
          className="text-6xl leading-none"
          style={{ filter: `drop-shadow(0 0 12px ${accent}99)` }}
        >
          {theme.emoji}
        </span>
        <h2 className="text-3xl font-black tracking-wide" style={{ color: accent }}>
          {theme.name}
        </h2>
        <p
          className="text-base font-black px-3 py-0.5 rounded-full"
          style={{ color: accent, backgroundColor: `${accent}1f` }}
        >
          {info.catch}
        </p>
      </div>

      <p className="text-gray-500 text-xs">
        プレイヤー：<span className="text-white font-bold">{nickname}</span>
      </p>

      <div className="w-full max-w-sm space-y-3">
        {/* この学科は？ */}
        <div
          className="rounded-2xl px-4 py-3 text-left"
          style={{ backgroundColor: `${accent}14`, border: `1px solid ${accent}40` }}
        >
          <p className="text-xs font-black mb-1" style={{ color: accent }}>📖 この学科は？</p>
          <p className="text-sm text-gray-100 leading-relaxed">{info.about}</p>
        </div>

        {/* ステージの特徴 */}
        <div
          className="rounded-2xl px-4 py-3 text-left"
          style={{ backgroundColor: `${accent}14`, border: `1px solid ${accent}40` }}
        >
          <p className="text-xs font-black mb-1.5" style={{ color: accent }}>🎮 ステージの特徴</p>
          <ul className="space-y-1.5">
            {info.features.map((f, i) => (
              <li key={i} className="text-sm text-gray-100 flex gap-2 leading-snug">
                <span className="font-black shrink-0" style={{ color: accent }}>▸</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* 操作方法 */}
        <div className="rounded-2xl px-4 py-3 text-left bg-gray-800/70 border border-gray-700">
          <p className="text-xs font-black mb-1 text-gray-300">🕹 操作方法</p>
          <p className="text-sm text-gray-100">
            {isSwim
              ? '⌨ スペース / ↑ 長押し ・ 📱 画面タップ長押し：浮上（離すと沈む）'
              : isForge
                ? '⌨ スペース / ↑ ・ 📱 タップ：ハンマーでたたく（ジャンプはしない）'
                : '⌨ スペース / ↑ ・ 📱 タップ：ジャンプ（二段ジャンプあり）'}
          </p>
          <p className="text-xs text-gray-400 mt-1">⚠ 障害物はノックバック（後退）だけ。ゲームオーバーなし！</p>
        </div>
      </div>

      <button
        onClick={onStartGame}
        className="px-12 py-4 text-gray-950 font-black text-2xl rounded-2xl transition-transform active:scale-95 hover:brightness-110 shadow-lg"
        style={{ backgroundColor: accent, boxShadow: `0 8px 24px ${accent}55` }}
      >
        ▶ スタート！
      </button>
      <button onClick={onQuit} className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
        ← 学科選択に戻る
      </button>
    </main>
  )
}
