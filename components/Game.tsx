'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { GameEngine } from '@/lib/game/engine'
import type { GameClearResult } from '@/lib/types'

interface GameProps {
  nickname: string
  departmentId: number
  onClear: (result: GameClearResult) => void
}

export default function Game({ nickname, departmentId, onClear }: GameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<GameEngine | null>(null)
  const [started, setStarted] = useState(false)
  const [isPortrait, setIsPortrait] = useState(false)
  const [paused, setPaused] = useState(false)

  const handleJump = useCallback(() => {
    engineRef.current?.jump()
  }, [])

  const handlePause = useCallback(() => {
    const engine = engineRef.current
    if (!engine) return
    engine.togglePause()
    setPaused(p => !p)
  }, [])

  useEffect(() => {
    if (!started) return
    const mql = window.matchMedia('(orientation: portrait)')
    const update = () => setIsPortrait(mql.matches)
    update()
    mql.addEventListener('change', update)
    return () => mql.removeEventListener('change', update)
  }, [started])

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

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault(); handleJump()
      }
      if (e.code === 'Escape' || e.code === 'KeyP') {
        e.preventDefault(); handlePause()
      }
    }
    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault(); handleJump()
    }

    window.addEventListener('keydown', onKeyDown)
    canvas.addEventListener('touchstart', onTouchStart, { passive: false })

    return () => {
      engine.destroy()
      window.removeEventListener('keydown', onKeyDown)
      canvas.removeEventListener('touchstart', onTouchStart)
    }
  }, [started, departmentId, onClear, handleJump, handlePause])

  if (!started) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen gap-6 px-4 text-center">
        <div>
          <p className="text-gray-400 text-sm mb-1">プレイヤー</p>
          <p className="text-2xl font-black">{nickname}</p>
        </div>
        <div className="text-gray-400 text-sm space-y-1">
          <p>⌨ スペース / ↑ ：ジャンプ（二段ジャンプあり）</p>
          <p>📱 タップ：ジャンプ</p>
        </div>
        <div className="bg-gray-800 rounded-xl px-4 py-3 text-sm space-y-1 w-full max-w-xs border border-gray-700">
          <p className="text-orange-400 font-bold">⚠ 障害物に当たるとノックバック！</p>
          <p className="text-gray-300">後退するだけ。諦めずにゴールを目指せ！</p>
          <p className="text-gray-400">穴に落ちても少し戻されるだけです</p>
        </div>
        <button
          onClick={() => setStarted(true)}
          className="px-10 py-5 bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-black text-2xl rounded-2xl transition-colors active:scale-95"
        >
          スタート！
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
          onClick={handleJump}
        />
        <button
          onClick={handlePause}
          className="absolute bottom-2 right-2 px-3 py-1.5 bg-black/60 hover:bg-black/80 text-white text-sm font-bold rounded-lg border border-gray-600 transition-colors"
        >
          {paused ? '▶ 再開' : '⏸ 一時停止'}
        </button>
      </div>
      <p className="text-gray-600 text-xs mt-4 sm:hidden">タップでジャンプ（二段ジャンプあり）｜⏸ボタンで一時停止</p>
      <p className="text-gray-600 text-xs mt-4 hidden sm:block">スペース / クリック: ジャンプ（二段ジャンプあり）｜P / Esc: 一時停止</p>
    </main>
  )
}
