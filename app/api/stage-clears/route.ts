import { NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

const MAX_CLEAR_TIME_MS = 600_000 // 10分上限

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { nickname, department, clear_time_ms } = body as Record<string, unknown>

  if (
    typeof nickname !== 'string' ||
    nickname.trim().length === 0 ||
    nickname.length > 20
  ) {
    return Response.json({ error: 'Invalid nickname' }, { status: 400 })
  }
  if (
    typeof department !== 'number' ||
    !Number.isInteger(department) ||
    department < 1 ||
    department > 5
  ) {
    return Response.json({ error: 'Invalid department' }, { status: 400 })
  }
  if (
    typeof clear_time_ms !== 'number' ||
    !Number.isInteger(clear_time_ms) ||
    clear_time_ms <= 0 ||
    clear_time_ms > MAX_CLEAR_TIME_MS
  ) {
    return Response.json({ error: 'Invalid clear_time_ms' }, { status: 400 })
  }

  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('stage_clears')
    .insert({ nickname: nickname.trim(), department, clear_time_ms })
    .select('id')
    .single()

  if (error) {
    console.error('Supabase insert error:', error)
    return Response.json({ error: 'Failed to save clear time' }, { status: 500 })
  }

  return Response.json({ id: data.id }, { status: 201 })
}
