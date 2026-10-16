import { cache } from 'react'
import { createServerClient } from '@/lib/supabase-server'
import { isUuid } from '@/lib/uuid'

export interface ClearRecord {
  id: string
  nickname: string
  department: number
  clear_time_ms: number
  played_at: string
  rank: number
}

/**
 * シェアページ用にクリア記録を1件読む（非表示・存在しない・DBエラーは null）。
 * 同じリクエスト内（generateMetadata とページ本体）では1回だけ DB に問い合わせる。
 */
export const getClear = cache(async (id: string): Promise<ClearRecord | null> => {
  if (!isUuid(id)) return null
  try {
    const { data, error } = await createServerClient().rpc('get_clear', { p_id: id })
    if (error || !Array.isArray(data) || data.length === 0) return null
    return data[0] as ClearRecord
  } catch {
    return null
  }
})
