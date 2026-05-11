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
  const touchStartY = useRef(0)

  const handleJump = useCallback(() => {
    engineRef.current?.jump()
  }, [])

  const handleSlide = useCallback(() => {
    engineRef.current?.slide()
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
      if (e.code === 'ArrowDown') {
        e.preventDefault()
        handleSlide()
      }
    }

    const onTouchStart = (e: TouchEvent) => {
      touchStartY.current = e.touches[0].clientY
    }

    const onTouchEnd = (e: TouchEvent) => {
      const dy = e.changedTouches[0].clientY - touchStartY.current
      if (dy > 40) {
        handleSlide()
      } else {
        handleJump()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    canvas.addEventListener('touchstart', onTouchStart, { passive: true })
    canvas.addEventListener('touchend', onTouchEnd)

    return () => {
      engine.destroy()
      window.removeEventListener('keydown', onKeyDown)
      canvas.removeEventListener('touchstart', onTouchStart)
      canvas.removeEventListener('touchend', onTouchEnd)
    }
  }, [started, onGameOver, handleJump, handleSlide])

  if (!started) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen gap-6 px-4 text-center">
        <div>
          <p className="text-gray-400 text-sm mb-1">プレイヤー</p>
          <p className="text-2xl font-black">{nickname}</p>
        </div>
        <div className="text-gray-400 text-sm space-y-1">
          <p>⌨ スペース / ↑ ：ジャンプ（二段ジャンプあり）</p>
          <p>⌨ ↓ ：スライディング</p>
          <p>📱 タップ：ジャンプ　スワイプ下：スライディング</p>
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
      <div className="flex gap-6 sm:hidden">
        <button
          onPointerDown={handleJump}
          className="flex-1 py-5 bg-blue-600 active:bg-blue-500 text-white font-black text-xl rounded-2xl"
        >
          ジャンプ
        </button>
        <button
          onPointerDown={handleSlide}
          className="flex-1 py-5 bg-gray-700 active:bg-gray-600 text-white font-black text-xl rounded-2xl"
        >
          スライド
        </button>
      </div>
      <p className="text-gray-600 text-xs hidden sm:block">
        スペース / クリック: ジャンプ　↓: スライド
      </p>
    </main>
  )
}
