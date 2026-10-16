import { describe, it, expect } from 'vitest'
import { GameEngine } from '@/lib/game/engine'
import { Autopilot } from '@/lib/game/autopilot'
import {
  STAGE_LENGTH, SPEED_START, SPEED_END, PLAYER_X, FORGE_RING_OFFSET, FORGE_TIER_STEP, FORGE_TIER_MAX,
  FORGE_COOLDOWN, MAT_BOOST_MAX, FORGE_GOOD_EARLY,
} from '@/lib/game/constants'

const noop = () => {}

// 鍛えてカン！（学科5）の判定の単体テスト。
// 判定は private なので、スナップショットの塊の位置から残りフレーム t を計算して、
// 狙った t のタイミングでタップする。
const firstIngot = (e: GameEngine) => e.snapshot.obstacles.find(o => o.shape === 'hot_ingot' && !o.struck)

function speedOf(e: GameEngine): number {
  const s = e.snapshot
  const base = SPEED_START + (SPEED_END - SPEED_START) * (s.stageProgress / STAGE_LENGTH)
  return base * (1 + FORGE_TIER_STEP * s.forgeTier)
}

function tOf(e: GameEngine): number {
  const o = firstIngot(e)
  return o ? (o.x + o.w / 2 - (PLAYER_X + FORGE_RING_OFFSET)) / speedOf(e) : Infinity
}

function stepUntil(e: GameEngine, cond: () => boolean, limit = 3000) {
  for (let i = 0; i < limit && !cond(); i++) e.step()
  if (!cond()) throw new Error('条件に届かなかった')
}

// 最初の2個（チュートリアル）を叩いて、速度段階2・連続2の状態にする
function afterTutorial(seed = 5): GameEngine {
  const e = new GameEngine(null, 5, noop, { seed, silent: true })
  for (let n = 1; n <= 2; n++) {
    stepUntil(e, () => tOf(e) <= FORGE_GOOD_EARLY)
    e.step() // 世界を遅くして待つ状態に入る
    e.jump()
    expect(e.snapshot.forgeTier).toBe(n)
    expect(e.snapshot.forgeCombo).toBe(n)
    // PERFECT のヒットストップと、叩いた塊が離れるのを待つ
    for (let i = 0; i < 4; i++) e.step()
  }
  return e
}

describe('鍛えてカン！（学科5）', () => {
  it('速度の上限が MAT_BOOST_MAX と一致する（limits.ts の前提）', () => {
    expect(1 + FORGE_TIER_STEP * FORGE_TIER_MAX).toBeCloseTo(MAT_BOOST_MAX, 10)
  })

  it('チュートリアルは待って叩けば PERFECT になり、速度段階が上がる', () => {
    const e = afterTutorial()
    expect(e.snapshot.forgeTier).toBe(2)
  })

  it('GOOD（輪から少しずれた叩き）で速度段階が1つ下がる。連続回数は続く', () => {
    const e = afterTutorial()
    stepUntil(e, () => tOf(e) <= 4.4)
    const t = tOf(e)
    expect(t).toBeGreaterThan(2.5)
    e.jump()
    expect(e.snapshot.forgeTier).toBe(1)
    expect(e.snapshot.forgeCombo).toBe(3)
  })

  it('PERFECT でさらに段階が上がる', () => {
    const e = afterTutorial()
    stepUntil(e, () => Math.abs(tOf(e)) <= 2)
    e.jump()
    expect(e.snapshot.forgeTier).toBe(3)
  })

  it('「はやい」で速度段階が0に戻り、硬直中のタップは捨てられる', () => {
    const e = afterTutorial()
    stepUntil(e, () => tOf(e) <= 12)
    expect(tOf(e)).toBeGreaterThan(FORGE_GOOD_EARLY)
    e.jump()
    expect(e.snapshot.forgeTier).toBe(0)
    for (let i = 0; i < 3; i++) e.step()
    e.jump() // 硬直中
    expect(firstIngot(e)).toBeDefined()
    expect(e.snapshot.forgeCombo).toBe(2)
    // 硬直が明けたあとは叩ける
    for (let i = 0; i < FORGE_COOLDOWN; i++) e.step()
    e.jump()
  })

  it('近くに塊がないときのタップは罰なし（速度段階はそのまま）', () => {
    const e = afterTutorial()
    stepUntil(e, () => tOf(e) > 60 && e.snapshot.obstacles.every(o => o.struck || o.x > 700))
    e.jump()
    expect(e.snapshot.forgeTier).toBe(2)
    expect(e.snapshot.missCount).toBe(0)
  })

  it('叩けなかった塊にぶつかるとノックバックして速度段階0・連続0になる', () => {
    const e = new GameEngine(null, 5, noop, { seed: 3, silent: true })
    for (let i = 0; i < 600; i++) e.step()
    expect(e.snapshot.missCount).toBeGreaterThan(0)
    expect(e.snapshot.forgeTier).toBe(0)
    expect(e.snapshot.forgeCombo).toBe(0)
  })

  it('clone() で先読みを進めても、本体の予定の列と状態は変わらない', () => {
    const e = new GameEngine(null, 5, noop, { seed: 9, silent: true })
    for (let i = 0; i < 120; i++) e.step()
    const c = e.clone()
    for (let i = 0; i < 400; i++) c.step()
    // 本体のキューを複製側が減らしていれば、本体の未来は複製側と食い違う
    const e2 = e.clone()
    for (let i = 0; i < 400; i++) e.step()
    for (let i = 0; i < 400; i++) e2.step()
    const shape = (g: GameEngine) => g.snapshot.obstacles.map(o => [o.shape, Math.round(o.stageX)])
    expect(shape(e)).toEqual(shape(e2))
    expect(e.snapshot.stageProgress).toBe(e2.snapshot.stageProgress)
    expect(e.snapshot.missCount).toBe(e2.snapshot.missCount)
  })

  it('12フレームおきの連打は、普通に叩く（自動プレイ）より遅くなる', () => {
    const frames = 60 * 40
    const spam = new GameEngine(null, 5, noop, { seed: 21, silent: true })
    for (let i = 0; i < frames; i++) { if (i % 12 === 0) spam.jump(); spam.step() }
    const normal = new GameEngine(null, 5, noop, { seed: 21, silent: true })
    const pilot = new Autopilot(normal)
    for (let i = 0; i < frames; i++) { pilot.act(); normal.step() }
    expect(spam.snapshot.stageProgress).toBeLessThan(normal.snapshot.stageProgress)
  }, 120_000)
})
