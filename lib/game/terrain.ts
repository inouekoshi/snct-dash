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

// 機械工学科専用地形：穴パターン2種（通常/連続）＋段差で差別化
function buildStageMech(): TerrainSegment[] {
  const segments: TerrainSegment[] = []
  let cursor = 0
  let currentLevel = DEFAULT_GROUND_Y  // 現在の地面高さ（段差で変化）

  segments.push({ type: 'ground', stageX: 0, width: 500, groundY: DEFAULT_GROUND_Y })
  cursor = 500

  const SAFE_ZONE_END = STAGE_LENGTH - 600

  while (cursor < SAFE_ZONE_END) {
    const groundWidth = 140 + Math.random() * 180
    segments.push({ type: 'ground', stageX: cursor, width: groundWidth, groundY: currentLevel })
    cursor += groundWidth

    if (cursor >= SAFE_ZONE_END) break

    const pat = Math.random()
    if (pat < 0.22) {
      // 段差（上/下トグル）
      currentLevel = currentLevel === DEFAULT_GROUND_Y
        ? DEFAULT_GROUND_Y - 35
        : DEFAULT_GROUND_Y
    } else if (pat < 0.62) {
      // 通常の穴
      const holeWidth = 110 + Math.random() * 70
      segments.push({ type: 'hole', stageX: cursor, width: holeWidth })
      cursor += holeWidth
      currentLevel = DEFAULT_GROUND_Y  // 穴後は基準高さへ
    } else if (pat < 0.82 && cursor + 360 < SAFE_ZONE_END) {
      // 連続穴：小さな足場を挟んだ2連ホール
      const w1 = 110 + Math.random() * 50
      const bridge = 65 + Math.random() * 45
      const w2 = 110 + Math.random() * 50
      segments.push({ type: 'hole', stageX: cursor, width: w1 })
      cursor += w1
      segments.push({ type: 'ground', stageX: cursor, width: bridge, groundY: DEFAULT_GROUND_Y })
      cursor += bridge
      currentLevel = DEFAULT_GROUND_Y
      if (cursor < SAFE_ZONE_END) {
        segments.push({ type: 'hole', stageX: cursor, width: w2 })
        cursor += w2
        currentLevel = DEFAULT_GROUND_Y
      }
    }
    // else: 特に変化なし（地形継続）
  }

  segments.push({
    type: 'ground',
    stageX: cursor,
    width: STAGE_LENGTH + CANVAS_W - cursor + 200,
    groundY: DEFAULT_GROUND_Y,
  })

  return segments
}
