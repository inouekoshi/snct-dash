import { NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

const MAX_SCORE = 999999

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { nickname, score, distance, max_area } = body as Record<string, unknown>

  if (typeof nickname !== 'string' || nickname.trim().length === 0 || nickname.length > 20) {
    return Response.json({ error: 'Invalid nickname' }, { status: 400 })
  }
  if (typeof score !== 'number' || !Number.isInteger(score) || score < 0 || score > MAX_SCORE) {
    return Response.json({ error: 'Invalid score' }, { status: 400 })
  }
  if (typeof distance !== 'number' || !Number.isInteger(distance) || distance < 0) {
    return Response.json({ error: 'Invalid distance' }, { status: 400 })
  }
  if (typeof max_area !== 'number' || !Number.isInteger(max_area) || max_area < 1 || max_area > 5) {
    return Response.json({ error: 'Invalid max_area' }, { status: 400 })
  }

  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('scores')
    .insert({ nickname: nickname.trim(), score, distance, max_area })
    .select('id')
    .single()

  if (error) {
    console.error('Supabase insert error:', error)
    return Response.json({ error: 'Failed to save score' }, { status: 500 })
  }

  return Response.json({ id: data.id }, { status: 201 })
}
