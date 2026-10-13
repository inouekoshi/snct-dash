import type { Obstacle, Item } from './engine-types'
import {
  CANVAS_W, DEFAULT_GROUND_Y, BIO_GAP, BIO_PIPE_W, CANVAS_H,
  ROLL_GAP, HEAT_GATE_OFFSET, HEAT_CHALLENGE_OFFSET, type MatPhase,
} from './constants'
import type { Rand } from './rng'

type ObstacleInit = Pick<Obstacle, 'x' | 'y' | 'w' | 'h' | 'shape'> & Partial<Pick<Obstacle, 'moving' | 'phase' | 'baseY' | 'amplitude' | 'stompable' | 'bendable' | 'breakable'>>

// stageX は呼び出し側（engine.ts）が指定する
function makeObstacle(stageX: number, o: ObstacleInit): Obstacle {
  return {
    moving: false, phase: 0, baseY: o.y, amplitude: 0, stompable: false,
    ...o,
    stageX,
  }
}

class ShuffleBag<T> {
  private bag: T[] = []

  constructor(private readonly items: readonly T[]) {}

  next(rand: Rand): T {
    if (this.bag.length === 0) {
      this.bag = [...this.items]
      for (let i = this.bag.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1))
        ;[this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]]
      }
    }
    return this.bag.pop()!
  }

  clone(): ShuffleBag<T> {
    const b = new ShuffleBag(this.items)
    b.bag = [...this.bag]
    return b
  }
}

type Push = (o: ObstacleInit) => void
type SpawnFn = (push: Push, groundY: number, rand: Rand) => void

const dept1Spawners: SpawnFn[] = [
  (push, groundY, rand) => {
    const w = 90 + rand() * 40; const h = 20 + rand() * 10
    push({ x: CANVAS_W + 10, y: groundY - h, w, h, shape: 'conveyor' })
  },
  (push, groundY, rand) => {
    const h = 28 + rand() * 14
    push({ x: CANVAS_W + 10, y: groundY - h, w: 16 + rand() * 8, h, shape: 'wrench' })
  },
  (push, groundY, rand) => {
    const h = 44 + rand() * 20; const baseY = groundY - h
    push({ x: CANVAS_W + 10, y: baseY, w: 22 + rand() * 10, h, shape: 'spring', moving: true, phase: rand() * Math.PI * 2, baseY, amplitude: 36 })
  },
  (push, groundY, rand) => {
    const h = 58 + rand() * 24; const baseY = groundY - h
    push({ x: CANVAS_W + 10, y: baseY, w: 28 + rand() * 14, h, shape: 'robot_arm', moving: true, phase: rand() * Math.PI * 2, baseY, amplitude: 18 })
  },
  (push, groundY, rand) => {
    const s = 56 + rand() * 18
    push({ x: CANVAS_W + 10, y: groundY - s, w: s, h: s, shape: 'flywheel' })
  },
  (push, groundY, rand) => {
    const h = 72 + rand() * 20
    push({ x: CANVAS_W + 10, y: groundY - h, w: 50 + rand() * 16, h, shape: 'hammer' })
  },
  (push, groundY, rand) => {
    const h1 = 30 + rand() * 12, h2 = 44 + rand() * 18; const baseY = groundY - h2
    push({ x: CANVAS_W + 10, y: groundY - h1, w: 20, h: h1, shape: 'wrench' })
    push({ x: CANVAS_W + 72, y: baseY, w: 22, h: h2, shape: 'spring', moving: true, phase: rand() * Math.PI * 2, baseY, amplitude: 34 })
  },
  (push, groundY, rand) => {
    const s = 56 + rand() * 14, h2 = 72 + rand() * 16
    push({ x: CANVAS_W + 10, y: groundY - s, w: s, h: s, shape: 'flywheel' })
    push({ x: CANVAS_W + s + 22, y: groundY - h2, w: 48, h: h2, shape: 'hammer' })
  }
]

const dept2Spawners: SpawnFn[] = [
  (push, groundY, rand) => {
    const w = 84 + rand() * 40, h = 22 + rand() * 10
    push({ x: CANVAS_W + 10, y: groundY - h, w, h, shape: 'resistor' })
  },
  (push, groundY, rand) => {
    const h = 40 + rand() * 22
    push({ x: CANVAS_W + 10, y: groundY - h, w: 18 + rand() * 6, h, shape: 'coil' })
  },
  (push, groundY, rand) => {
    const h = 40 + rand() * 22
    push({ x: CANVAS_W + 10, y: groundY - h, w: 30 + rand() * 14, h, shape: 'circuit' })
  },
  (push, groundY, rand) => {
    const h = 46 + rand() * 20
    push({ x: CANVAS_W + 10, y: groundY - h, w: 34 + rand() * 12, h, shape: 'transistor' })
  },
  (push, groundY, rand) => {
    const h = 46 + rand() * 24
    push({ x: CANVAS_W + 10, y: groundY - h, w: 24 + rand() * 8, h, shape: 'capacitor' })
  },
  (push, groundY, rand) => {
    const s = 30 + rand() * 10; const baseY = groundY - s - 6
    push({ x: CANVAS_W + 10, y: baseY, w: s, h: s, shape: 'electron', moving: true, phase: rand() * Math.PI * 2, baseY, amplitude: 46 })
  },
  (push, groundY, rand) => {
    const s = 54 + rand() * 16
    push({ x: CANVAS_W + 10, y: groundY - s, w: s, h: s, shape: 'arc_ring' })
  },
  (push, groundY, rand) => {
    const h = 72 + rand() * 20
    push({ x: CANVAS_W + 10, y: groundY - h, w: 40 + rand() * 12, h, shape: 'tesla' })
  },
  (push, groundY, rand) => {
    const h = 144 + rand() * 12
    push({ x: CANVAS_W + 10, y: groundY - h, w: 50 + rand() * 16, h, shape: 'pylon' })
  },
  (push, groundY, rand) => {
    const h1 = 22 + rand() * 8; const s = 30 + rand() * 8, baseY = groundY - s - 6
    push({ x: CANVAS_W + 10, y: groundY - h1, w: 80, h: h1, shape: 'resistor' })
    push({ x: CANVAS_W + 98, y: baseY, w: s, h: s, shape: 'electron', moving: true, phase: rand() * Math.PI * 2, baseY, amplitude: 42 })
  },
  (push, groundY, rand) => {
    const s = 52 + rand() * 12, h2 = 70 + rand() * 14
    push({ x: CANVAS_W + 10, y: groundY - s, w: s, h: s, shape: 'arc_ring' })
    push({ x: CANVAS_W + s + 24, y: groundY - h2, w: 38, h: h2, shape: 'tesla' })
  }
]

const dept3RedSpawners: SpawnFn[] = [
  (push, groundY, rand) => {
    const s = 40 + rand() * 12; const baseY = groundY - 54 - rand() * 20
    push({ x: CANVAS_W + 10, y: baseY, w: s, h: s, shape: 'syntax_error', moving: true, phase: rand() * Math.PI * 2, baseY, amplitude: 22 })
  },
  (push, groundY, rand) => {
    const h = 52 + rand() * 16
    push({ x: CANVAS_W + 10, y: groundY - h, w: 34 + rand() * 10, h, shape: 'malloc_free', phase: Math.floor(rand() * 100) })
  },
  (push, groundY, rand) => {
    const w = 38 + rand() * 10, h = 56 + rand() * 16
    push({ x: CANVAS_W + 10, y: groundY - h, w, h, shape: 'null_pointer' })
  },
  (push, groundY, rand) => {
    const w = 70 + rand() * 30, h = 40 + rand() * 14
    push({ x: CANVAS_W + 10, y: groundY - h, w, h, shape: 'merge_conflict' })
  },
  (push, groundY, rand) => {
    const w = 48 + rand() * 16, h = 46 + rand() * 16
    push({ x: CANVAS_W + 10, y: groundY - h, w, h, shape: 'segfault' })
  },
  (push, groundY, rand) => {
    const h = 74 + rand() * 22
    push({ x: CANVAS_W + 10, y: groundY - h, w: 40 + rand() * 12, h, shape: 'stack_overflow' })
  },
  (push, groundY, rand) => {
    const h = 144 + rand() * 12
    push({ x: CANVAS_W + 10, y: groundY - h, w: 30 + rand() * 12, h, shape: 'firewall' })
  },
  (push, groundY, rand) => {
    const h = 144 + rand() * 12
    push({ x: CANVAS_W + 10, y: groundY - h, w: 38 + rand() * 10, h, shape: 'blockchain' })
  },
  (push, groundY, rand) => {
    const h = 56
    push({ x: CANVAS_W + 10, y: groundY - h, w: 36, h, shape: 'malloc_free', phase: Math.floor(rand() * 100) })
    const s = 46, baseY = groundY - 52
    push({ x: CANVAS_W + 96, y: baseY, w: s, h: s, shape: 'bug', stompable: true, moving: true, phase: rand() * Math.PI * 2, baseY, amplitude: 16 })
  }
]

// 材料工学科・溶解区間の地上障害（結晶・インゴット・格子）
const meltSpawners: SpawnFn[] = [
  (push, groundY, rand) => {
    const h = 52 + rand() * 36
    push({ x: CANVAS_W + 10, y: groundY - h, w: 26 + rand() * 12, h, shape: 'crystal' })
  },
  (push, groundY, rand) => {
    const h1 = 48 + rand() * 26, h2 = 42 + rand() * 26
    push({ x: CANVAS_W + 10, y: groundY - h1, w: 24, h: h1, shape: 'crystal' })
    push({ x: CANVAS_W + 58, y: groundY - h2, w: 22, h: h2, shape: 'crystal' })
  },
  (push, groundY, rand) => {
    const h = 22 + rand() * 14
    push({ x: CANVAS_W + 10, y: groundY - h, w: 46 + rand() * 24, h, shape: 'ingot' })
  },
  (push, groundY, rand) => {
    const h = 40 + rand() * 24
    push({ x: CANVAS_W + 10, y: groundY - h, w: 40 + rand() * 18, h, shape: 'lattice' })
  },
  (push, groundY, rand) => {
    for (let i = 0; i < 3; i++) {
      const h = 38 + rand() * 34 * (i + 1) / 3
      push({ x: CANVAS_W + 10 + i * 36, y: groundY - h, w: 20, h, shape: 'crystal' })
    }
  },
  (push, groundY, rand) => {
    const h1 = 22 + rand() * 12, h2 = 52 + rand() * 24
    push({ x: CANVAS_W + 10, y: groundY - h1, w: 46, h: h1, shape: 'ingot' })
    push({ x: CANVAS_W + 88, y: groundY - h2, w: 22, h: h2, shape: 'crystal' })
  }
]

// 材料工学科・圧延区間：ローラー（上ロール）の下は薄板なら潜れる。跳ぶと上ロールにぶつかる。
// 「跳ばずに潜る」と「地上のインゴットは跳ぶ」の読み分けが課題。
function pushRoller(push: Push, x: number, groundY: number) {
  const h = 70
  push({ x, y: groundY - ROLL_GAP - h, w: 54, h, shape: 'roller' })
}
const rollSpawners: SpawnFn[] = [
  (push, groundY) => pushRoller(push, CANVAS_W + 10, groundY),
  (push, groundY) => {
    pushRoller(push, CANVAS_W + 10, groundY)
    pushRoller(push, CANVAS_W + 130, groundY)
  },
  (push, groundY, rand) => {
    pushRoller(push, CANVAS_W + 10, groundY)
    const h = 24 + rand() * 10
    push({ x: CANVAS_W + 220, y: groundY - h, w: 48, h, shape: 'ingot' })
  },
  (push, groundY, rand) => {
    const h = 22 + rand() * 12
    push({ x: CANVAS_W + 10, y: groundY - h, w: 46 + rand() * 20, h, shape: 'ingot' })
  },
  (push, groundY, rand) => {
    const h = 44 + rand() * 24
    push({ x: CANVAS_W + 10, y: groundY - h, w: 24, h, shape: 'crystal' })
  },
]

const pipeSpawners: ((push: Push, zone: 'chem' | 'bio', rand: Rand) => void)[] = [
  (push, zone, rand) => {
    const shape = zone === 'chem' ? 'reagent_tube' : 'cell_wall'
    const yCenter = 70 + rand() * (CANVAS_H - 140)
    push({ x: CANVAS_W + 10, y: -50, w: BIO_PIPE_W, h: yCenter - BIO_GAP / 2 + 50, shape, baseY: -50 })
    push({ x: CANVAS_W + 10, y: yCenter + BIO_GAP / 2, w: BIO_PIPE_W, h: CANVAS_H, shape, baseY: yCenter + BIO_GAP / 2 })
  },
  (push, zone, rand) => {
    const shape = zone === 'chem' ? 'reagent_tube' : 'cell_wall'
    const yCenter = 90 + rand() * (CANVAS_H - 180)
    const amp = 20 + rand() * 20
    const phase = rand() * Math.PI * 2
    push({ x: CANVAS_W + 10, y: -100, w: BIO_PIPE_W, h: yCenter - BIO_GAP / 2 + 100, shape, moving: true, baseY: -100, amplitude: amp, phase })
    push({ x: CANVAS_W + 10, y: yCenter + BIO_GAP / 2, w: BIO_PIPE_W, h: CANVAS_H, shape, moving: true, baseY: yCenter + BIO_GAP / 2, amplitude: amp, phase })
  },
  (push, zone, rand) => {
    const shape = zone === 'chem' ? 'reagent_tube' : 'cell_wall'
    const yCenter = 70 + rand() * (CANVAS_H - 140)
    push({ x: CANVAS_W + 10, y: -50, w: BIO_PIPE_W, h: yCenter - BIO_GAP / 2 + 50, shape, baseY: -50 })
    push({ x: CANVAS_W + 10, y: yCenter + BIO_GAP / 2, w: BIO_PIPE_W, h: CANVAS_H, shape, baseY: yCenter + BIO_GAP / 2 })

    const yCenter2 = Math.max(70, Math.min(CANVAS_H - 70, yCenter + (rand() < 0.5 ? 40 : -40)))
    push({ x: CANVAS_W + 10 + BIO_PIPE_W + 40, y: -50, w: BIO_PIPE_W, h: yCenter2 - BIO_GAP / 2 + 50, shape, baseY: -50 })
    push({ x: CANVAS_W + 10 + BIO_PIPE_W + 40, y: yCenter2 + BIO_GAP / 2, w: BIO_PIPE_W, h: CANVAS_H, shape, baseY: yCenter2 + BIO_GAP / 2 })
  }
]

// エンジン1つにつき1つ持つスポーナー。シャッフルバッグの残りと乱数をインスタンスごとに持つので、
// 複数のエンジン（リトライ・テスト・ボットの先読み）が互いの出現順に影響しない。
// 複合障害物の o.x は CANVAS_W+10 を基準にした canvas X 座標として設計されているため、
// stageX オフセット = o.x - (CANVAS_W + 10) に変換して積む。
export class Spawner {
  private dept1: ShuffleBag<SpawnFn>
  private dept2: ShuffleBag<SpawnFn>
  private dept3Red: ShuffleBag<SpawnFn>
  private melt: ShuffleBag<SpawnFn>
  private roll: ShuffleBag<SpawnFn>
  private pipe: ShuffleBag<(typeof pipeSpawners)[number]>

  constructor(private readonly rand: Rand, from?: Spawner) {
    this.dept1 = from ? from.dept1.clone() : new ShuffleBag(dept1Spawners)
    this.dept2 = from ? from.dept2.clone() : new ShuffleBag(dept2Spawners)
    this.dept3Red = from ? from.dept3Red.clone() : new ShuffleBag(dept3RedSpawners)
    this.melt = from ? from.melt.clone() : new ShuffleBag(meltSpawners)
    this.roll = from ? from.roll.clone() : new ShuffleBag(rollSpawners)
    this.pipe = from ? from.pipe.clone() : new ShuffleBag(pipeSpawners)
  }

  /** 状態（バッグの残り）を引き継いだ複製。乱数は複製先のものを渡す */
  clone(rand: Rand): Spawner {
    return new Spawner(rand, this)
  }

  private pusher(stageX: number, obstacles: Obstacle[]): Push {
    return o => obstacles.push(makeObstacle(stageX + (o.x - (CANVAS_W + 10)), o))
  }

  // 地上走行型（機械・電気電子・電子情報）の通常スポーン
  obstacle(departmentId: 1 | 2 | 3, stageX: number, obstacles: Obstacle[], groundY = DEFAULT_GROUND_Y) {
    const bag = departmentId === 1 ? this.dept1 : departmentId === 2 ? this.dept2 : this.dept3Red
    bag.next(this.rand)(this.pusher(stageX, obstacles), groundY, this.rand)
  }

  // 電子情報工学科：踏める緑のバグ（単体・浮遊・2匹・2〜3連チェイン）
  bug(stageX: number, obstacles: Obstacle[], groundY = DEFAULT_GROUND_Y) {
    const push = this.pusher(stageX, obstacles)
    const rand = this.rand
    const r = rand()
    if (r < 0.3) {
      const s = 46 + rand() * 12
      push({ x: CANVAS_W + 10, y: groundY - s, w: s, h: s, shape: 'bug', stompable: true })
    } else if (r < 0.6) {
      const s = 42 + rand() * 10
      const baseY = groundY - 50 - rand() * 22
      push({ x: CANVAS_W + 10, y: baseY, w: s, h: s, shape: 'bug', stompable: true, moving: true, phase: rand() * Math.PI * 2, baseY, amplitude: 26 })
    } else if (r < 0.8) {
      const s = 54 + rand() * 14
      push({ x: CANVAS_W + 10, y: groundY - s, w: s, h: s, shape: 'bug', stompable: true })
      const s2 = 46 + rand() * 10
      push({ x: CANVAS_W + s + 24, y: groundY - s2, w: s2, h: s2, shape: 'bug', stompable: true })
    } else {
      const n = rand() < 0.5 ? 2 : 3
      for (let i = 0; i < n; i++) {
        const s = 40
        const baseY = groundY - 50 - (i % 2) * 16
        push({ x: CANVAS_W + 10 + i * 64, y: baseY, w: s, h: s, shape: 'bug', stompable: true, moving: true, phase: rand() * Math.PI * 2, baseY, amplitude: 18 })
      }
    }
  }

  // 天井障害（電気電子・電子情報）
  ceiling(stageX: number, obstacles: Obstacle[]) {
    const rand = this.rand
    const count = rand() < 0.3 ? 2 : 1
    for (let i = 0; i < count; i++) {
      const w = 32 + rand() * 28
      const h = 100 + rand() * 50
      const xOffset = i * (w + 20 + rand() * 30)
      obstacles.push(makeObstacle(stageX + xOffset, { x: CANVAS_W + 10 + xOffset, y: 0, w, h, shape: 'stalactite' }))
    }
  }

  // 生物応用化学科：上下から伸びるパイプ
  pipePair(stageX: number, obstacles: Obstacle[], zone: 'chem' | 'bio') {
    this.pipe.next(this.rand)(this.pusher(stageX, obstacles), zone, this.rand)
  }

  // 材料工学科：溶解・圧延区間の通常スポーン（熱処理区間は heatSet、検査区間は出さない）
  mat(phase: MatPhase, stageX: number, obstacles: Obstacle[], groundY = DEFAULT_GROUND_Y) {
    const bag = phase === 'melt' ? this.melt : phase === 'roll' ? this.roll : null
    bag?.next(this.rand)(this.pusher(stageX, obstacles), groundY, this.rand)
  }

  // 材料工学科・熱処理区間：看板 → ゲート → 課題 を1画面内に固定配置で生成する。
  // flex: 🔥炉（空中・ジャンプで通過）→ しなる → 金色の板バネに当たってよい（曲がって戻り加速）
  // hard: 💧水槽（地上・走って通過）→ かたい → 結晶壁を砕ける
  // forced: 最初の1回だけ、炉を地上に置いて必ず通過させる（しなる体験のチュートリアル）
  heatSet(
    stageX: number, kind: 'flex' | 'hard', forced: boolean,
    obstacles: Obstacle[], items: Item[], groundY = DEFAULT_GROUND_Y,
  ) {
    const item = (dx: number, y: number, effect: Item['effect']) =>
      items.push({ stageX: stageX + dx, x: CANVAS_W + 10, y, effect, wobble: 0 })
    item(0, groundY - 46, kind === 'flex' ? 'sign_flex' : 'sign_hard')
    if (kind === 'flex') {
      item(HEAT_GATE_OFFSET, forced ? groundY - 60 : groundY - 104, 'furnace')
      obstacles.push(makeObstacle(stageX + HEAT_CHALLENGE_OFFSET.flex, {
        x: 0, y: groundY - 72, w: 40, h: 72, shape: 'leaf_spring', bendable: true,
      }))
    } else {
      item(HEAT_GATE_OFFSET, groundY - 10, 'quench')
      obstacles.push(makeObstacle(stageX + HEAT_CHALLENGE_OFFSET.hard, {
        x: 0, y: groundY - 146, w: 36, h: 146, shape: 'brittle_crystal', breakable: true,
      }))
    }
  }
}
