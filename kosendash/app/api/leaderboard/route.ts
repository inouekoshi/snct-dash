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
    if (festivalDate) {
      const start = `${festivalDate}T00:00:00.000Z`
      const end = `${festivalDate}T23:59:59.999Z`
      query = query.gte('created_at', start).lte('created_at', end).limit(10)
    } else {
      query = query.limit(10)
    }
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
