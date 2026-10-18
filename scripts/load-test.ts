/**
 * 高専祭アクセス集中・限界検証用 負荷テストスクリプト
 *
 * 使い方:
 *   npx tsx scripts/load-test.ts --mode=steady       # 同時100人定常シミュレーション (約1〜2 req/s)
 *   npx tsx scripts/load-test.ts --mode=burst        # バースト・レート制限限界テスト
 *   npx tsx scripts/load-test.ts --mode=concurrency  # 並行負荷ストレステスト (5, 10, 20並行)
 *   npx tsx scripts/load-test.ts --mode=leaderboard  # ランキングAPI CDN負荷テスト
 */

interface RequestResult {
  status: number
  durationMs: number
  error?: string
  code?: string
  cacheStatus?: string | null
}

interface TestStats {
  total: number
  success: number
  rateLimited: number
  serverError: number
  otherError: number
  durations: number[]
  rps: number
  totalTimeSec: number
}

const DEFAULT_TARGET = 'https://kosendash-git-dev-koshiinoues-projects.vercel.app'

function parseArgs() {
  const args = process.argv.slice(2)
  const options: Record<string, string> = {}
  for (const arg of args) {
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=')
      options[key] = value ?? 'true'
    }
  }
  return {
    target: options.target || DEFAULT_TARGET,
    mode: (options.mode || 'steady') as 'steady' | 'burst' | 'concurrency' | 'leaderboard',
    durationSec: Number(options.duration || 30),
    allowProd: options.allowProd === 'true',
  }
}

function calculateStats(results: RequestResult[], totalTimeSec: number): TestStats {
  const durations = results.map((r) => r.durationMs).sort((a, b) => a - b)
  let success = 0
  let rateLimited = 0
  let serverError = 0
  let otherError = 0

  for (const r of results) {
    if (r.status >= 200 && r.status < 300) {
      success++
    } else if (r.status === 429) {
      rateLimited++
    } else if (r.status >= 500) {
      serverError++
    } else {
      otherError++
    }
  }

  return {
    total: results.length,
    success,
    rateLimited,
    serverError,
    otherError,
    durations,
    rps: Number((results.length / totalTimeSec).toFixed(2)),
    totalTimeSec: Number(totalTimeSec.toFixed(2)),
  }
}

function printStats(title: string, stats: TestStats) {
  const d = stats.durations
  const p50 = d[Math.floor(d.length * 0.5)] ?? 0
  const p90 = d[Math.floor(d.length * 0.9)] ?? 0
  const p95 = d[Math.floor(d.length * 0.95)] ?? 0
  const p99 = d[Math.floor(d.length * 0.99)] ?? 0
  const min = d[0] ?? 0
  const max = d[d.length - 1] ?? 0
  const avg = d.length > 0 ? (d.reduce((a, b) => a + b, 0) / d.length).toFixed(1) : 0

  console.log(`\n========================================`)
  console.log(`📊 ${title}`)
  console.log(`========================================`)
  console.log(`総リクエスト数 : ${stats.total} 回 (${stats.totalTimeSec} 秒間)`)
  console.log(`実効スループット : ${stats.rps} req/sec`)
  console.log(`----------------------------------------`)
  console.log(`✅ 成功 (2xx)    : ${stats.success} (${((stats.success / stats.total) * 100 || 0).toFixed(1)}%)`)
  console.log(`⚠️ 制限 (429)    : ${stats.rateLimited} (${((stats.rateLimited / stats.total) * 100 || 0).toFixed(1)}%)`)
  console.log(`❌ エラー (5xx)  : ${stats.serverError}`)
  console.log(`❓ その他        : ${stats.otherError}`)
  console.log(`----------------------------------------`)
  console.log(`⏱️ レイテンシ:`)
  console.log(`  min  : ${min.toFixed(1)} ms`)
  console.log(`  avg  : ${avg} ms`)
  console.log(`  p50  : ${p50.toFixed(1)} ms`)
  console.log(`  p90  : ${p90.toFixed(1)} ms`)
  console.log(`  p95  : ${p95.toFixed(1)} ms`)
  console.log(`  p99  : ${p99.toFixed(1)} ms`)
  console.log(`  max  : ${max.toFixed(1)} ms`)
  console.log(`========================================\n`)
}

async function sendStartRun(baseUrl: string): Promise<RequestResult> {
  const t0 = performance.now()
  try {
    const res = await fetch(`${baseUrl}/api/runs`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ department: 3, startedAgoMs: 0 }),
    })
    const durationMs = performance.now() - t0
    let code: string | undefined
    try {
      const json = await res.json()
      code = json.code
    } catch {
      // no json
    }
    return { status: res.status, durationMs, code }
  } catch (err: unknown) {
    const durationMs = performance.now() - t0
    return { status: 0, durationMs, error: String(err) }
  }
}

async function sendLeaderboard(baseUrl: string): Promise<RequestResult> {
  const t0 = performance.now()
  try {
    const res = await fetch(`${baseUrl}/api/leaderboard?department=1`)
    const durationMs = performance.now() - t0
    const cacheStatus = res.headers.get('x-vercel-cache') || res.headers.get('cf-cache-status')
    return { status: res.status, durationMs, cacheStatus }
  } catch (err: unknown) {
    const durationMs = performance.now() - t0
    return { status: 0, durationMs, error: String(err) }
  }
}

async function runSteadyMode(baseUrl: string, durationSec: number) {
  console.log(`\n🚀 [Mode: steady] 同時100人定常シミュレーションを開始します...`)
  console.log(`ターゲット: ${baseUrl}`)
  console.log(`送信ペース: 約1.67 req/sec (100人が2分に1回スタートするペース)`)
  console.log(`計測時間: ${durationSec} 秒\n`)

  const results: RequestResult[] = []
  const intervalMs = 600 // 約1.67 req/s
  const startTime = performance.now()
  const endTime = startTime + durationSec * 1000

  while (performance.now() < endTime) {
    const reqPromise = sendStartRun(baseUrl)
    results.push(await reqPromise)
    const elapsed = performance.now() - startTime
    const progress = Math.min(100, Math.floor((elapsed / (durationSec * 1000)) * 100))
    process.stdout.write(`\r進捗: [${'#'.repeat(Math.floor(progress / 5))}${' '.repeat(20 - Math.floor(progress / 5))}] ${progress}% (${results.length} 回完了)`)
    await new Promise((r) => setTimeout(r, intervalMs))
  }
  process.stdout.write('\n')

  const totalTimeSec = (performance.now() - startTime) / 1000
  const stats = calculateStats(results, totalTimeSec)
  printStats(`定常負荷試験 (同時100人ペース)`, stats)
}

async function runBurstMode(baseUrl: string, count: number) {
  console.log(`\n🚀 [Mode: burst] バースト・同一IPレート制限限界テストを開始します...`)
  console.log(`ターゲット: ${baseUrl}`)
  console.log(`送信数: ${count} 回連続リクエスト`)
  console.log(`※同一IPからの上限 (120回/分) に達するかどうかを検証します。\n`)

  const results: RequestResult[] = []
  const startTime = performance.now()

  for (let i = 0; i < count; i++) {
    const r = await sendStartRun(baseUrl)
    results.push(r)
    process.stdout.write(`\rリクエスト ${i + 1}/${count} (Status: ${r.status}${r.code ? ` - ${r.code}` : ''})`)
    if (r.status === 429) {
      console.log(`\n⚠️ 429 Rate Limited を検出しました！ (${i + 1} 回目で到達)`)
    }
  }
  process.stdout.write('\n')

  const totalTimeSec = (performance.now() - startTime) / 1000
  const stats = calculateStats(results, totalTimeSec)
  printStats(`バースト負荷試験 (${count}回連続)`, stats)
}

async function runConcurrencyMode(baseUrl: string, concurrencyList: number[], requestsPerWorker: number) {
  console.log(`\n🚀 [Mode: concurrency] 並行負荷ストレステストを開始します...`)
  console.log(`ターゲット: ${baseUrl}`)

  for (const concurrency of concurrencyList) {
    console.log(`\n▶ 並行度 ${concurrency} でテスト中 (${concurrency * requestsPerWorker} リクエスト)...`)
    const results: RequestResult[] = []
    const startTime = performance.now()

    const workers = Array.from({ length: concurrency }, async () => {
      for (let i = 0; i < requestsPerWorker; i++) {
        const r = await sendStartRun(baseUrl)
        results.push(r)
      }
    })

    await Promise.all(workers)
    const totalTimeSec = (performance.now() - startTime) / 1000
    const stats = calculateStats(results, totalTimeSec)
    printStats(`並行度 ${concurrency} (総数 ${concurrency * requestsPerWorker} 回)`, stats)
  }
}

async function runLeaderboardMode(baseUrl: string, totalRequests: number) {
  console.log(`\n🚀 [Mode: leaderboard] ランキングAPI CDN負荷テストを開始します...`)
  console.log(`ターゲット: ${baseUrl}`)
  console.log(`送信数: ${totalRequests} 回並行アクセス\n`)

  const startTime = performance.now()
  const results: RequestResult[] = []

  // 10並行で一気に叩く
  const chunkSize = 10
  for (let i = 0; i < totalRequests; i += chunkSize) {
    const promises = Array.from({ length: Math.min(chunkSize, totalRequests - i) }, () => sendLeaderboard(baseUrl))
    const chunkResults = await Promise.all(promises)
    results.push(...chunkResults)
  }

  const totalTimeSec = (performance.now() - startTime) / 1000
  const stats = calculateStats(results, totalTimeSec)

  const hitCount = results.filter((r) => r.cacheStatus === 'HIT' || r.cacheStatus === 'STALE').length
  console.log(`CDN キャッシュヒット数: ${hitCount} / ${stats.total} (${((hitCount / stats.total) * 100 || 0).toFixed(1)}%)`)

  printStats(`ランキングAPI CDN負荷試験`, stats)
}

async function main() {
  const { target, mode, durationSec, allowProd } = parseArgs()

  if (target.includes('kosendash.vercel.app') && !allowProd) {
    console.error('❌ 本番環境（kosendash.vercel.app）への負荷テストは禁止されています。--target でプレビュー環境を指定するか、--allowProd=true を明示してください。')
    process.exit(1)
  }

  switch (mode) {
    case 'steady':
      await runSteadyMode(target, durationSec)
      break
    case 'burst':
      await runBurstMode(target, 130) // 120回制限を超えるか確認するため130回
      break
    case 'concurrency':
      await runConcurrencyMode(target, [5, 10, 20], 5)
      break
    case 'leaderboard':
      await runLeaderboardMode(target, 50)
      break
    default:
      console.error(`未知のモード: ${mode}`)
      process.exit(1)
  }
}

main().catch(console.error)
