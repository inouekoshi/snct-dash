import type { Obstacle } from './engine-types'
import { CANVAS_W, DEFAULT_GROUND_Y } from './constants'

type ObstacleInit = Pick<Obstacle, 'x' | 'y' | 'w' | 'h' | 'shape'> & Partial<Pick<Obstacle, 'moving' | 'phase' | 'baseY' | 'amplitude' | 'stompable'>>

// stageX は呼び出し側（engine.ts）が指定する
function makeObstacle(stageX: number, o: ObstacleInit): Obstacle {
  return {
    moving: false, phase: 0, baseY: o.y, amplitude: 0, stompable: false,
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

export function spawnBug(stageX: number, obstacles: Obstacle[], groundY = DEFAULT_GROUND_Y) {
  const push = (o: ObstacleInit) => obstacles.push(makeObstacle(stageX + (o.x - (CANVAS_W + 10)), o))
  const r = Math.random()
  if (r < 0.3) {
    const s = 46 + Math.random() * 12
    push({ x: CANVAS_W + 10, y: groundY - s, w: s, h: s, shape: 'bug', stompable: true })
  } else if (r < 0.6) {
    const s = 42 + Math.random() * 10
    const baseY = groundY - 50 - Math.random() * 22
    push({ x: CANVAS_W + 10, y: baseY, w: s, h: s, shape: 'bug', stompable: true, moving: true, phase: Math.random() * Math.PI * 2, baseY, amplitude: 26 })
  } else if (r < 0.8) {
    const s = 54 + Math.random() * 14
    push({ x: CANVAS_W + 10, y: groundY - s, w: s, h: s, shape: 'bug', stompable: true })
    const s2 = 46 + Math.random() * 10
    push({ x: CANVAS_W + s + 24, y: groundY - s2, w: s2, h: s2, shape: 'bug', stompable: true })
  } else {
    const n = Math.random() < 0.5 ? 2 : 3
    for (let i = 0; i < n; i++) {
      const s = 40
      const baseY = groundY - 50 - (i % 2) * 16
      push({ x: CANVAS_W + 10 + i * 64, y: baseY, w: s, h: s, shape: 'bug', stompable: true, moving: true, phase: Math.random() * Math.PI * 2, baseY, amplitude: 18 })
    }
  }
}

function spawnDept3(push: (o: ObstacleInit) => void, groundY: number) {
  dept3RedBag.next()(push, groundY)
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

class ShuffleBag<T> {
  private items: T[] = []
  private bag: T[] = []

  constructor(items: T[]) {
    this.items = items
  }

  next(): T {
    if (this.bag.length === 0) {
      this.bag = [...this.items]
      for (let i = this.bag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]]
      }
    }
    return this.bag.pop()!
  }

  reset() {
    this.bag = []
  }
}

type SpawnFn = (push: (o: ObstacleInit) => void, groundY: number) => void

const dept1Spawners: SpawnFn[] = [
  (push, groundY) => {
    const w = 90 + Math.random() * 40; const h = 20 + Math.random() * 10
    push({ x: CANVAS_W + 10, y: groundY - h, w, h, shape: 'conveyor' })
  },
  (push, groundY) => {
    const h = 28 + Math.random() * 14
    push({ x: CANVAS_W + 10, y: groundY - h, w: 16 + Math.random() * 8, h, shape: 'wrench' })
  },
  (push, groundY) => {
    const h = 44 + Math.random() * 20; const baseY = groundY - h
    push({ x: CANVAS_W + 10, y: baseY, w: 22 + Math.random() * 10, h, shape: 'spring', moving: true, phase: Math.random() * Math.PI * 2, baseY, amplitude: 36 })
  },
  (push, groundY) => {
    const h = 58 + Math.random() * 24; const baseY = groundY - h
    push({ x: CANVAS_W + 10, y: baseY, w: 28 + Math.random() * 14, h, shape: 'robot_arm', moving: true, phase: Math.random() * Math.PI * 2, baseY, amplitude: 18 })
  },
  (push, groundY) => {
    const s = 56 + Math.random() * 18
    push({ x: CANVAS_W + 10, y: groundY - s, w: s, h: s, shape: 'flywheel' })
  },
  (push, groundY) => {
    const h = 72 + Math.random() * 20
    push({ x: CANVAS_W + 10, y: groundY - h, w: 50 + Math.random() * 16, h, shape: 'hammer' })
  },
  (push, groundY) => {
    const h1 = 30 + Math.random() * 12, h2 = 44 + Math.random() * 18; const baseY = groundY - h2
    push({ x: CANVAS_W + 10, y: groundY - h1, w: 20, h: h1, shape: 'wrench' })
    push({ x: CANVAS_W + 72, y: baseY, w: 22, h: h2, shape: 'spring', moving: true, phase: Math.random() * Math.PI * 2, baseY, amplitude: 34 })
  },
  (push, groundY) => {
    const s = 56 + Math.random() * 14, h2 = 72 + Math.random() * 16
    push({ x: CANVAS_W + 10, y: groundY - s, w: s, h: s, shape: 'flywheel' })
    push({ x: CANVAS_W + s + 22, y: groundY - h2, w: 48, h: h2, shape: 'hammer' })
  }
]
const dept1Bag = new ShuffleBag(dept1Spawners)

const dept2Spawners: SpawnFn[] = [
  (push, groundY) => {
    const w = 84 + Math.random() * 40, h = 22 + Math.random() * 10
    push({ x: CANVAS_W + 10, y: groundY - h, w, h, shape: 'resistor' })
  },
  (push, groundY) => {
    const h = 40 + Math.random() * 22
    push({ x: CANVAS_W + 10, y: groundY - h, w: 18 + Math.random() * 6, h, shape: 'coil' })
  },
  (push, groundY) => {
    const h = 40 + Math.random() * 22
    push({ x: CANVAS_W + 10, y: groundY - h, w: 30 + Math.random() * 14, h, shape: 'circuit' })
  },
  (push, groundY) => {
    const h = 46 + Math.random() * 20
    push({ x: CANVAS_W + 10, y: groundY - h, w: 34 + Math.random() * 12, h, shape: 'transistor' })
  },
  (push, groundY) => {
    const h = 46 + Math.random() * 24
    push({ x: CANVAS_W + 10, y: groundY - h, w: 24 + Math.random() * 8, h, shape: 'capacitor' })
  },
  (push, groundY) => {
    const s = 30 + Math.random() * 10; const baseY = groundY - s - 6
    push({ x: CANVAS_W + 10, y: baseY, w: s, h: s, shape: 'electron', moving: true, phase: Math.random() * Math.PI * 2, baseY, amplitude: 46 })
  },
  (push, groundY) => {
    const s = 54 + Math.random() * 16
    push({ x: CANVAS_W + 10, y: groundY - s, w: s, h: s, shape: 'arc_ring' })
  },
  (push, groundY) => {
    const h = 72 + Math.random() * 20
    push({ x: CANVAS_W + 10, y: groundY - h, w: 40 + Math.random() * 12, h, shape: 'tesla' })
  },
  (push, groundY) => {
    const h = 144 + Math.random() * 12
    push({ x: CANVAS_W + 10, y: groundY - h, w: 50 + Math.random() * 16, h, shape: 'pylon' })
  },
  (push, groundY) => {
    const h1 = 22 + Math.random() * 8; const s = 30 + Math.random() * 8, baseY = groundY - s - 6
    push({ x: CANVAS_W + 10, y: groundY - h1, w: 80, h: h1, shape: 'resistor' })
    push({ x: CANVAS_W + 98, y: baseY, w: s, h: s, shape: 'electron', moving: true, phase: Math.random() * Math.PI * 2, baseY, amplitude: 42 })
  },
  (push, groundY) => {
    const s = 52 + Math.random() * 12, h2 = 70 + Math.random() * 14
    push({ x: CANVAS_W + 10, y: groundY - s, w: s, h: s, shape: 'arc_ring' })
    push({ x: CANVAS_W + s + 24, y: groundY - h2, w: 38, h: h2, shape: 'tesla' })
  }
]
const dept2Bag = new ShuffleBag(dept2Spawners)

const dept3RedSpawners: SpawnFn[] = [
  (push, groundY) => {
    const s = 40 + Math.random() * 12; const baseY = groundY - 54 - Math.random() * 20
    push({ x: CANVAS_W + 10, y: baseY, w: s, h: s, shape: 'syntax_error', moving: true, phase: Math.random() * Math.PI * 2, baseY, amplitude: 22 })
  },
  (push, groundY) => {
    const h = 52 + Math.random() * 16
    push({ x: CANVAS_W + 10, y: groundY - h, w: 34 + Math.random() * 10, h, shape: 'malloc_free', phase: Math.floor(Math.random() * 100) })
  },
  (push, groundY) => {
    const w = 38 + Math.random() * 10, h = 56 + Math.random() * 16
    push({ x: CANVAS_W + 10, y: groundY - h, w, h, shape: 'null_pointer' })
  },
  (push, groundY) => {
    const w = 70 + Math.random() * 30, h = 40 + Math.random() * 14
    push({ x: CANVAS_W + 10, y: groundY - h, w, h, shape: 'merge_conflict' })
  },
  (push, groundY) => {
    const w = 48 + Math.random() * 16, h = 46 + Math.random() * 16
    push({ x: CANVAS_W + 10, y: groundY - h, w, h, shape: 'segfault' })
  },
  (push, groundY) => {
    const h = 74 + Math.random() * 22
    push({ x: CANVAS_W + 10, y: groundY - h, w: 40 + Math.random() * 12, h, shape: 'stack_overflow' })
  },
  (push, groundY) => {
    const h = 144 + Math.random() * 12
    push({ x: CANVAS_W + 10, y: groundY - h, w: 30 + Math.random() * 12, h, shape: 'firewall' })
  },
  (push, groundY) => {
    const h = 144 + Math.random() * 12
    push({ x: CANVAS_W + 10, y: groundY - h, w: 38 + Math.random() * 10, h, shape: 'blockchain' })
  },
  (push, groundY) => {
    const h = 56
    push({ x: CANVAS_W + 10, y: groundY - h, w: 36, h, shape: 'malloc_free', phase: Math.floor(Math.random() * 100) })
    const s = 46, baseY = groundY - 52
    push({ x: CANVAS_W + 96, y: baseY, w: s, h: s, shape: 'bug', stompable: true, moving: true, phase: Math.random() * Math.PI * 2, baseY, amplitude: 16 })
  }
]
const dept3RedBag = new ShuffleBag(dept3RedSpawners)

const dept4Spawners: SpawnFn[] = [
  (push, groundY) => {
    const n = Math.random() < 0.5 ? 2 : 3
    for (let i = 0; i < n; i++) {
      const h = 35 + Math.random() * 20
      push({ x: CANVAS_W + 10 + i * 44, y: groundY - h, w: 24 + Math.random() * 12, h, shape: 'bacteria' })
    }
  },
  (push, groundY) => {
    const h = 46 + Math.random() * 26
    push({ x: CANVAS_W + 10, y: groundY - h, w: 52 + Math.random() * 18, h, shape: 'bacteria' })
  },
  (push, groundY) => {
    const h = 58 + Math.random() * 22
    push({ x: CANVAS_W + 10, y: groundY - h, w: 30 + Math.random() * 10, h, shape: 'flask' })
  },
  (push, groundY) => {
    const h = 44 + Math.random() * 20
    push({ x: CANVAS_W + 10, y: groundY - h, w: 44 + Math.random() * 16, h, shape: 'mushroom' })
  },
  (push, groundY) => {
    const h1 = 55 + Math.random() * 18, h2 = 38 + Math.random() * 16
    push({ x: CANVAS_W + 10, y: groundY - h1, w: 28, h: h1, shape: 'flask' })
    push({ x: CANVAS_W + 74, y: groundY - h2, w: 38, h: h2, shape: 'bacteria' })
  }
]
const dept4Bag = new ShuffleBag(dept4Spawners)

const dept5Spawners: SpawnFn[] = [
  (push, groundY) => {
    const h = 52 + Math.random() * 36
    push({ x: CANVAS_W + 10, y: groundY - h, w: 26 + Math.random() * 12, h, shape: 'crystal' })
  },
  (push, groundY) => {
    const h1 = 48 + Math.random() * 26, h2 = 42 + Math.random() * 26
    push({ x: CANVAS_W + 10, y: groundY - h1, w: 24, h: h1, shape: 'crystal' })
    push({ x: CANVAS_W + 58, y: groundY - h2, w: 22, h: h2, shape: 'crystal' })
  },
  (push, groundY) => {
    const h = 22 + Math.random() * 14
    push({ x: CANVAS_W + 10, y: groundY - h, w: 46 + Math.random() * 24, h, shape: 'ingot' })
  },
  (push, groundY) => {
    const h = 40 + Math.random() * 24
    push({ x: CANVAS_W + 10, y: groundY - h, w: 40 + Math.random() * 18, h, shape: 'lattice' })
  },
  (push, groundY) => {
    for (let i = 0; i < 3; i++) {
      const h = 38 + Math.random() * 34 * (i + 1) / 3
      push({ x: CANVAS_W + 10 + i * 36, y: groundY - h, w: 20, h, shape: 'crystal' })
    }
  },
  (push, groundY) => {
    const h1 = 22 + Math.random() * 12, h2 = 52 + Math.random() * 24
    push({ x: CANVAS_W + 10, y: groundY - h1, w: 46, h: h1, shape: 'ingot' })
    push({ x: CANVAS_W + 88, y: groundY - h2, w: 22, h: h2, shape: 'crystal' })
  }
]
const dept5Bag = new ShuffleBag(dept5Spawners)

export function resetSpawnerBags() {
  dept1Bag.reset()
  dept2Bag.reset()
  dept3RedBag.reset()
  dept4Bag.reset()
  dept5Bag.reset()
}

function spawnDept1(push: (o: ObstacleInit) => void, groundY: number) {
  dept1Bag.next()(push, groundY)
}

function spawnDept2(push: (o: ObstacleInit) => void, groundY: number) {
  dept2Bag.next()(push, groundY)
}

function spawnDept3(push: (o: ObstacleInit) => void, groundY: number) {
  const r = Math.random()
  if (r < 0.18) {
    const s = 46 + Math.random() * 12
    push({ x: CANVAS_W + 10, y: groundY - s, w: s, h: s, shape: 'bug', stompable: true })
  } else if (r < 0.34) {
    const s = 42 + Math.random() * 10
    const baseY = groundY - 50 - Math.random() * 22
    push({ x: CANVAS_W + 10, y: baseY, w: s, h: s, shape: 'bug', stompable: true, moving: true, phase: Math.random() * Math.PI * 2, baseY, amplitude: 26 })
  } else if (r < 0.46) {
    const s = 54 + Math.random() * 14
    push({ x: CANVAS_W + 10, y: groundY - s, w: s, h: s, shape: 'bug', stompable: true })
  } else if (r < 0.50) {
    const n = Math.random() < 0.5 ? 2 : 3
    for (let i = 0; i < n; i++) {
      const s = 40
      const baseY = groundY - 50 - (i % 2) * 16
      push({ x: CANVAS_W + 10 + i * 64, y: baseY, w: s, h: s, shape: 'bug', stompable: true, moving: true, phase: Math.random() * Math.PI * 2, baseY, amplitude: 18 })
    }
  } else {
    dept3RedBag.next()(push, groundY)
  }
}

function spawnDept4(push: (o: ObstacleInit) => void, groundY: number) {
  dept4Bag.next()(push, groundY)
}

function spawnDept5(push: (o: ObstacleInit) => void, groundY: number) {
  dept5Bag.next()(push, groundY)
}
