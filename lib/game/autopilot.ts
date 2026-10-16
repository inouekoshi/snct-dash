import type { GameEngine } from './engine'
import { CANVAS_H } from './constants'

// 自動プレイ（テスト・バランス調整用のボット）。
// 毎フレーム、エンジンを複製して「この先どう操作するか」の候補をいくつか先読みし、
// いちばん良い結果になる候補の“今のフレームの操作”だけを実行する（モデル予測制御）。
// 実プレイヤーより上手いとは限らないが、詰み（クリア不能）やバランスの偏りを機械的に見つけられる。

const HORIZON = 84 // 先読みするフレーム数（約1.4秒）

// ジャンプ系（機械・電気電子・電子情報・材料）の候補：何フレーム後にジャンプボタンを押すか
const JUMP_PLANS: number[][] = (() => {
  const plans: number[][] = [[], [0]]
  for (const d of [7, 10, 14, 18, 24, 30]) plans.push([0, d])
  for (let k = 3; k <= 39; k += 3) plans.push([k])
  for (let k = 3; k <= 27; k += 4) for (const d of [8, 14, 22]) plans.push([k, k + d])
  return plans
})()

// 材料（鍛えてカン！）の3連（間隔18フレーム）用の候補。2連用の [0, 18] は上の候補に含まれる
const FORGE_PLANS: number[][] = (() => {
  const plans: number[][] = [[0, 18, 36]]
  for (let k = 3; k <= 15; k += 3) plans.push([k, k + 18, k + 36])
  return plans
})()

// 生物応化（スイム）の候補：目標とする高さ
const SWIM_TARGETS = [40, 65, 90, 115, 140, 165, 190, 215, 240]

export interface AutopilotStats {
  frames: number
  decisions: number
}

export class Autopilot {
  readonly stats: AutopilotStats = { frames: 0, decisions: 0 }
  private plan: number[] = []
  private swimTarget = CANVAS_H / 2
  private replanIn = 0
  private lastProgress = 0
  private stalledFrames = 0

  constructor(private readonly engine: GameEngine) {}

  /** 今のフレームの操作を決めてエンジンに入力する（step() の直前に呼ぶ） */
  act() {
    this.stats.frames++
    const s = this.engine.snapshot
    if (s.cleared) return
    if (s.departmentId === 4) {
      if (--this.replanIn <= 0) {
        this.swimTarget = this.bestSwimTarget()
        this.replanIn = 3
      }
      this.engine.setThrust(swimControl(s.py, s.pvy, this.swimTarget))
      return
    }
    // 前のフレームで決めた計画を1フレームぶん進める
    this.plan = this.plan.map(t => t - 1).filter(t => t >= 0)
    if (s.inMiss) { this.plan = []; return }
    // 先読みの範囲外にある障害物を避けたくて「跳ぶのを先送り」し続けると段差の前で止まってしまう。
    // 進めない状態が0.5秒続いたら、人間と同じように跳んでしまう。
    this.stalledFrames = s.stageProgress > this.lastProgress + 0.5 ? 0 : this.stalledFrames + 1
    this.lastProgress = s.stageProgress
    this.plan = this.stalledFrames >= 30 ? [0] : this.bestJumpPlan(this.plan)
    if (this.plan[0] === 0) this.stalledFrames = 0
    if (this.plan[0] === 0) this.engine.jump()
  }

  // 実行中の計画（current）より明確に良い候補があるときだけ乗り換える。
  // 毎フレーム白紙から選ぶと「数フレーム後に跳ぶ」が永遠に先送りされるため。
  private bestJumpPlan(current: number[]): number[] {
    this.stats.decisions++
    const evaluate = (plan: number[]) => this.rollout(sim => {
      let t = 0
      return () => {
        if (plan.includes(t)) sim.jump()
        t++
      }
    })
    let best = current
    let bestScore = evaluate(current) + 1
    const plans = this.engine.snapshot.departmentId === 5 ? [...JUMP_PLANS, ...FORGE_PLANS] : JUMP_PLANS
    for (const plan of plans) {
      const score = evaluate(plan)
      if (score > bestScore) {
        bestScore = score
        best = plan
      }
    }
    return best
  }

  private bestSwimTarget(): number {
    this.stats.decisions++
    let best = this.swimTarget
    let bestScore = -Infinity
    for (const target of SWIM_TARGETS) {
      const score = this.rollout(sim => () => {
        const s = sim.snapshot
        sim.setThrust(swimControl(s.py, s.pvy, target))
      }) - Math.abs(target - this.swimTarget) * 0.05 // 目標をむやみに変えない
      if (score > bestScore) { bestScore = score; best = target }
    }
    return best
  }

  // 操作方針 makeInput で HORIZON フレーム先まで動かし、結果を点数化する
  private rollout(makeInput: (sim: GameEngine) => () => void): number {
    const sim = this.engine.clone()
    const input = makeInput(sim)
    const start = sim.snapshot
    for (let i = 0; i < HORIZON; i++) {
      input()
      sim.step()
      if (sim.snapshot.cleared) break
    }
    const end = sim.snapshot
    // ミスのコスト（後退・停止・復活スロー）は進捗の差に表れるので、罰点は控えめにする。
    // 大きくすると「ミスするくらいなら段差の前で止まり続ける」を選んでしまう
    let score = end.stageProgress - (end.missCount - start.missCount) * 300
    if (end.cleared) score += 10000
    if (start.departmentId === 2) score += end.charge * 12 // 充電を保つ
    if (start.departmentId === 3 && end.debugMode > 0) score += 200
    if (start.departmentId === 5) score += end.forgeTier * 40 // PERFECT で速くなるほうを選ぶ
    return score
  }
}

// スイムの高さ制御（目標高さに向かって浮上・沈降を切り替える）
function swimControl(py: number, pvy: number, target: number): boolean {
  return py + pvy * 6 > target
}

export interface RunResult {
  cleared: boolean
  timeMs: number
  misses: number
  frames: number
}

/** エンジンを自動プレイでクリアまで（または maxFrames まで）走らせる */
export function autoplay(engine: GameEngine, maxFrames = 60 * 60 * 6): RunResult {
  const pilot = new Autopilot(engine)
  let frames = 0
  while (!engine.snapshot.cleared && frames < maxFrames) {
    pilot.act()
    engine.step()
    frames++
  }
  const s = engine.snapshot
  return { cleared: s.cleared, timeMs: Math.round(s.elapsedMs), misses: s.missCount, frames }
}
