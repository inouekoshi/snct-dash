import { describe, it, expect, vi, beforeEach, onTestFinished } from 'vitest'
import { NextRequest } from 'next/server'

// Supabase クライアントを差し替えて、API ルートの入力チェックとエラーの変換を確かめる
const rpc = vi.fn()
vi.mock('@/lib/supabase-server', () => ({ createServerClient: () => ({ rpc }) }))

const { POST: startRun } = await import('@/app/api/runs/route')
const { POST: submit } = await import('@/app/api/stage-clears/route')
const { GET: leaderboard } = await import('@/app/api/leaderboard/route')

const RUN_ID = '3f2a8c1e-1b2c-4d5e-8f90-123456789abc'

function post(url: string, body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest(`http://localhost${url}`, {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body),
    headers: { 'content-type': 'application/json', ...headers },
  })
}

beforeEach(() => {
  rpc.mockReset()
})

describe('POST /api/runs', () => {
  it('runId を返し、IP はハッシュ化して渡す', async () => {
    rpc.mockResolvedValue({ data: RUN_ID, error: null })
    const res = await startRun(post('/api/runs', { department: 3, startedAgoMs: 1234.4 }, { 'x-forwarded-for': '203.0.113.9', 'user-agent': 'iPhone Mobile' }))
    expect(res.status).toBe(201)
    expect(await res.json()).toEqual({ runId: RUN_ID })
    const [fn, args] = rpc.mock.calls[0]
    expect(fn).toBe('start_run')
    expect(args.p_department).toBe(3)
    expect(args.p_device).toBe('mobile')
    expect(args.p_client_key).toMatch(/^[0-9a-f]{32}$/)
    expect(args.p_started_ago_ms).toBe(1234)
  })

  it('startedAgoMs がなければ 0 を渡す', async () => {
    rpc.mockResolvedValue({ data: RUN_ID, error: null })
    await startRun(post('/api/runs', { department: 1, startedAgoMs: 'x' }))
    expect(rpc.mock.calls[0][1].p_started_ago_ms).toBe(0)
  })

  it.each([[{ department: 0 }], [{ department: 6 }], [{ department: '1' }], [{}]])('学科が不正なら 400（%j）', async (body) => {
    const res = await startRun(post('/api/runs', body))
    expect(res.status).toBe(400)
    expect(rpc).not.toHaveBeenCalled()
  })

  it('JSON でなければ 400', async () => {
    expect((await startRun(post('/api/runs', 'not json'))).status).toBe(400)
  })

  it('レート制限は 429 + Retry-After', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'rate_limited', code: 'PT429' } })
    const res = await startRun(post('/api/runs', { department: 1 }))
    expect(res.status).toBe(429)
    expect(res.headers.get('retry-after')).toBe('60')
    expect((await res.json()).code).toBe('rate_limited')
  })

  it('DB が落ちていれば 500', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    rpc.mockImplementation(async () => { throw new Error('fetch failed') })
    onTestFinished(() => spy.mockRestore())
    expect((await startRun(post('/api/runs', { department: 1 }))).status).toBe(500)
  })

  it('メンテナンス中の学科は 503 で断り、DB を呼ばない', async () => {
    vi.stubEnv('NEXT_PUBLIC_MAINTENANCE_DEPARTMENTS', '4')
    onTestFinished(() => { vi.unstubAllEnvs() })
    const res = await startRun(post('/api/runs', { department: 4 }))
    expect(res.status).toBe(503)
    expect((await res.json()).code).toBe('department_maintenance')
    expect(rpc).not.toHaveBeenCalled()

    rpc.mockResolvedValue({ data: RUN_ID, error: null })
    expect((await startRun(post('/api/runs', { department: 3 }))).status).toBe(201)
  })
})

describe('POST /api/stage-clears', () => {
  const ok = { runId: RUN_ID, nickname: ' 高専太郎 ', clear_time_ms: 105000, misses: 2 }

  it('登録して順位を返す（ニックネームは前後の空白を除いて送る）', async () => {
    rpc.mockResolvedValue({
      data: [{ clear_id: 'c1', rank: 3, best_ms: 104000, is_personal_best: false, total_players: 12 }],
      error: null,
    })
    const res = await submit(post('/api/stage-clears', ok))
    expect(res.status).toBe(201)
    expect(await res.json()).toEqual({ id: 'c1', rank: 3, bestMs: 104000, isPersonalBest: false, totalPlayers: 12 })
    expect(rpc).toHaveBeenCalledWith('submit_clear', {
      p_run_id: RUN_ID, p_nickname: '高専太郎', p_clear_time_ms: 105000, p_misses: 2,
    })
  })

  it.each([
    [{ ...ok, runId: 'abc' }, 404],
    [{ ...ok, nickname: '   ' }, 400],
    [{ ...ok, nickname: 'あ'.repeat(21) }, 400],
    [{ ...ok, clear_time_ms: 0 }, 422],
    [{ ...ok, clear_time_ms: 1.5 }, 422],
    [{ ...ok, clear_time_ms: 600001 }, 422],
  ])('形式がおかしいものは DB に送らない（%j → %i）', async (body, status) => {
    const res = await submit(post('/api/stage-clears', body))
    expect(res.status).toBe(status)
    expect(rpc).not.toHaveBeenCalled()
  })

  it.each([
    ['nickname_rejected', 422], ['invalid_time', 422], ['time_mismatch', 422],
    ['run_not_found', 404], ['run_already_finished', 409], ['run_expired', 410],
  ])('DB関数のエラー %s → %i', async (message, status) => {
    rpc.mockResolvedValue({ data: null, error: { message } })
    const res = await submit(post('/api/stage-clears', ok))
    expect(res.status).toBe(status)
    const json = await res.json()
    expect(json.code).toBe(message)
    expect(json.error).toBeTruthy()
  })

  it('知らないエラーは 500 で中身を漏らさない', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'relation "x" does not exist' } })
    const res = await submit(post('/api/stage-clears', ok))
    expect(res.status).toBe(500)
    expect(JSON.stringify(await res.json())).not.toContain('relation')
  })
})

describe('GET /api/leaderboard', () => {
  it('ランキングを返し、CDN キャッシュのヘッダーを付ける', async () => {
    rpc.mockResolvedValue({ data: [{ id: 'a', nickname: 'x', department: 1, clear_time_ms: 105000, played_at: '' }], error: null })
    const res = await leaderboard(new NextRequest('http://localhost/api/leaderboard?department=1'))
    expect(res.status).toBe(200)
    expect((await res.json()).entries).toHaveLength(1)
    expect(res.headers.get('cache-control')).toBe('public, s-maxage=5, stale-while-revalidate=5')
    expect(rpc).toHaveBeenCalledWith('get_leaderboard', { p_department: 1, p_limit: 10 })
  })

  it.each(['0', '6', 'abc', '1.5', ''])('学科が不正なら 400（%s）', async (d) => {
    const res = await leaderboard(new NextRequest(`http://localhost/api/leaderboard?department=${d}`))
    expect(res.status).toBe(400)
  })

  it('DB エラーは 500（キャッシュさせない）', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'boom' } })
    const res = await leaderboard(new NextRequest('http://localhost/api/leaderboard?department=2'))
    expect(res.status).toBe(500)
    expect(res.headers.get('cache-control')).toBeNull()
  })
})
