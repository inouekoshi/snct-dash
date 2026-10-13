// 全学科を自動プレイしてクリアタイム・ミス数を集計する（バランス調整用）。
// 使い方: npx tsx scripts/autoplay-report.ts [試行回数=3] [学科=1,2,3,4,5]
import { GameEngine } from '../lib/game/engine'
import { autoplay } from '../lib/game/autopilot'

const runs = Number(process.argv[2] ?? 3)
const depts = (process.argv[3] ?? '1,2,3,4,5').split(',').map(Number)

for (const d of depts) {
  const rows: string[] = []
  for (let i = 0; i < runs; i++) {
    const seed = 1000 * d + i
    const t0 = performance.now()
    const engine = new GameEngine(null, d, () => {}, { seed, silent: true })
    const r = autoplay(engine)
    const wall = ((performance.now() - t0) / 1000).toFixed(1)
    rows.push(`seed=${seed} cleared=${r.cleared} time=${(r.timeMs / 1000).toFixed(2)}s misses=${r.misses} (sim ${wall}s)`)
    console.log(`dept ${d}: ${rows.at(-1)}`)
  }
}
