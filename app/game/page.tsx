'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Game from '@/components/Game'
import DepartmentSelect from '@/components/DepartmentSelect'
import ResultModal from '@/components/ResultModal'
import type { GameClearResult } from '@/lib/types'

type Phase = 'department' | 'playing' | 'result'

export default function GamePage() {
  const router = useRouter()
  const [isMounted, setIsMounted] = useState(false)
  const [phase, setPhase] = useState<Phase>('department')
  const [nickname, setNickname] = useState('')
  const [departmentId, setDepartmentId] = useState<number>(1)
  const [result, setResult] = useState<GameClearResult | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem('snct_nickname')
    if (!saved) {
      router.push('/')
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNickname(saved)
      setIsMounted(true)
    }
  }, [router])

  if (!isMounted) return null

  function handleDepartmentSelect(id: number) {
    setDepartmentId(id)
    setPhase('playing')
  }

  function handleClear(clearResult: GameClearResult) {
    setResult(clearResult)
    setPhase('result')
  }

  if (phase === 'department') {
    return (
      <DepartmentSelect
        onSelect={handleDepartmentSelect}
        onBack={() => router.push('/')}
      />
    )
  }

  if (phase === 'result' && result) {
    return (
      <ResultModal
        nickname={nickname}
        result={result}
        onRetry={() => setPhase('department')}
        onHome={() => router.push('/')}
        onLeaderboard={() => router.push(`/leaderboard?department=${result.departmentId}`)}
      />
    )
  }

  return (
    <Game
      nickname={nickname}
      departmentId={departmentId}
      onClear={handleClear}
    />
  )
}
