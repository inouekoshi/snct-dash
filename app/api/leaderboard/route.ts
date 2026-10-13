import { NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { apiError } from '@/lib/server/api-error'

// 学科別ランキング TOP10（同じニックネームは最速1件だけ。DB関数 get_leaderboard()）。
// 高専祭当日の負荷対策として、CDN に5秒キャッシュさせる（その後30秒は古い結果を返しつつ裏で更新）。
// クリア直後の自分の順位は POST /api/stage-clears のレスポンスで返すので、少し古くても困らない。
const CACHE_HEADERS = { 'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=30' }

export async function GET(request: NextRequest) {
  const departmentParam = request.nextUrl.searchParams.get('department')
  const department = departmentParam ? Number(departmentParam) : NaN
  if (!Number.isInteger(department) || department < 1 || department > 5) {
    return apiError('invalid_department')
  }

  try {
    const supabase = createServerClient()
    const { data, error } = await supabase.rpc('get_leaderboard', { p_department: department, p_limit: 10 })
    if (error) {
      console.error('get_leaderboard error:', error)
      return apiError('server_error')
    }
    return Response.json({ entries: data ?? [] }, { headers: CACHE_HEADERS })
  } catch (e) {
    console.error('get_leaderboard unexpected error:', e)
    return apiError('server_error')
  }
}
