import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { GameEngine, STEP_MS } from '@/lib/game/engine'
import { STAGE_LENGTH } from '@/lib/game/constants'

const noop = () => {}

describe('GameEngine（ロジック）', () => {
  it('同じシードなら同じ展開になる（再現性）', () => {
    const run = () => {
      const e = new GameEngine(null, 3, noop, { seed: 42, silent: true })
      for (let i = 0; i < 600; i++) { if (i % 37 === 0) e.jump(); e.step() }
      const s = e.snapshot
      return { p: s.stageProgress, m: s.missCount, o: s.obstacles.map(o => [o.shape, Math.round(o.stageX)]) }
    }
    expect(run()).toEqual(run())
  })

  it('clone() は元のエンジンに影響しない', () => {
    const e = new GameEngine(null, 2, noop, { seed: 7, silent: true })
    for (let i = 0; i < 200; i++) e.step()
    const before = e.snapshot.stageProgress
    const c = e.clone()
    for (let i = 0; i < 300; i++) c.step()
    expect(e.snapshot.stageProgress).toBe(before)
    expect(c.snapshot.stageProgress).toBeGreaterThan(before)
    // 複製しても同じ未来になる（乱数とスポーナーの状態も複製される）
    const c2 = e.clone()
    for (let i = 0; i < 300; i++) c2.step()
    expect(c2.snapshot.stageProgress).toBe(c.snapshot.stageProgress)
  })

  it('タイマーはステップ数 × 1/60 秒', () => {
    const e = new GameEngine(null, 2, noop, { seed: 1, silent: true })
    for (let i = 0; i < 120; i++) e.step()
    expect(e.snapshot.elapsedMs).toBeCloseTo(120 * STEP_MS, 6)
  })

  it('電気電子：何もしないと充電切れでミスになる', () => {
    const e = new GameEngine(null, 2, noop, { seed: 1, silent: true })
    for (let i = 0; i < 60 * 12; i++) e.step()
    expect(e.snapshot.missCount).toBeGreaterThan(0)
    // ミス中（ヒットストップ・MISSオーバーレイ）もタイマーが進むため、総ステップ数 × STEP_MS と一致する
    expect(e.snapshot.elapsedMs).toBeCloseTo(60 * 12 * STEP_MS, 4)
  })

  it('生物応化：浮上し続けると天井にぶつかってミスになる', () => {
    const e = new GameEngine(null, 4, noop, { seed: 1, silent: true })
    e.setThrust(true)
    for (let i = 0; i < 120; i++) e.step()
    expect(e.snapshot.missCount).toBeGreaterThan(0)
  })

  it('一時停止中はジャンプも浮上も受け付けない', () => {
    globalThis.cancelAnimationFrame ??= noop
    const e = new GameEngine(null, 4, noop, { seed: 1, silent: true })
    e.pause()
    e.setThrust(true)
    expect(e.snapshot.thrustHeld).toBe(false)
    expect(e.paused).toBe(true)
  })
})

describe('固定タイムステップ（requestAnimationFrame の頻度に依らない）', () => {
  let queue: FrameRequestCallback[] = []
  beforeEach(() => {
    queue = []
    globalThis.requestAnimationFrame = (cb: FrameRequestCallback) => { queue.push(cb); return queue.length }
    globalThis.cancelAnimationFrame = () => { queue = [] }
  })
  afterEach(() => { queue = [] })

  // hz の画面で seconds 秒動かしたときの update 回数
  function framesAfter(hz: number, seconds: number, jitter = 0): number {
    const e = new GameEngine(null, 2, noop, { seed: 1, silent: true })
    e.start()
    let t = 1000
    for (let i = 0; i < hz * seconds; i++) {
      const cb = queue.shift()
      if (!cb) break
      t += 1000 / hz + (jitter ? (i % 2 ? jitter : -jitter) : 0)
      cb(t)
    }
    e.destroy()
    return e.snapshot.frame
  }

  it.each([[30], [60], [90], [120], [144]])('%iHz でも1秒あたり約60ステップ', (hz) => {
    expect(Math.abs(framesAfter(hz, 3) - 180)).toBeLessThanOrEqual(2)
  })

  it('60Hz でタイミングが揺れても 1フレーム1ステップのまま（カクつかない）', () => {
    expect(Math.abs(framesAfter(60, 3, 1.5) - 180)).toBeLessThanOrEqual(2)
  })

  it('処理落ち（10fps）でもスローにはなるが暴走しない（1フレーム最大5ステップ）', () => {
    expect(framesAfter(10, 3)).toBeLessThanOrEqual(5 * 30)
  })
})

describe('ステージ', () => {
  it('ゴールに着くと cleared になり、それ以上進まない', () => {
    const e = new GameEngine(null, 2, noop, { seed: 1, silent: true })
    // 内部状態を直接進めて、ゴール直前から始める
    ;(e as unknown as { stageProgress: number }).stageProgress = STAGE_LENGTH - 20
    for (let i = 0; i < 10; i++) e.step()
    expect(e.snapshot.cleared).toBe(true)
    const t = e.snapshot.elapsedMs
    e.step()
    expect(e.snapshot.elapsedMs).toBe(t)
  })
})
