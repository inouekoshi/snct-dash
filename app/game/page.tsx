'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Game from '@/components/Game'
import DepartmentSelect from '@/components/DepartmentSelect'
import ResultModal from '@/components/ResultModal'
import { startRun } from '@/lib/client/game-api'
import { isUnderMaintenance } from '@/lib/maintenance'
import { NICKNAME_STORAGE_KEY } from '@/lib/nickname'
import type { GameClearResult } from '@/lib/types'

type Phase = 'department' | 'playing' | 'result'

export default function GamePage() {
  const router = useRouter()
  const [isMounted, setIsMounted] = useState(false)
  const [phase, setPhase] = useState<Phase>('department')
  const [nickname, setNickname] = useState('')
  const [departmentId, setDepartmentId] = useState<number>(1)
  const [result, setResult] = useState<GameClearResult | null>(null)
  // 「もう一度」「最初から」でゲームを作り直すためのキー（変わると Game が再マウントされる）
  const [playKey, setPlayKey] = useState(0)
  const [autoStart, setAutoStart] = useState(false)
  // スタート時に発行するプレイID（クリア登録に必要）。結果画面で待ち合わせる
  const [runId, setRunId] = useState<Promise<string | null> | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem(NICKNAME_STORAGE_KEY)
    if (!saved) {
      router.replace('/')
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNickname(saved)
      setIsMounted(true)
    }
  }, [router])

  const handleStart = useCallback(() => {
    setRunId(startRun(departmentId))
  }, [departmentId])

  const handleClear = useCallback((clearResult: GameClearResult) => {
    setResult(clearResult)
    setPhase('result')
  }, [])

  const playAgain = useCallback(() => {
    setPlayKey(k => k + 1)
    setAutoStart(true)
    setPhase('playing')
  }, [])

  const backToSelect = useCallback(() => {
    setRunId(null)
    setPhase('department')
  }, [])

  if (!isMounted) return null

  if (phase === 'department') {
    return (
      <DepartmentSelect
        onSelect={id => {
          if (isUnderMaintenance(id)) return
          setDepartmentId(id)
          setAutoStart(false)
          setPlayKey(k => k + 1)
          setPhase('playing')
        }}
        onBack={() => router.push('/')}
      />
    )
  }

  if (phase === 'result' && result) {
    return (
      <ResultModal
        key={playKey}
        nickname={nickname}
        result={result}
        runId={runId ?? Promise.resolve(null)}
        onRetry={playAgain}
        onSelectDepartment={backToSelect}
        onHome={() => router.push('/')}
        onLeaderboard={() => router.push(`/leaderboard?department=${result.departmentId}`)}
      />
    )
  }

  return (
    <Game
      key={playKey}
      nickname={nickname}
      departmentId={departmentId}
      autoStart={autoStart}
      onStart={handleStart}
      onClear={handleClear}
      onRestart={playAgain}
      onQuit={backToSelect}
    />
  )
}
