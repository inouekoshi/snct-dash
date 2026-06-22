import type { Obstacle } from './engine-types'
import { CANVAS_W, DEFAULT_GROUND_Y } from './constants'

type ObstacleInit = Pick<Obstacle, 'x' | 'y' | 'w' | 'h' | 'shape'> & Partial<Pick<Obstacle, 'moving' | 'phase' | 'baseY' | 'amplitude'>>

// stageX は呼び出し側（engine.ts）が指定する
function makeObstacle(stageX: number, o: ObstacleInit): Obstacle {
  return {
    moving: false, phase: 0, baseY: o.y, amplitude: 0,
    ...o,
    stageX,
  }
}

// 複合障害物のcanvasXオフセットをstageXに変換する
// o.x は CANVAS_W+10 を基準にした canvas X 座標として設計されているため
// stageX オフセット = o.x - (CANVAS_W + 10)
export function spawnObstacle(departmentId: number, stageX: number, obstacles: Obstacle[], groundY = DEFAULT_GROUND_Y) {
  const push = (o: ObstacleInit) => obstacles.push(makeObstacle(stageX + (o.x - (CANVAS_W + 10)), o))
  if      (departmentId === 1) spawnDept1(push, groundY)
  else if (departmentId === 2) spawnDept2(push, groundY)
  else if (departmentId === 3) spawnDept3(push, groundY)
  else if (departmentId === 4) spawnDept4(push, groundY)
  else                          spawnDept5(push, groundY)
}

export function spawnCeilingObstacle(stageX: number, obstacles: Obstacle[]) {
  const count = Math.random() < 0.3 ? 2 : 1
  for (let i = 0; i < count; i++) {
    const w = 32 + Math.random() * 28
    const h = 100 + Math.random() * 50
    const xOffset = i * (w + 20 + Math.random() * 30)
    const x = CANVAS_W + 10 + xOffset
    obstacles.push({
      stageX: stageX + xOffset,
      x, y: 0, w, h,
      shape: 'stalactite',
      moving: false, phase: 0, baseY: 0, amplitude: 0,
    })
  }
}

// 機械工学科: 6種をサイズ帯・動きで明確に差別化（低=conveyor/wrench, 中=spring/robot_arm, 大=flywheel/hammer）
function spawnDept1(push: (o: ObstacleInit) => void, groundY: number) {
  const r = Math.random()
  if (r < 0.16) {
    // コンベア：低くて幅広。距離を稼ぐジャンプが必要
    const w = 90 + Math.random() * 40
    const h = 20 + Math.random() * 10
    push({ x: CANVAS_W + 10, y: groundY - h, w, h, shape: 'conveyor' })
  } else if (r < 0.32) {
    // レンチ：低くて細い。地面スレスレで素早いジャンプ
    const h = 28 + Math.random() * 14
    push({ x: CANVAS_W + 10, y: groundY - h, w: 16 + Math.random() * 8, h, shape: 'wrench' })
  } else if (r < 0.48) {
    // スプリング：中サイズ。上下に伸び縮みするタイミング障害
    const h = 44 + Math.random() * 20
    const baseY = groundY - h
    push({ x: CANVAS_W + 10, y: baseY, w: 22 + Math.random() * 10, h, shape: 'spring', moving: true, phase: Math.random() * Math.PI * 2, baseY, amplitude: 36 })
  } else if (r < 0.64) {
    // ロボットアーム：中高で細い縦壁。アームが伸縮する
    const h = 58 + Math.random() * 24
    const baseY = groundY - h
    push({ x: CANVAS_W + 10, y: baseY, w: 28 + Math.random() * 14, h, shape: 'robot_arm', moving: true, phase: Math.random() * Math.PI * 2, baseY, amplitude: 18 })
  } else if (r < 0.78) {
    // フライホイール：大きく回転する円。広い当たり判定で大ジャンプ
    const s = 56 + Math.random() * 18
    push({ x: CANVAS_W + 10, y: groundY - s, w: s, h: s, shape: 'flywheel' })
  } else if (r < 0.90) {
    // ハンマー：最も高い壁。フルジャンプ必須
    const h = 72 + Math.random() * 20
    push({ x: CANVAS_W + 10, y: groundY - h, w: 50 + Math.random() * 16, h, shape: 'hammer' })
  } else if (r < 0.95) {
    // 複合：レンチ（低）＋スプリング（中・上下）
    const h1 = 30 + Math.random() * 12, h2 = 44 + Math.random() * 18
    const baseY = groundY - h2
    push({ x: CANVAS_W + 10, y: groundY - h1, w: 20, h: h1, shape: 'wrench' })
    push({ x: CANVAS_W + 72, y: baseY, w: 22, h: h2, shape: 'spring', moving: true, phase: Math.random() * Math.PI * 2, baseY, amplitude: 34 })
  } else {
    // 複合：大フライホイール＋ハンマー
    const s = 56 + Math.random() * 14, h2 = 72 + Math.random() * 16
    push({ x: CANVAS_W + 10, y: groundY - s, w: s, h: s, shape: 'flywheel' })
    push({ x: CANVAS_W + s + 22, y: groundY - h2, w: 48, h: h2, shape: 'hammer' })
  }
}

// 電気電子工学科: 8種をサイズ帯・動きで個性化（低=resistor/coil, 中=circuit/transistor/capacitor,
// 中・上下=electron, 大・回転=arc_ring, 高壁=tesla）。複合パターンあり。
function spawnDept2(push: (o: ObstacleInit) => void, groundY: number) {
  const r = Math.random()
  if (r < 0.13) {
    // 抵抗器：低くて幅広。距離を稼ぐジャンプ
    const w = 84 + Math.random() * 40, h = 22 + Math.random() * 10
    push({ x: CANVAS_W + 10, y: groundY - h, w, h, shape: 'resistor' })
  } else if (r < 0.26) {
    // コイル：低〜中の細い縦。地面スレスレの素早いジャンプ
    const h = 40 + Math.random() * 22
    push({ x: CANVAS_W + 10, y: groundY - h, w: 18 + Math.random() * 6, h, shape: 'coil' })
  } else if (r < 0.39) {
    // 回路基板：中サイズの壁
    const h = 40 + Math.random() * 22
    push({ x: CANVAS_W + 10, y: groundY - h, w: 30 + Math.random() * 14, h, shape: 'circuit' })
  } else if (r < 0.52) {
    // トランジスタ：中サイズの半円ボディ
    const h = 46 + Math.random() * 20
    push({ x: CANVAS_W + 10, y: groundY - h, w: 34 + Math.random() * 12, h, shape: 'transistor' })
  } else if (r < 0.64) {
    // コンデンサ：やや高め
    const h = 46 + Math.random() * 24
    push({ x: CANVAS_W + 10, y: groundY - h, w: 24 + Math.random() * 8, h, shape: 'capacitor' })
  } else if (r < 0.77) {
    // 電子：中サイズの球が上下に浮遊するタイミング障害
    const s = 30 + Math.random() * 10
    const baseY = groundY - s - 6
    push({ x: CANVAS_W + 10, y: baseY, w: s, h: s, shape: 'electron', moving: true, phase: Math.random() * Math.PI * 2, baseY, amplitude: 46 })
  } else if (r < 0.88) {
    // 放電リング：大きく回転する円。広い当たり判定で大ジャンプ
    const s = 54 + Math.random() * 16
    push({ x: CANVAS_W + 10, y: groundY - s, w: s, h: s, shape: 'arc_ring' })
  } else if (r < 0.95) {
    // テスラコイル：最も高い壁。フルジャンプ必須
    const h = 72 + Math.random() * 20
    push({ x: CANVAS_W + 10, y: groundY - h, w: 40 + Math.random() * 12, h, shape: 'tesla' })
  } else if (r < 0.975) {
    // 複合：抵抗器（低）＋電子（中・上下）
    const h1 = 22 + Math.random() * 8
    const s = 30 + Math.random() * 8, baseY = groundY - s - 6
    push({ x: CANVAS_W + 10, y: groundY - h1, w: 80, h: h1, shape: 'resistor' })
    push({ x: CANVAS_W + 98, y: baseY, w: s, h: s, shape: 'electron', moving: true, phase: Math.random() * Math.PI * 2, baseY, amplitude: 42 })
  } else {
    // 複合：放電リング（大）＋テスラ（高壁）
    const s = 52 + Math.random() * 12, h2 = 70 + Math.random() * 14
    push({ x: CANVAS_W + 10, y: groundY - s, w: s, h: s, shape: 'arc_ring' })
    push({ x: CANVAS_W + s + 24, y: groundY - h2, w: 38, h: h2, shape: 'tesla' })
  }
}

// 電子情報工学科: bug / monitor / chip
function spawnDept3(push: (o: ObstacleInit) => void, groundY: number) {
  const r = Math.random()
  if (r < 0.35) {
    const baseY = groundY - 32
    push({ x: CANVAS_W + 10, y: baseY, w: 30, h: 30, shape: 'bug', moving: true, phase: Math.random() * Math.PI * 2, baseY, amplitude: 52 })
  } else if (r < 0.55) {
    const h = 44 + Math.random() * 20
    push({ x: CANVAS_W + 10, y: groundY - h, w: 44 + Math.random() * 16, h, shape: 'monitor' })
  } else if (r < 0.74) {
    const h = 26 + Math.random() * 16
    push({ x: CANVAS_W + 10, y: groundY - h, w: 46 + Math.random() * 18, h, shape: 'chip' })
  } else if (r < 0.88) {
    const h = 34 + Math.random() * 22
    push({ x: CANVAS_W + 10, y: groundY - h, w: 32, h, shape: 'bug' })
  } else {
    const h1 = 34 + Math.random() * 14, h2 = 26 + Math.random() * 14
    push({ x: CANVAS_W + 10, y: groundY - h1, w: 30, h: h1, shape: 'bug' })
    push({ x: CANVAS_W + 72, y: groundY - h2, w: 44, h: h2, shape: 'chip' })
  }
}

// 生物応用化学科: bacteria / flask / mushroom
function spawnDept4(push: (o: ObstacleInit) => void, groundY: number) {
  const r = Math.random()
  if (r < 0.26) {
    const n = Math.random() < 0.5 ? 2 : 3
    for (let i = 0; i < n; i++) {
      const h = 35 + Math.random() * 20
      push({ x: CANVAS_W + 10 + i * 44, y: groundY - h, w: 24 + Math.random() * 12, h, shape: 'bacteria' })
    }
  } else if (r < 0.48) {
    const h = 46 + Math.random() * 26
    push({ x: CANVAS_W + 10, y: groundY - h, w: 52 + Math.random() * 18, h, shape: 'bacteria' })
  } else if (r < 0.66) {
    const h = 58 + Math.random() * 22
    push({ x: CANVAS_W + 10, y: groundY - h, w: 30 + Math.random() * 10, h, shape: 'flask' })
  } else if (r < 0.84) {
    const h = 44 + Math.random() * 20
    push({ x: CANVAS_W + 10, y: groundY - h, w: 44 + Math.random() * 16, h, shape: 'mushroom' })
  } else {
    const h1 = 55 + Math.random() * 18, h2 = 38 + Math.random() * 16
    push({ x: CANVAS_W + 10, y: groundY - h1, w: 28, h: h1, shape: 'flask' })
    push({ x: CANVAS_W + 74, y: groundY - h2, w: 38, h: h2, shape: 'bacteria' })
  }
}

// 材料工学科: crystal / ingot / lattice
function spawnDept5(push: (o: ObstacleInit) => void, groundY: number) {
  const r = Math.random()
  if (r < 0.22) {
    const h = 52 + Math.random() * 36
    push({ x: CANVAS_W + 10, y: groundY - h, w: 26 + Math.random() * 12, h, shape: 'crystal' })
  } else if (r < 0.38) {
    const h1 = 48 + Math.random() * 26, h2 = 42 + Math.random() * 26
    push({ x: CANVAS_W + 10, y: groundY - h1, w: 24, h: h1, shape: 'crystal' })
    push({ x: CANVAS_W + 58, y: groundY - h2, w: 22, h: h2, shape: 'crystal' })
  } else if (r < 0.54) {
    const h = 22 + Math.random() * 14
    push({ x: CANVAS_W + 10, y: groundY - h, w: 46 + Math.random() * 24, h, shape: 'ingot' })
  } else if (r < 0.70) {
    const h = 40 + Math.random() * 24
    push({ x: CANVAS_W + 10, y: groundY - h, w: 40 + Math.random() * 18, h, shape: 'lattice' })
  } else if (r < 0.84) {
    for (let i = 0; i < 3; i++) {
      const h = 38 + Math.random() * 34 * (i + 1) / 3
      push({ x: CANVAS_W + 10 + i * 36, y: groundY - h, w: 20, h, shape: 'crystal' })
    }
  } else {
    const h1 = 22 + Math.random() * 12, h2 = 52 + Math.random() * 24
    push({ x: CANVAS_W + 10, y: groundY - h1, w: 46, h: h1, shape: 'ingot' })
    push({ x: CANVAS_W + 88, y: groundY - h2, w: 22, h: h2, shape: 'crystal' })
  }
}
