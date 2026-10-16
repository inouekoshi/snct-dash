import { test, expect } from '@playwright/test'
import { mockApi, setNickname, startDepartment } from './helpers'

// 描画の重さを測る（スマホ相当に CPU を遅くして、1フレームの描画時間と fps を見る）。
// 1つずつ測りたいので、このファイルは直列で動かす。
test.describe.configure({ mode: 'serial' })

const DEPTS: [number, string][] = [
  [1, '機械工学科'], [2, '電気電子工学科'], [3, '電子情報工学科'], [4, '生物応用化学科'], [5, '材料工学科'],
]
const RATE = Number(process.env.CPU_THROTTLE ?? 4)

for (const [, name] of DEPTS) {
  test(`${name}：CPU ${RATE}倍遅い端末でも描画が1フレームに収まる`, async ({ page }) => {
    test.setTimeout(120_000)
    await mockApi(page)
    await setNickname(page)
    await startDepartment(page, name)
    const cdp = await page.context().newCDPSession(page)
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: RATE })

    // 障害物が多い終盤（70%地点）で、ミスしないよう無敵にして測る
    const stats = await page.evaluate(async () => {
      const e = window.__kosendash!.engine as unknown as {
        stageProgress: number; invincible: number; render: () => void
      }
      e.stageProgress = 70000 * 0.7
      const orig = e.render.bind(e)
      let total = 0, n = 0, worst = 0
      e.render = () => { const t = performance.now(); orig(); const d = performance.now() - t; total += d; n++; worst = Math.max(worst, d) }
      let frames = 0
      const tick = () => { frames++; e.invincible = 999; if (frames < 100000) requestAnimationFrame(tick) }
      requestAnimationFrame(tick)
      const t0 = performance.now()
      await new Promise(r => setTimeout(r, 6000))
      const sec = (performance.now() - t0) / 1000
      return { avgRenderMs: total / n, worstRenderMs: worst, fps: frames / sec, heapMB: (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize ?? 0 }
    })
    console.log(`${name} x${RATE}: render avg ${stats.avgRenderMs.toFixed(2)}ms / worst ${stats.worstRenderMs.toFixed(1)}ms, ${stats.fps.toFixed(1)} fps, heap ${(stats.heapMB / 1e6).toFixed(1)}MB`)
    expect(stats.avgRenderMs).toBeLessThan(16.7)
  })
}

test('リトライを20回繰り返してもメモリが増え続けない', async ({ page }) => {
  test.setTimeout(180_000)
  await mockApi(page)
  await setNickname(page)
  await startDepartment(page, '材料工学科')
  const heap = async () => {
    const cdp = await page.context().newCDPSession(page)
    await cdp.send('HeapProfiler.collectGarbage')
    return (await cdp.send('Runtime.getHeapUsage')).usedSize / 1e6
  }
  const sizes: number[] = []
  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(800)
    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: '↺ 最初からやり直す' }).click()
    if (i === 4 || i === 19) sizes.push(await heap())
  }
  console.log(`heap after 5 retries ${sizes[0].toFixed(1)}MB, after 20 retries ${sizes[1].toFixed(1)}MB`)
  expect(sizes[1]).toBeLessThan(sizes[0] * 1.5 + 5)
})

test('とても重い端末では自動で光彩を切って軽くする（普通の端末では切らない）', async ({ page }) => {
  test.setTimeout(60_000)
  await mockApi(page)
  await setNickname(page)
  await startDepartment(page, '材料工学科')
  await page.waitForTimeout(3000)
  expect(await page.evaluate(() => window.__kosendash!.engine.isLowQuality)).toBe(false)
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 40 })
  await expect.poll(() => page.evaluate(() => window.__kosendash!.engine.isLowQuality), { timeout: 30_000 }).toBe(true)
  expect(await page.evaluate(() => {
    const ctx = document.querySelector('canvas')!.getContext('2d')!
    ctx.shadowBlur = 20
    return ctx.shadowBlur
  })).toBe(0)
})
