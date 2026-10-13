import { NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { apiError, codeFromDbError } from '@/lib/server/api-error'
import { normalizeNickname } from '@/lib/nickname'
import { MAX_CLEAR_TIME_MS } from '@/lib/game/limits'
import type { SubmitClearResponse } from '@/lib/types'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// クリアタイム登録。検証（学科ごとの最短タイム・開始からの経過時間・1プレイ1回・NGワード）は
// DB関数 submit_clear() が行う（API を通さず直接呼ばれても同じ検証がかかるように）。
// ここでは形式だけを見て、明らかにおかしいものを DB に送らずに返す。
export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return apiError('invalid_request')
  }
  const { runId, nickname, clear_time_ms, misses } = (body ?? {}) as Record<string, unknown>

  if (typeof runId !== 'string' || !UUID_RE.test(runId)) return apiError('run_not_found')
  if (typeof nickname !== 'string') return apiError('invalid_nickname')
  const name = normalizeNickname(nickname)
  if (!name) return apiError('invalid_nickname')
  if (typeof clear_time_ms !== 'number' || !Number.isInteger(clear_time_ms) || clear_time_ms <= 0 || clear_time_ms > MAX_CLEAR_TIME_MS) {
    return apiError('invalid_time')
  }

  try {
    const supabase = createServerClient()
    const { data, error } = await supabase.rpc('submit_clear', {
      p_run_id: runId,
      p_nickname: name,
      p_clear_time_ms: clear_time_ms,
      p_misses: typeof misses === 'number' && Number.isInteger(misses) ? misses : null,
    })
    const row = Array.isArray(data) ? data[0] : null
    if (error || !row) {
      const code = codeFromDbError(error)
      if (code === 'server_error') console.error('submit_clear error:', error)
      return apiError(code)
    }
    const res: SubmitClearResponse = {
      id: row.clear_id,
      rank: row.rank,
      bestMs: row.best_ms,
      isPersonalBest: row.is_personal_best,
      totalPlayers: row.total_players,
    }
    return Response.json(res, { status: 201 })
  } catch (e) {
    console.error('submit_clear unexpected error:', e)
    return apiError('server_error')
  }
}
