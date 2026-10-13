import { createServerClient } from '@/lib/supabase-server'

export interface ClearRecord {
  id: string
  nickname: string
  department: number
  clear_time_ms: number
  played_at: string
  rank: number
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** シェアページ用にクリア記録を1件読む（非表示・存在しない・DBエラーは null） */
export async function getClear(id: string): Promise<ClearRecord | null> {
  if (!UUID_RE.test(id)) return null
  try {
    const { data, error } = await createServerClient().rpc('get_clear', { p_id: id })
    if (error || !Array.isArray(data) || data.length === 0) return null
    return data[0] as ClearRecord
  } catch {
    return null
  }
}
