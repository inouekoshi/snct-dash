import type { TerrainSegment } from './engine-types'
import { STAGE_LENGTH, CANVAS_W, DEFAULT_GROUND_Y } from './constants'

// ステージ開始時に全地形を一括生成する。
export function buildStage(departmentId: number): TerrainSegment[] {
  if (departmentId === 1) return buildStageMech()
  return buildStageDefault()
}

function buildStageDefault(): TerrainSegment[] {
  const segments: TerrainSegment[] = []
  let cursor = 0

  segments.push({ type: 'ground', stageX: 0, width: 500, groundY: DEFAULT_GROUND_Y })
  cursor = 500

  const SAFE_ZONE_END = STAGE_LENGTH - 600

  while (cursor < SAFE_ZONE_END) {
    const groundWidth = 200 + Math.random() * 250
    segments.push({ type: 'ground', stageX: cursor, width: groundWidth, groundY: DEFAULT_GROUND_Y })
    cursor += groundWidth

    if (cursor >= SAFE_ZONE_END) break

    if (Math.random() < 0.4) {
      const holeWidth = 100 + Math.random() * 80
      segments.push({ type: 'hole', stageX: cursor, width: holeWidth })
      cursor += holeWidth
    }
  }

  segments.push({
    type: 'ground',
    stageX: cursor,
    width: STAGE_LENGTH + CANVAS_W - cursor + 200,
    groundY: DEFAULT_GROUND_Y,
  })

  return segments
}

// 機械工学科専用地形：段差あり・やや短い地面幅・穴多め
function buildStageMech(): TerrainSegment[] {
  const segments: TerrainSegment[] = []
  let cursor = 0
  let currentLevel = DEFAULT_GROUND_Y

  segments.push({ type: 'ground', stageX: 0, width: 500, groundY: DEFAULT_GROUND_Y })
  cursor = 500

  const SAFE_ZONE_END = STAGE_LENGTH - 600

  while (cursor < SAFE_ZONE_END) {
    // 段差：30%確率で切り替え
    if (Math.random() < 0.3) {
      currentLevel = currentLevel === DEFAULT_GROUND_Y ? DEFAULT_GROUND_Y - 22 : DEFAULT_GROUND_Y
    }

    const groundWidth = 160 + Math.random() * 220
    segments.push({ type: 'ground', stageX: cursor, width: groundWidth, groundY: currentLevel })
    cursor += groundWidth

    if (cursor >= SAFE_ZONE_END) break

    if (Math.random() < 0.45) {
      const holeWidth = 110 + Math.random() * 90
      segments.push({ type: 'hole', stageX: cursor, width: holeWidth })
      cursor += holeWidth
      currentLevel = DEFAULT_GROUND_Y
    }
  }

  segments.push({
    type: 'ground',
    stageX: cursor,
    width: STAGE_LENGTH + CANVAS_W - cursor + 200,
    groundY: DEFAULT_GROUND_Y,
  })

  return segments
}
