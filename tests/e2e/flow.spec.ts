import { test, expect } from '@playwright/test'
import { mockApi, setNickname, startDepartment, warpToGoal, RUN_ID, CLEAR_ID } from './helpers'

test.describe('初回のニックネーム入力', () => {
  test('名前を入れるとタイトル画面になり、次回からは聞かれない', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'ニックネームを入力' })).toBeVisible()
    const next = page.getByRole('button', { name: '次へ →' })
    await expect(next).toBeDisabled()
    await page.getByLabel('ニックネーム').fill('   ')
    await expect(next).toBeDisabled()
    await page.getByLabel('ニックネーム').fill('  高専太郎  ')
    await next.click()
    await expect(page.getByRole('heading', { name: /高専ダッシュ/ })).toBeVisible()
    await expect(page.getByText('名前を変更する (高専太郎)')).toBeVisible()
    await expect(page.getByText('スライディング')).toHaveCount(0) // 旧仕様の説明が残っていない
    await page.reload()
    await expect(page.getByRole('heading', { name: /高専ダッシュ/ })).toBeVisible()
  })

  test('名前がないまま /game に来たらタイトル（名前入力）に戻す', async ({ page }) => {
    await page.goto('/game')
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole('heading', { name: 'ニックネームを入力' })).toBeVisible()
  })
})

test.describe('プレイ → クリア → 登録', () => {
  test('スタートで runs を作り、クリアで runId つきで登録して順位を出す', async ({ page }) => {
    const calls = await mockApi(page)
    await setNickname(page)
    await startDepartment(page, '電子情報工学科')
    await expect.poll(() => calls.filter(c => c.url === '/api/runs').length).toBe(1)
    expect(calls[0].body).toMatchObject({ department: 3 })
    expect((calls[0].body as { startedAgoMs: number }).startedAgoMs).toBeLessThan(5000)

    await warpToGoal(page, 95_430)
    await expect(page.getByText('STAGE CLEAR!')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByTestId('clear-time')).toHaveText(/1:35\.4\d/)
    await expect(page.getByTestId('rank')).toContainText('2 位')
    await expect(page.getByTestId('rank')).toContainText('17人中')
    await expect(page.getByText('自己ベスト更新！')).toBeVisible()

    const submit = calls.find(c => c.url === '/api/stage-clears')!.body as Record<string, unknown>
    expect(submit).toMatchObject({ runId: RUN_ID, nickname: 'E2Eテスト', misses: 0 })
    expect(submit.clear_time_ms).toBeGreaterThanOrEqual(95_430)

    // シェア
    const share = page.getByTestId('share')
    await expect(share).toBeVisible()
    const x = await share.getByRole('link', { name: /ポスト/ }).getAttribute('href')
    expect(x).toContain('twitter.com/intent/tweet')
    expect(decodeURIComponent(x!)).toContain(`/r/${CLEAR_ID}`)
    expect(decodeURIComponent(x!)).toContain('電子情報工学科')
    const line = await share.getByRole('link', { name: 'LINE' }).getAttribute('href')
    expect(decodeURIComponent(line!)).toContain(`/r/${CLEAR_ID}`)

    // 一度しか登録しない
    await page.waitForTimeout(500)
    expect(calls.filter(c => c.url === '/api/stage-clears')).toHaveLength(1)
  })

  test('「もう一度！」は同じ学科をブリーフィングなしで始め、新しい run を作る', async ({ page }) => {
    const calls = await mockApi(page)
    await setNickname(page)
    await startDepartment(page, '機械工学科')
    await warpToGoal(page)
    await page.getByRole('button', { name: 'もう一度！' }).click()
    await expect(page.getByTestId('game-canvas')).toBeVisible()
    await expect(page.getByRole('button', { name: '▶ スタート！' })).toHaveCount(0)
    await expect.poll(() => calls.filter(c => c.url === '/api/runs').length).toBe(2)
    expect(calls.filter(c => c.url === '/api/runs').map(c => (c.body as { department: number }).department)).toEqual([1, 1])
  })

  test('材料工学科はクリア後に眼鏡フレーム完成の演出が出る', async ({ page }) => {
    await mockApi(page)
    await setNickname(page)
    await startDepartment(page, '材料工学科')
    await warpToGoal(page, 80_000)
    await expect(page.getByText('チタン眼鏡フレーム 完成！')).toBeVisible({ timeout: 10_000 })
  })

  test('NGワードで弾かれたら理由と「ニックネームを変える」を出す', async ({ page }) => {
    await mockApi(page, {
      submitStatus: 422,
      submitBody: { code: 'nickname_rejected', error: 'このニックネームは使えません。名前を変えてもう一度遊んでね' },
    })
    await setNickname(page)
    await startDepartment(page, '電気電子工学科')
    await warpToGoal(page)
    await expect(page.getByRole('alert').filter({ hasText: 'このニックネームは使えません' })).toBeVisible()
    await page.getByRole('button', { name: 'ニックネームを変える' }).click()
    await expect(page.getByRole('heading', { name: 'ニックネームを入力' })).toBeVisible()
  })

  test('プレイ開始の通信に失敗しても遊べて、結果画面で「登録されなかった」と出る', async ({ page }) => {
    await mockApi(page, { runStatus: 500 })
    await setNickname(page)
    await startDepartment(page, '生物応用化学科')
    await warpToGoal(page, 150_000)
    await expect(page.getByRole('alert').filter({ hasText: '登録されませんでした' })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('clear-time')).toBeVisible()
  })
})

test.describe('一時停止メニュー', () => {
  test('一時停止中はゲームが止まり、再開・最初から・学科選択ができる', async ({ page }) => {
    const calls = await mockApi(page)
    await setNickname(page)
    await startDepartment(page, '電気電子工学科')
    await page.waitForTimeout(500)
    await page.getByRole('button', { name: '⏸ 一時停止' }).click()
    const frame = await page.evaluate(() => window.__kosendash!.engine.snapshot.frame)
    await page.waitForTimeout(600)
    expect(await page.evaluate(() => window.__kosendash!.engine.snapshot.frame)).toBe(frame)

    await page.getByRole('button', { name: '▶ 再開' }).click()
    await page.waitForTimeout(400)
    expect(await page.evaluate(() => window.__kosendash!.engine.snapshot.frame)).toBeGreaterThan(frame)

    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: '↺ 最初からやり直す' }).click()
    await expect.poll(() => calls.filter(c => c.url === '/api/runs').length).toBe(2)
    expect(await page.evaluate(() => window.__kosendash!.engine.snapshot.stageProgress)).toBeLessThan(200)

    await page.keyboard.press('KeyP')
    await page.getByRole('button', { name: '学科選択に戻る' }).click()
    await expect(page.getByRole('heading', { name: '学科を選択' })).toBeVisible()
  })

  test('タブを切り替えると自動で一時停止する', async ({ page }) => {
    await mockApi(page)
    await setNickname(page)
    await startDepartment(page, '機械工学科')
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true })
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await expect(page.getByRole('button', { name: '▶ 再開' })).toBeVisible()
    expect(await page.evaluate(() => window.__kosendash!.engine.paused)).toBe(true)
  })
})

test.describe('ランキング', () => {
  test('学科タブで切り替えられる', async ({ page }) => {
    await mockApi(page)
    await page.goto('/leaderboard?department=4')
    await expect(page.getByText('トップ4')).toBeVisible()
    await page.getByRole('button', { name: /材料/ }).click()
    await expect(page.getByText('トップ5')).toBeVisible()
    await expect(page.getByText('1:41.23')).toBeVisible()
  })

  test('API が落ちていたら「読み込めませんでした」と出す', async ({ page }) => {
    await page.route('**/api/leaderboard?**', r => r.fulfill({ status: 500, body: '{}' }))
    await page.goto('/leaderboard')
    await expect(page.getByRole('alert').filter({ hasText: '読み込めませんでした' })).toBeVisible()
  })
})

test.describe('PWA', () => {
  test('マニフェストとアイコン、Service Worker', async ({ page, request }) => {
    const manifest = await (await request.get('/manifest.webmanifest')).json()
    expect(manifest.icons.length).toBeGreaterThanOrEqual(3)
    for (const icon of manifest.icons) {
      const res = await request.get(icon.src)
      expect(res.status(), icon.src).toBe(200)
      expect(res.headers()['content-type']).toContain('image/png')
    }
    expect((await request.get('/sw.js')).headers()['cache-control']).toContain('no-store')
    await page.goto('/')
    const scope = await page.evaluate(async () => (await navigator.serviceWorker.ready).scope)
    expect(scope).toMatch(/\/$/)
  })

  test('OGP画像（トップ）が PNG で返る', async ({ request }) => {
    const res = await request.get('/opengraph-image')
    expect(res.status()).toBe(200)
    expect(res.headers()['content-type']).toContain('image/png')
  })
})

test('クリア直後（結果画面に移る前）にタブを切り替えても、一時停止メニューは出ずに登録される', async ({ page }) => {
  const calls = await mockApi(page)
  await setNickname(page)
  await startDepartment(page, '電気電子工学科')
  await warpToGoal(page)
  await expect.poll(() => page.evaluate(() => window.__kosendash!.engine.snapshot.cleared)).toBe(true)
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await expect(page.getByRole('button', { name: '↺ 最初からやり直す' })).toHaveCount(0)
  await expect(page.getByText('STAGE CLEAR!')).toBeVisible()
  await expect.poll(() => calls.filter(c => c.url === '/api/stage-clears').length).toBe(1)
})
