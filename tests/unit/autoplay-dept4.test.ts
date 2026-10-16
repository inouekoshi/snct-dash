import { describe, it, expect } from 'vitest'
import { GameEngine } from '@/lib/game/engine'
import { autoplay } from '@/lib/game/autopilot'
import { MIN_CLEAR_TIME_MS } from '@/lib/game/limits'

// 自動プレイでステージを最後まで走り切れる（詰まない）こと、
// そしてそのクリアタイムがサーバーの下限（不正判定）に引っかからないことを確かめる。
describe('学科4 を自動プレイでクリアできる', () => {
  it.each([11, 22])('seed %i', (seed) => {
    const engine = new GameEngine(null, 4, () => {}, { seed, silent: true })
    const r = autoplay(engine, 60 * 60 * 8)
    expect(r.cleared).toBe(true)
    expect(r.timeMs).toBeGreaterThanOrEqual(MIN_CLEAR_TIME_MS[4])
    expect(r.timeMs).toBeLessThan(5 * 60 * 1000)
  }, 600_000)
})
