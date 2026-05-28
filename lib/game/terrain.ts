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

// 機械工学科専用地形：短い地面・穴パターン3種（通常/精度/連続）で差別化
// 注: エンジンの段差スナップ仕様上、高さ変化はジャンプ要求にならないため廃止
function buildStageMech(): TerrainSegment[] {
  const segments: TerrainSegment[] = []
  let cursor = 0

  segments.push({ type: 'ground', stageX: 0, width: 500, groundY: DEFAULT_GROUND_Y })
  cursor = 500

  const SAFE_ZONE_END = STAGE_LENGTH - 600

  while (cursor < SAFE_ZONE_END) {
    const groundWidth = 140 + Math.random() * 180
    segments.push({ type: 'ground', stageX: cursor, width: groundWidth, groundY: DEFAULT_GROUND_Y })
    cursor += groundWidth

    if (cursor >= SAFE_ZONE_END) break

    if (Math.random() < 0.52) {
      const pat = Math.random()
      if (pat < 0.45) {
        // 通常の穴
        const holeWidth = 110 + Math.random() * 70
        segments.push({ type: 'hole', stageX: cursor, width: holeWidth })
        cursor += holeWidth
      } else if (pat < 0.75) {
        // 精度が必要な狭い穴（着地タイミング要求）
        const holeWidth = 65 + Math.random() * 30
        segments.push({ type: 'hole', stageX: cursor, width: holeWidth })
        cursor += holeWidth
      } else if (cursor + 360 < SAFE_ZONE_END) {
        // 連続穴：小さな足場を挟んだ2連ホール
        const w1 = 95 + Math.random() * 45
        const bridge = 65 + Math.random() * 45
        const w2 = 95 + Math.random() * 45
        segments.push({ type: 'hole', stageX: cursor, width: w1 })
        cursor += w1
        segments.push({ type: 'ground', stageX: cursor, width: bridge, groundY: DEFAULT_GROUND_Y })
        cursor += bridge
        if (cursor < SAFE_ZONE_END) {
          segments.push({ type: 'hole', stageX: cursor, width: w2 })
          cursor += w2
        }
      } else {
        const holeWidth = 100 + Math.random() * 60
        segments.push({ type: 'hole', stageX: cursor, width: holeWidth })
        cursor += holeWidth
      }
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
