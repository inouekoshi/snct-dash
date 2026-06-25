import { NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const departmentParam = searchParams.get('department')
  const department = departmentParam ? parseInt(departmentParam, 10) : NaN

  if (!Number.isInteger(department) || department < 1 || department > 5) {
    return Response.json({ error: 'Invalid department (1〜5)' }, { status: 400 })
  }

  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('stage_clears')
    .select('id, nickname, department, clear_time_ms, played_at')
    .eq('department', department)
    .order('clear_time_ms', { ascending: true })
    .limit(10)

  if (error) {
    console.error('Supabase fetch error:', error)
    return Response.json({ error: 'Failed to fetch leaderboard' }, { status: 500 })
  }

  return Response.json({ entries: data ?? [] })
}
