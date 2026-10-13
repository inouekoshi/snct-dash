import { test, expect, devices } from '@playwright/test'
import { mockApi, setNickname, startDepartment } from './helpers'

// スマホ横持ち（タッチ）
test.use({ ...devices['Pixel 7'], viewport: { width: 915, height: 412 }, isMobile: true, hasTouch: true })

test('タップでジャンプ、二段ジャンプもできる', async ({ page }) => {
  await mockApi(page)
  await setNickname(page)
  await startDepartment(page, '機械工学科')
  const canvas = page.getByTestId('game-canvas')
  await canvas.tap()
  await expect.poll(() => page.evaluate(() => window.__kosendash!.engine.snapshot.jumpCount)).toBe(1)
  await canvas.tap()
  await expect.poll(() => page.evaluate(() => window.__kosendash!.engine.snapshot.jumpCount)).toBe(2)
})

test('生物応化は長押しで浮上し、離すと止める', async ({ page }) => {
  await mockApi(page)
  await setNickname(page)
  await startDepartment(page, '生物応用化学科')
  const box = (await page.getByTestId('game-canvas').boundingBox())!
  const x = box.x + box.width / 2, y = box.y + box.height / 2
  await page.evaluate(([px, py]) => {
    const c = document.querySelector('[data-testid="game-canvas"]')!
    const t = new Touch({ identifier: 1, target: c, clientX: px, clientY: py })
    c.dispatchEvent(new TouchEvent('touchstart', { touches: [t], changedTouches: [t], bubbles: true, cancelable: true }))
  }, [x, y])
  await expect.poll(() => page.evaluate(() => window.__kosendash!.engine.snapshot.thrustHeld)).toBe(true)
  await page.evaluate(() => {
    const c = document.querySelector('[data-testid="game-canvas"]')!
    c.dispatchEvent(new TouchEvent('touchend', { bubbles: true }))
  })
  await expect.poll(() => page.evaluate(() => window.__kosendash!.engine.snapshot.thrustHeld)).toBe(false)
})

test('縦向きにすると「横向きにしてください」を出して止まる', async ({ page }) => {
  await mockApi(page)
  await setNickname(page)
  await startDepartment(page, '電気電子工学科')
  await page.setViewportSize({ width: 412, height: 915 })
  await expect(page.getByText('横向きにしてください')).toBeVisible()
  await expect.poll(() => page.evaluate(() => window.__kosendash!.engine.paused)).toBe(true)
  await page.setViewportSize({ width: 915, height: 412 })
  await expect(page.getByRole('button', { name: '▶ 再開' })).toBeVisible()
})

test('すべての画面が横にはみ出さない', async ({ page }) => {
  await mockApi(page)
  await setNickname(page)
  for (const path of ['/', '/game', '/leaderboard']) {
    await page.goto(path)
    await page.waitForLoadState('networkidle')
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow, path).toBeLessThanOrEqual(1)
  }
})
