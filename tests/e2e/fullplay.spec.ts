import { test, expect } from '@playwright/test'
import { mockApi, setNickname, startDepartment } from './helpers'
import { MIN_CLEAR_TIME_MS } from '../../lib/game/limits'

// 本物のブラウザで、各学科を自動操縦で最初から最後まで実時間で走り切る（約2〜3分）。
// 描画を含めて最後までエラーなく動くか・フレームレート・クリアタイムが下限を下回らないかを確かめる。
const DEPTS: [number, string][] = [
  [1, '機械工学科'], [2, '電気電子工学科'], [3, '電子情報工学科'], [4, '生物応用化学科'], [5, '材料工学科'],
]

for (const [id, name] of DEPTS) {
  test(`${name} を最後まで走り切れる`, async ({ page }) => {
    test.setTimeout(8 * 60_000)
    const errors: string[] = []
    page.on('pageerror', e => errors.push(e.message))
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })

    const calls = await mockApi(page)
    await setNickname(page)
    await startDepartment(page, name)

    // 描画フレーム数を数える（rAF の回数）
    await page.evaluate(() => {
      const w = window as unknown as { __frames: number }
      w.__frames = 0
      const tick = () => { w.__frames++; requestAnimationFrame(tick) }
      requestAnimationFrame(tick)
    })
    await page.evaluate(() => window.__kosendash!.autopilot())
    const t0 = Date.now()

    await expect(page.getByText('STAGE CLEAR!')).toBeVisible({ timeout: 7 * 60_000 })
    const seconds = (Date.now() - t0) / 1000
    const frames = await page.evaluate(() => (window as unknown as { __frames: number }).__frames)

    const submit = calls.find(c => c.url === '/api/stage-clears')!.body as { clear_time_ms: number; misses: number }
    console.log(`${name}: clear ${(submit.clear_time_ms / 1000).toFixed(2)}s, misses ${submit.misses}, wall ${seconds.toFixed(1)}s, ${(frames / seconds).toFixed(1)} fps`)
    expect(submit.clear_time_ms).toBeGreaterThanOrEqual(MIN_CLEAR_TIME_MS[id as 1 | 2 | 3 | 4 | 5])
    expect(errors).toEqual([])
  })
}
