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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase env vars (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)')
    return Response.json({ error: 'Server misconfiguration: missing Supabase env vars' }, { status: 500 })
  }

  try {
    const supabase = createServerClient()
    const { error } = await supabase
      .from('stage_clears')
      .insert({ nickname: nickname.trim(), department, clear_time_ms })

    if (error) {
      console.error('Supabase insert error:', error.message, error.code)
      return Response.json({ error: error.message }, { status: 500 })
    }
  } catch (e) {
    console.error('Unexpected error:', e)
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }

  return Response.json({ ok: true }, { status: 201 })
}
