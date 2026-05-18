import { NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const filter = searchParams.get('filter')

  const supabase = createServerClient()

  let query = supabase
    .from('scores')
    .select('id, nickname, score, distance, max_area, created_at')
    .order('score', { ascending: false })

  if (filter === 'today') {
    const festivalDate = process.env.FESTIVAL_DATE
    // FESTIVAL_DATE未設定時はJST(UTC+9)の本日を使用
    const now = new Date()
    const jstDate = new Date(now.getTime() + 9 * 60 * 60 * 1000)
    const dateStr = festivalDate ?? jstDate.toISOString().slice(0, 10)
    const start = `${dateStr}T00:00:00+09:00`
    const end = `${dateStr}T23:59:59.999+09:00`
    query = query.gte('created_at', start).lte('created_at', end).limit(10)
  } else {
    query = query.limit(20)
  }

  const { data, error } = await query

  if (error) {
    console.error('Supabase fetch error:', error)
    return Response.json({ error: 'Failed to fetch leaderboard' }, { status: 500 })
  }

  return Response.json({ scores: data ?? [] })
}
