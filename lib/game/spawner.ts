import type { AreaId } from './areas'
import type { Obstacle, Coin } from './engine-types'
import { CANVAS_W, GROUND_Y } from './constants'

type ObstacleInit = Pick<Obstacle, 'x' | 'y' | 'w' | 'h' | 'shape'> & Partial<Pick<Obstacle, 'moving' | 'phase' | 'baseY' | 'amplitude'>>

function makeObstacle(o: ObstacleInit): Obstacle {
  return { moving: false, phase: 0, baseY: o.y, amplitude: 0, ...o }
}

export function spawnObstacle(area: AreaId, obstacles: Obstacle[]) {
  const push = (o: ObstacleInit) => obstacles.push(makeObstacle(o))
  if (area === 1) spawnA1(push)
  else if (area === 2) spawnA2(push)
  else if (area === 3) spawnA3(push)
  else if (area === 4) spawnA4(push)
  else spawnA5(push)
}

export function spawnCeilingObstacle(obstacles: Obstacle[]) {
  const count = Math.random() < 0.3 ? 2 : 1
  for (let i = 0; i < count; i++) {
    const w = 32 + Math.random() * 28
    const h = 100 + Math.random() * 50
    const xOffset = i * (w + 20 + Math.random() * 30)
    obstacles.push({ x: CANVAS_W + 10 + xOffset, y: 0, w, h, shape: 'stalactite', moving: false, phase: 0, baseY: 0, amplitude: 0 })
  }
}

export function spawnCoin(coins: Coin[]) {
  coins.push({ x: CANVAS_W + 20, y: GROUND_Y - 55 - Math.random() * 50, collected: false, wobble: Math.random() * Math.PI * 2 })
}

// Area 1 機械工学科: gear / bolt / piston
function spawnA1(push: (o: ObstacleInit) => void) {
  const r = Math.random()
  if (r < 0.32) {
    const h = 30 + Math.random() * 28
    push({ x: CANVAS_W + 10, y: GROUND_Y - h, w: 28 + Math.random() * 16, h, shape: 'gear' })
  } else if (r < 0.62) {
    const h = 44 + Math.random() * 24
    push({ x: CANVAS_W + 10, y: GROUND_Y - h, w: 20 + Math.random() * 8, h, shape: 'bolt' })
  } else if (r < 0.84) {
    const h = 38 + Math.random() * 22
    push({ x: CANVAS_W + 10, y: GROUND_Y - h, w: 26 + Math.random() * 10, h, shape: 'piston' })
  } else {
    const h1 = 30 + Math.random() * 20, h2 = 44 + Math.random() * 18
    push({ x: CANVAS_W + 10, y: GROUND_Y - h1, w: 28, h: h1, shape: 'gear' })
    push({ x: CANVAS_W + 66, y: GROUND_Y - h2, w: 20, h: h2, shape: 'bolt' })
  }
}

// Area 2 電気電子工学科: circuit / coil / capacitor
function spawnA2(push: (o: ObstacleInit) => void) {
  const r = Math.random()
  if (r < 0.28) {
    const h = 36 + Math.random() * 26
    push({ x: CANVAS_W + 10, y: GROUND_Y - h, w: 30 + Math.random() * 14, h, shape: 'circuit' })
  } else if (r < 0.52) {
    const h = 44 + Math.random() * 24
    push({ x: CANVAS_W + 10, y: GROUND_Y - h, w: 18 + Math.random() * 6, h, shape: 'coil' })
  } else if (r < 0.74) {
    const h = 44 + Math.random() * 26
    push({ x: CANVAS_W + 10, y: GROUND_Y - h, w: 22 + Math.random() * 8, h, shape: 'capacitor' })
  } else {
    const h1 = 36 + Math.random() * 22, h2 = 32 + Math.random() * 20
    push({ x: CANVAS_W + 10, y: GROUND_Y - h1, w: 28, h: h1, shape: 'circuit' })
    push({ x: CANVAS_W + 74, y: GROUND_Y - h2, w: 26, h: h2, shape: 'circuit' })
  }
}

// Area 3 電子情報工学科: bug / monitor / chip
function spawnA3(push: (o: ObstacleInit) => void) {
  const r = Math.random()
  if (r < 0.35) {
    const baseY = GROUND_Y - 32
    push({ x: CANVAS_W + 10, y: baseY, w: 30, h: 30, shape: 'bug', moving: true, phase: Math.random() * Math.PI * 2, baseY, amplitude: 52 })
  } else if (r < 0.55) {
    const h = 44 + Math.random() * 20
    push({ x: CANVAS_W + 10, y: GROUND_Y - h, w: 44 + Math.random() * 16, h, shape: 'monitor' })
  } else if (r < 0.74) {
    const h = 26 + Math.random() * 16
    push({ x: CANVAS_W + 10, y: GROUND_Y - h, w: 46 + Math.random() * 18, h, shape: 'chip' })
  } else if (r < 0.88) {
    const h = 34 + Math.random() * 22
    push({ x: CANVAS_W + 10, y: GROUND_Y - h, w: 32, h, shape: 'bug' })
  } else {
    const h1 = 34 + Math.random() * 14, h2 = 26 + Math.random() * 14
    push({ x: CANVAS_W + 10, y: GROUND_Y - h1, w: 30, h: h1, shape: 'bug' })
    push({ x: CANVAS_W + 72, y: GROUND_Y - h2, w: 44, h: h2, shape: 'chip' })
  }
}

// Area 4 生物応用化学科: bacteria / flask / mushroom
function spawnA4(push: (o: ObstacleInit) => void) {
  const r = Math.random()
  if (r < 0.26) {
    const n = Math.random() < 0.5 ? 2 : 3
    for (let i = 0; i < n; i++) {
      const h = 35 + Math.random() * 20
      push({ x: CANVAS_W + 10 + i * 44, y: GROUND_Y - h, w: 24 + Math.random() * 12, h, shape: 'bacteria' })
    }
  } else if (r < 0.48) {
    const h = 46 + Math.random() * 26
    push({ x: CANVAS_W + 10, y: GROUND_Y - h, w: 52 + Math.random() * 18, h, shape: 'bacteria' })
  } else if (r < 0.66) {
    const h = 58 + Math.random() * 22
    push({ x: CANVAS_W + 10, y: GROUND_Y - h, w: 30 + Math.random() * 10, h, shape: 'flask' })
  } else if (r < 0.84) {
    const h = 44 + Math.random() * 20
    push({ x: CANVAS_W + 10, y: GROUND_Y - h, w: 44 + Math.random() * 16, h, shape: 'mushroom' })
  } else {
    const h1 = 55 + Math.random() * 18, h2 = 38 + Math.random() * 16
    push({ x: CANVAS_W + 10, y: GROUND_Y - h1, w: 28, h: h1, shape: 'flask' })
    push({ x: CANVAS_W + 74, y: GROUND_Y - h2, w: 38, h: h2, shape: 'bacteria' })
  }
}

// Area 5 材料工学科: crystal / ingot / lattice
function spawnA5(push: (o: ObstacleInit) => void) {
  const r = Math.random()
  if (r < 0.22) {
    const h = 52 + Math.random() * 36
    push({ x: CANVAS_W + 10, y: GROUND_Y - h, w: 26 + Math.random() * 12, h, shape: 'crystal' })
  } else if (r < 0.38) {
    const h1 = 48 + Math.random() * 26, h2 = 42 + Math.random() * 26
    push({ x: CANVAS_W + 10, y: GROUND_Y - h1, w: 24, h: h1, shape: 'crystal' })
    push({ x: CANVAS_W + 58, y: GROUND_Y - h2, w: 22, h: h2, shape: 'crystal' })
  } else if (r < 0.54) {
    const h = 22 + Math.random() * 14
    push({ x: CANVAS_W + 10, y: GROUND_Y - h, w: 46 + Math.random() * 24, h, shape: 'ingot' })
  } else if (r < 0.70) {
    const h = 40 + Math.random() * 24
    push({ x: CANVAS_W + 10, y: GROUND_Y - h, w: 40 + Math.random() * 18, h, shape: 'lattice' })
  } else if (r < 0.84) {
    for (let i = 0; i < 3; i++) {
      const h = 38 + Math.random() * 34 * (i + 1) / 3
      push({ x: CANVAS_W + 10 + i * 36, y: GROUND_Y - h, w: 20, h, shape: 'crystal' })
    }
  } else {
    const h1 = 22 + Math.random() * 12, h2 = 52 + Math.random() * 24
    push({ x: CANVAS_W + 10, y: GROUND_Y - h1, w: 46, h: h1, shape: 'ingot' })
    push({ x: CANVAS_W + 88, y: GROUND_Y - h2, w: 22, h: h2, shape: 'crystal' })
  }
}
