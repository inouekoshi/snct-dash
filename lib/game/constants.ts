export const GROUND_Y = 220
export const CANVAS_W = 800
export const CANVAS_H = 280
export const PLAYER_X = 110
export const GRAVITY = 0.65
export const JUMP_VY = -13.5
export const AREA_DURATION = 40 * 60 // 40 seconds × 60 fps

// Speed per area (increases significantly each stage)
export const AREA_SPEEDS: Record<number, number> = { 1: 5, 2: 7.5, 3: 10.5, 4: 13.5, 5: 17 }

// [minFrames, randFrames] between obstacle spawns
export const SPAWN_GAPS: [number, number][] = [
  [0, 0], [110, 60], [85, 50], [65, 40], [50, 32], [36, 26],
]
