import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { MIN_CLEAR_TIME_MS, MAX_CLEAR_TIME_MS, theoreticalMinClearMs, isValidClearTime } from '@/lib/game/limits'
import type { AreaId } from '@/lib/game/areas'

const DEPTS: AreaId[] = [1, 2, 3, 4, 5]

describe('クリアタイムの下限', () => {
  it.each(DEPTS)('学科%i：理論最短より短く、かつ近い（10%%以内）', (d) => {
    const theory = theoreticalMinClearMs(d)
    expect(MIN_CLEAR_TIME_MS[d]).toBeLessThan(theory)
    expect(MIN_CLEAR_TIME_MS[d]).toBeGreaterThan(theory * 0.9)
  })

  it('DB関数 min_clear_time_ms() の値が TypeScript と一致する', () => {
    const sql = readFileSync('supabase/migrations/20261013000100_runs_anticheat_leaderboard.sql', 'utf8')
    for (const d of DEPTS) {
      const m = sql.match(new RegExp(`when ${d} then (\\d+)`))
      expect(Number(m?.[1])).toBe(MIN_CLEAR_TIME_MS[d])
    }
    expect(sql).toContain(`clear_time_ms <= ${MAX_CLEAR_TIME_MS}`)
  })

  it('isValidClearTime', () => {
    expect(isValidClearTime(1, 105_000)).toBe(true)
    expect(isValidClearTime(1, 1)).toBe(false)
    expect(isValidClearTime(1, MAX_CLEAR_TIME_MS + 1)).toBe(false)
    expect(isValidClearTime(1, 105_000.5)).toBe(false)
  })
})
