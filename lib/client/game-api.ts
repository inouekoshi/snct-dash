import type { ApiError, ApiErrorCode, StageClearEntry, StartRunResponse, SubmitClearResponse } from '@/lib/types'

// ブラウザから API を呼ぶ関数。失敗しても例外は投げず、結果オブジェクトで返す。

export type Result<T> = { ok: true; data: T } | { ok: false; code: ApiErrorCode; message: string }

async function post<T>(url: string, body: unknown, timeoutMs = 10_000): Promise<Result<T>> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    })
    const json = await res.json().catch(() => null)
    if (res.ok) return { ok: true, data: json as T }
    const err = json as Partial<ApiError> | null
    return { ok: false, code: err?.code ?? 'server_error', message: err?.error ?? '通信に失敗しました' }
  } catch {
    return { ok: false, code: 'server_error', message: '通信に失敗しました。電波の良いところでもう一度試してね' }
  }
}

/**
 * プレイ開始を登録して runId を得る（ゲームはこの完了を待たずに始まる）。通信エラーは少し待って2回まで再試行する。
 * サーバーは「開始からの経過時間」でクリアタイムを検証するので、ゲーム開始から何ms後に送ったかも伝える
 * （サーバー側で最大30秒に切り詰める）。
 */
export async function startRun(department: number): Promise<string | null> {
  const startedAt = performance.now()
  for (let attempt = 0; attempt < 3; attempt++) {
    const startedAgoMs = Math.round(performance.now() - startedAt)
    const r = await post<StartRunResponse>('/api/runs', { department, startedAgoMs }, 8_000)
    if (r.ok) return r.data.runId
    if (r.code !== 'server_error') return null // レート制限などは再試行しない
    await new Promise(resolve => setTimeout(resolve, 800 * (attempt + 1)))
  }
  return null
}

export function submitClear(params: {
  runId: string; nickname: string; clearTimeMs: number; misses: number
}): Promise<Result<SubmitClearResponse>> {
  return post<SubmitClearResponse>('/api/stage-clears', {
    runId: params.runId,
    nickname: params.nickname,
    clear_time_ms: params.clearTimeMs,
    misses: params.misses,
  })
}

export async function fetchLeaderboard(department: number): Promise<StageClearEntry[] | null> {
  try {
    const res = await fetch(`/api/leaderboard?department=${department}`, { cache: 'no-store' })
    if (!res.ok) return null
    const { entries } = await res.json()
    return entries as StageClearEntry[]
  } catch {
    return null
  }
}
