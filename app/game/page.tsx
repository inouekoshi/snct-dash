'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Game from '@/components/Game'
import ResultModal from '@/components/ResultModal'
import type { GameResult } from '@/lib/types'

type Phase = 'nickname' | 'playing' | 'result'

export default function GamePage() {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('nickname')
  const [nickname, setNickname] = useState('')
  const [result, setResult] = useState<GameResult | null>(null)

  function handleStart(e: React.FormEvent) {
    e.preventDefault()
    if (nickname.trim().length === 0) return
    setPhase('playing')
  }

  function handleGameOver(gameResult: GameResult) {
    setResult(gameResult)
    setPhase('result')
  }

  if (phase === 'nickname') {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen gap-6 px-4">
        <h2 className="text-3xl font-black">ニックネームを入力</h2>
        <p className="text-gray-400 text-sm">ランキングに表示される名前（最大20文字）</p>
        <form onSubmit={handleStart} className="flex flex-col gap-4 w-full max-w-xs">
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value.slice(0, 20))}
            placeholder="例: 高専太郎"
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white text-lg focus:outline-none focus:border-yellow-400"
            autoFocus
          />
          <button
            type="submit"
            disabled={nickname.trim().length === 0}
            className="w-full py-4 bg-yellow-400 hover:bg-yellow-300 disabled:bg-gray-600 disabled:cursor-not-allowed text-gray-950 font-black text-xl rounded-2xl transition-colors"
          >
            スタート！
          </button>
          <button
            type="button"
            onClick={() => router.push('/')}
            className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
          >
            タイトルに戻る
          </button>
        </form>
      </main>
    )
  }

  if (phase === 'result' && result) {
    return (
      <ResultModal
        nickname={nickname}
        result={result}
        onRetry={() => setPhase('playing')}
        onHome={() => router.push('/')}
        onLeaderboard={() => router.push('/leaderboard')}
      />
    )
  }

  return (
    <Game nickname={nickname} onGameOver={handleGameOver} />
  )
}
