'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { GameEngine } from '@/lib/game/engine'
import { AREAS, type AreaId } from '@/lib/game/areas'
import { STAGE_INFO } from '@/lib/game/stage-info'
import type { GameClearResult } from '@/lib/types'

interface GameProps {
  nickname: string
  departmentId: number
  /** true ならブリーフィング画面を飛ばしてすぐ始める（「もう一度」「最初から」用） */
  autoStart?: boolean
  onStart: () => void
  onClear: (result: GameClearResult) => void
  onRestart: () => void
  onQuit: () => void
}

// E2E テスト用のフック（NEXT_PUBLIC_E2E=1 でビルドしたときだけ有効。本番ビルドでは消える）
declare global {
  interface Window {
    __kosendash?: { engine: GameEngine; autopilot: () => Promise<void> }
  }
}

export default function Game({ nickname, departmentId, autoStart = false, onStart, onClear, onRestart, onQuit }: GameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<GameEngine | null>(null)
  const [started, setStarted] = useState(autoStart)
  const [isPortrait, setIsPortrait] = useState(false)
  const [paused, setPaused] = useState(false)
  // 生物応用化学科（液体スイム）だけは長押しで浮上する操作。他学科はタップでジャンプ。
  const isSwim = departmentId === 4

  // autoStart のときはマウント時にプレイ開始を通知する
  const startNotified = useRef(false)
  useEffect(() => {
    if (started && !startNotified.current) {
      startNotified.current = true
      onStart()
    }
  }, [started, onStart])

  const handleJump = useCallback(() => {
    engineRef.current?.jump()
  }, [])

  const setEnginePaused = useCallback((next: boolean) => {
    const engine = engineRef.current
    if (!engine) return
    if (next) engine.pause()
    else engine.resume()
    setPaused(engine.paused)
  }, [])

  const handlePause = useCallback(() => {
    const engine = engineRef.current
    if (engine) setEnginePaused(!engine.paused)
  }, [setEnginePaused])

  useEffect(() => {
    if (!started) return
    const mql = window.matchMedia('(orientation: portrait)')
    const update = () => setIsPortrait(mql.matches)
    update()
    mql.addEventListener('change', update)
    return () => mql.removeEventListener('change', update)
  }, [started])

  // 縦向きにしている間は止めておく（「横向きにしてください」の裏で進まないように）
  useEffect(() => {
    if (isPortrait) setEnginePaused(true)
  }, [isPortrait, setEnginePaused])

  useEffect(() => {
    if (!started) return
    type ExtOrientation = ScreenOrientation & { lock?: (o: string) => Promise<void> }
    const ori = screen.orientation as ExtOrientation
    if (ori?.lock) ori.lock('landscape').catch(() => {})
    return () => { if (ori?.unlock) ori.unlock() }
  }, [started])

  useEffect(() => {
    if (!started || !canvasRef.current) return

    const canvas = canvasRef.current
    const engine = new GameEngine(canvas, departmentId, onClear)
    engineRef.current = engine
    engine.start()

    if (process.env.NEXT_PUBLIC_E2E === '1') {
      window.__kosendash = {
        engine,
        autopilot: async () => {
          const { Autopilot } = await import('@/lib/game/autopilot')
          const pilot = new Autopilot(engine)
          engine.setBeforeStep(() => pilot.act())
        },
      }
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault()
        if (e.repeat) return
        if (isSwim) engine.setThrust(true)
        else handleJump()
      }
      if (e.code === 'Escape' || e.code === 'KeyP') {
        e.preventDefault(); handlePause()
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (isSwim && (e.code === 'Space' || e.code === 'ArrowUp')) engine.setThrust(false)
    }
    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault()
      if (isSwim) engine.setThrust(true)
      else handleJump()
    }
    const onTouchEnd = () => { if (isSwim) engine.setThrust(false) }
    const onPointerDown = (e: PointerEvent) => {
      // タッチは touchstart で処理済み。マウスのクリックだけここで扱う
      if (e.pointerType === 'touch') return
      if (isSwim) engine.setThrust(true)
      else handleJump()
    }
    const onPointerUp = () => { if (isSwim) engine.setThrust(false) }
    const onBlur = () => { if (isSwim) engine.setThrust(false) }
    // 別のアプリやタブに切り替えたら一時停止（戻ってきたら「再開」を押して続ける）
    const onVisibility = () => {
      if (document.hidden && !engine.paused) {
        engine.pause()
        setPaused(true)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)
    document.addEventListener('visibilitychange', onVisibility)
    canvas.addEventListener('touchstart', onTouchStart, { passive: false })
    canvas.addEventListener('touchend', onTouchEnd)
    canvas.addEventListener('touchcancel', onTouchEnd)
    canvas.addEventListener('pointerdown', onPointerDown)
    canvas.addEventListener('pointerup', onPointerUp)
    canvas.addEventListener('pointerleave', onPointerUp)

    return () => {
      engine.destroy()
      engineRef.current = null
      if (window.__kosendash?.engine === engine) delete window.__kosendash
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
      document.removeEventListener('visibilitychange', onVisibility)
      canvas.removeEventListener('touchstart', onTouchStart)
      canvas.removeEventListener('touchend', onTouchEnd)
      canvas.removeEventListener('touchcancel', onTouchEnd)
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointerup', onPointerUp)
      canvas.removeEventListener('pointerleave', onPointerUp)
    }
  }, [started, departmentId, isSwim, onClear, handleJump, handlePause])

  if (!started) {
    const theme = AREAS[departmentId as AreaId] ?? AREAS[1]
    const info = STAGE_INFO[departmentId] ?? STAGE_INFO[1]
    const accent = theme.groundLineColor

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
                : '⌨ スペース / ↑ ・ 📱 タップ：ジャンプ（二段ジャンプあり）'}
            </p>
            <p className="text-xs text-gray-400 mt-1">⚠ 障害物はノックバック（後退）だけ。ゲームオーバーなし！</p>
          </div>
        </div>

        <button
          onClick={() => setStarted(true)}
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

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gray-950 select-none overflow-hidden">
      {isPortrait && (
        <div className="fixed inset-0 z-50 bg-gray-950 flex flex-col items-center justify-center gap-6">
          <div className="text-6xl" style={{ display: 'inline-block', transform: 'rotate(90deg)' }}>
            📱
          </div>
          <p className="text-white text-2xl font-black">横向きにしてください</p>
          <p className="text-gray-400 text-sm">ゲームは横向きでプレイできます</p>
        </div>
      )}
      <div className="relative w-full max-w-3xl">
        <canvas
          ref={canvasRef}
          className="w-full rounded-xl border border-gray-800 touch-none"
          style={{ imageRendering: 'pixelated' }}
          data-testid="game-canvas"
        />
        {paused && !isPortrait && (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl">
            <div className="flex flex-col gap-2 w-48 mt-[12%]">
              <button
                onClick={() => setEnginePaused(false)}
                className="py-2.5 bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-black rounded-xl"
              >
                ▶ 再開
              </button>
              <button
                onClick={onRestart}
                className="py-2 bg-gray-800/90 hover:bg-gray-700 text-white font-bold rounded-xl border border-gray-600 text-sm"
              >
                ↺ 最初からやり直す
              </button>
              <button
                onClick={onQuit}
                className="py-2 bg-gray-800/90 hover:bg-gray-700 text-white font-bold rounded-xl border border-gray-600 text-sm"
              >
                学科選択に戻る
              </button>
            </div>
          </div>
        )}
        {!paused && (
          <button
            onClick={handlePause}
            className="absolute bottom-2 right-2 px-3 py-1.5 bg-black/60 hover:bg-black/80 text-white text-sm font-bold rounded-lg border border-gray-600 transition-colors"
          >
            ⏸ 一時停止
          </button>
        )}
      </div>
      <p className="text-gray-600 text-xs mt-4 sm:hidden">
        {isSwim ? 'タップ長押し：浮上（離すと沈む）｜⏸ボタンで一時停止' : 'タップでジャンプ（二段ジャンプあり）｜⏸ボタンで一時停止'}
      </p>
      <p className="text-gray-600 text-xs mt-4 hidden sm:block">
        {isSwim ? 'スペース / 上キー長押し: 浮上（離すと沈む）｜P / Esc: 一時停止' : 'スペース / クリック: ジャンプ（二段ジャンプあり）｜P / Esc: 一時停止'}
      </p>
    </main>
  )
}
