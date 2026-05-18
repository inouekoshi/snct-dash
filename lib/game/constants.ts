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

// Lap (loop) difficulty scaling
export const LAP_SPEED_SCALE = 0.15   // +15% speed per lap
export const LAP_SPAWN_SCALE = 0.07   // -7% spawn interval per lap
export const MIN_SPAWN_SCALE = 0.5    // spawn interval floor
export const MAX_SPEED_SCALE = 3.0    // speed multiplier ceiling

// A2: Coyote time + jump buffer
export const COYOTE_FRAMES = 5       // frames after leaving ground where first jump is still available
export const JUMP_BUFFER_FRAMES = 8  // frames a premature jump input is remembered

// A3: Hit stop
export const HIT_STOP_FRAMES = 6     // ~0.1s freeze on shield hit
