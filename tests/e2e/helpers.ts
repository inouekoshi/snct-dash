import type { Page, Route } from '@playwright/test'

export const RUN_ID = '11111111-2222-4333-8444-555555555555'
export const CLEAR_ID = '99999999-8888-4777-8666-555555555555'

export interface ApiMockOptions {
  submitStatus?: number
  submitBody?: unknown
  runStatus?: number
}

/** /api/* をモックし、送られたリクエストを記録する */
export async function mockApi(page: Page, opts: ApiMockOptions = {}) {
  const calls: { url: string; body: unknown }[] = []
  const json = (route: Route, status: number, body: unknown) =>
    route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })

  await page.route('**/api/runs', async route => {
    calls.push({ url: '/api/runs', body: route.request().postDataJSON() })
    await json(route, opts.runStatus ?? 201, { runId: RUN_ID })
  })
  await page.route('**/api/stage-clears', async route => {
    calls.push({ url: '/api/stage-clears', body: route.request().postDataJSON() })
    await json(route, opts.submitStatus ?? 201, opts.submitBody ?? {
      id: CLEAR_ID, rank: 2, bestMs: 104000, isPersonalBest: true, totalPlayers: 17,
    })
  })
  await page.route('**/api/leaderboard?**', async route => {
    const dept = Number(new URL(route.request().url()).searchParams.get('department'))
    await json(route, 200, {
      entries: [
        { id: 'a', nickname: `トップ${dept}`, department: dept, clear_time_ms: 101230, played_at: '2026-10-13T00:00:00Z' },
        { id: 'b', nickname: 'にばん', department: dept, clear_time_ms: 108000, played_at: '2026-10-13T00:00:00Z' },
      ],
    })
  })
  return calls
}

/** ニックネームを保存済みの状態にする */
export async function setNickname(page: Page, name = 'E2Eテスト') {
  await page.addInitScript(n => localStorage.setItem('snct_nickname', n), name)
}

/** 学科を選んでスタートを押す */
export async function startDepartment(page: Page, departmentName: string) {
  await page.goto('/game')
  await page.getByRole('button', { name: new RegExp(departmentName) }).click()
  await page.getByRole('button', { name: '▶ スタート！' }).click()
  await page.waitForFunction(() => !!window.__kosendash?.engine)
}

/** ゴール直前までワープする（タイムは本物っぽい値にしておく） */
export async function warpToGoal(page: Page, elapsedMs = 105_000) {
  await page.evaluate((ms) => {
    const e = window.__kosendash!.engine as unknown as { stageProgress: number; elapsedMs: number }
    e.stageProgress = 70000 - 30
    e.elapsedMs = ms
  }, elapsedMs)
}
