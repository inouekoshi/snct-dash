'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { GameEngine } from '@/lib/game/engine'
import type { GameResult } from '@/lib/types'

interface GameProps {
  nickname: string
  onGameOver: (result: GameResult) => void
}

export default function Game({ nickname, onGameOver }: GameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<GameEngine | null>(null)
  const [started, setStarted] = useState(false)

  const handleJump = useCallback(() => {
    engineRef.current?.jump()
  }, [])

  useEffect(() => {
    if (!started || !canvasRef.current) return

    const canvas = canvasRef.current
    const engine = new GameEngine(canvas, onGameOver)
    engineRef.current = engine
    engine.start()

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault()
        handleJump()
      }
    }

    const onTouchEnd = () => handleJump()

    window.addEventListener('keydown', onKeyDown)
    canvas.addEventListener('touchend', onTouchEnd)

    return () => {
      engine.destroy()
      window.removeEventListener('keydown', onKeyDown)
      canvas.removeEventListener('touchend', onTouchEnd)
    }
  }, [started, onGameOver, handleJump])

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
          <p className="text-cyan-400 font-bold">🛡 シールドシステム</p>
          <p className="text-gray-300">1回まで障害物に当たっても大丈夫！</p>
          <p className="text-gray-400">💎 シールドアイテムで回復できます</p>
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
    <main className="flex flex-col items-center justify-center min-h-screen bg-gray-950 gap-4 select-none">
      <canvas
        ref={canvasRef}
        className="w-full max-w-3xl rounded-xl border border-gray-800 touch-none"
        style={{ imageRendering: 'pixelated' }}
        onClick={handleJump}
      />
      <p className="text-gray-600 text-xs sm:hidden">タップでジャンプ（二段ジャンプあり）</p>
      <p className="text-gray-600 text-xs hidden sm:block">スペース / クリック: ジャンプ（二段ジャンプあり）</p>
    </main>
  )
}
