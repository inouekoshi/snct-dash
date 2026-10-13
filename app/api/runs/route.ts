import { NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { apiError, codeFromDbError } from '@/lib/server/api-error'
import { clientKeyFrom, deviceFrom } from '@/lib/server/client-key'
import type { StartRunResponse } from '@/lib/types'

// プレイ開始（「スタート！」を押したとき）。クリア登録に必要な runId を発行する。
// runs テーブルはプレイ数・クリア率の集計（analytics スキーマ）にも使う。
export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return apiError('invalid_request')
  }
  const { department } = (body ?? {}) as Record<string, unknown>
  if (typeof department !== 'number' || !Number.isInteger(department) || department < 1 || department > 5) {
    return apiError('invalid_department')
  }

  try {
    const supabase = createServerClient()
    const { data, error } = await supabase.rpc('start_run', {
      p_department: department,
      p_client_key: clientKeyFrom(request.headers),
      p_device: deviceFrom(request.headers.get('user-agent')),
    })
    if (error || typeof data !== 'string') {
      const code = codeFromDbError(error)
      if (code === 'server_error') console.error('start_run error:', error)
      return apiError(code, code === 'rate_limited' ? { 'Retry-After': '60' } : undefined)
    }
    const res: StartRunResponse = { runId: data }
    return Response.json(res, { status: 201 })
  } catch (e) {
    console.error('start_run unexpected error:', e)
    return apiError('server_error')
  }
}
