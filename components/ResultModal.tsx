'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { GameClearResult, SubmitClearResponse, ApiErrorCode } from '@/lib/types'
import { AREAS } from '@/lib/game/areas'
import type { AreaId } from '@/lib/game/areas'
import { submitClear } from '@/lib/client/game-api'
import { formatTime } from '@/lib/format'
import { clearNickname } from '@/lib/client/nickname-store'
import MatProductReveal from './MatProductReveal'
import ShareButtons from './ShareButtons'
import SponsorCredit from './SponsorCredit'

interface Props {
  nickname: string
  result: GameClearResult
  /** スタート時に発行されたプレイID（発行に失敗していれば null） */
  runId: Promise<string | null>
  onRetry: () => void
  onSelectDepartment: () => void
  onHome: () => void
  onLeaderboard: () => void
}

type SubmitState =
  | { status: 'submitting' }
  | { status: 'done'; data: SubmitClearResponse }
  // retryable: 通信エラーで、送り直せば登録できる見込みがあるとき
  | { status: 'error'; code: ApiErrorCode; message: string; retryable: boolean }

export default function ResultModal({ nickname, result, runId, onRetry, onSelectDepartment, onHome, onLeaderboard }: Props) {
  const [state, setState] = useState<SubmitState>({ status: 'submitting' })
  const submitted = useRef(false)
  const theme = AREAS[result.departmentId as AreaId]

  const submit = useCallback(async () => {
    const id = await runId
    if (!id) {
      // プレイ開始の登録ができていないので、送り直しても受け付けられない
      setState({ status: 'error', code: 'server_error', message: '通信できなかったため、今回の記録は登録されませんでした', retryable: false })
      return
    }
    const r = await submitClear({ runId: id, nickname, clearTimeMs: result.timeMs, misses: result.misses })
    setState(r.ok
      ? { status: 'done', data: r.data }
      : { status: 'error', code: r.code, message: r.message, retryable: r.code === 'server_error' })
  }, [nickname, result, runId])

  useEffect(() => {
    // 開発時の StrictMode（effect の二重実行）でも1回しか登録しない
    if (submitted.current) return
    submitted.current = true
    submit()
  }, [submit])

  function retrySubmit() {
    setState({ status: 'submitting' })
    submit()
  }

  function changeName() {
    clearNickname()
    onHome()
  }

  return (
    <main className="relative flex flex-col items-center justify-center min-h-svh gap-5 px-4 pt-8 pb-14 text-center">
      <div className="space-y-1">
        <p className="text-yellow-400 font-bold tracking-widest text-lg">STAGE CLEAR!</p>
        <h2 className="text-2xl font-black wrap-anywhere">{nickname} さんのタイム</h2>
      </div>

      <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-xs space-y-4" data-testid="result-card">
        <div>
          <p className="text-gray-400 text-sm">{theme.emoji} {theme.name}</p>
          <p className="text-5xl font-black text-yellow-400 mt-1 tabular-nums" data-testid="clear-time">
            {formatTime(result.timeMs)}
          </p>
          {result.bonusMs && result.bonusMs > 0 && result.rawTimeMs && (
            <div className="mt-2 text-xs bg-gray-900/80 rounded-lg p-2.5 text-gray-300 space-y-1 border border-gray-700/50">
              <div className="flex justify-between items-center text-gray-400">
                <span>走行タイム</span>
                <span className="font-mono">{formatTime(result.rawTimeMs)}</span>
              </div>
              <div className="flex justify-between items-center text-yellow-400 font-bold">
                <span>最大連続 {result.maxCombo} 回ボーナス</span>
                <span className="font-mono">-{(result.bonusMs / 1000).toFixed(1)}s</span>
              </div>
            </div>
          )}
          <p className="text-gray-500 text-xs mt-1">ミス {result.misses} 回</p>
        </div>

        {state.status === 'submitting' && <p className="text-gray-500 text-sm">登録中...</p>}

        {state.status === 'done' && (
          <div className="border-t border-gray-700 pt-4 space-y-1" data-testid="rank">
            {state.data.isPersonalBest ? (
              <p className="text-sm font-black text-pink-400">🎉 自己ベスト更新！</p>
            ) : (
              <p className="text-xs text-gray-400">自己ベスト {formatTime(state.data.bestMs)}</p>
            )}
            <p className="text-gray-400 text-sm">{state.data.isPersonalBest ? 'ランキング' : '今回のタイムなら'}</p>
            <p className="text-2xl font-black text-blue-400">
              {state.data.rank} 位 <span className="text-sm text-gray-400 font-bold">/ {state.data.totalPlayers}人中</span>
            </p>
          </div>
        )}

        {state.status === 'error' && (
          <div className="border-t border-gray-700 pt-4 space-y-2" role="alert">
            <p className="text-red-400 text-sm">{state.message}</p>
            {state.retryable && (
              <button
                onClick={retrySubmit}
                className="px-5 py-2 bg-gray-700 hover:bg-gray-600 text-white font-bold text-sm rounded-xl transition-colors"
              >
                もう一度送る
              </button>
            )}
            {state.code === 'nickname_rejected' && (
              <button onClick={changeName} className="text-sm underline text-gray-300">
                ニックネームを変える
              </button>
            )}
          </div>
        )}
      </div>

      {result.departmentId === 5 && <MatProductReveal accent={theme.groundLineColor} />}

      {state.status === 'done' && (
        <ShareButtons
          clearId={state.data.id}
          departmentName={theme.name}
          timeMs={result.timeMs}
          rank={state.data.rank}
        />
      )}

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          onClick={onRetry}
          className="w-full py-4 bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-black text-xl rounded-2xl transition-colors"
        >
          もう一度！
        </button>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onSelectDepartment}
            className="py-3 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-2xl transition-colors border border-gray-700 text-sm"
          >
            学科を選ぶ
          </button>
          <button
            onClick={onLeaderboard}
            className="py-3 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-2xl transition-colors border border-gray-700 text-sm"
          >
            ランキング 🏆
          </button>
        </div>
        <button
          onClick={onHome}
          className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
        >
          タイトルに戻る
        </button>
      </div>
      <SponsorCredit />
    </main>
  )
}
