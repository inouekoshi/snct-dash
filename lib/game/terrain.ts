import type { TerrainSegment } from './engine-types'
import { STAGE_LENGTH, CANVAS_W, DEFAULT_GROUND_Y } from './constants'

// ステージ開始時に全地形を一括生成する。
export function buildStage(departmentId: number): TerrainSegment[] {
  if (departmentId === 1) return buildStageMech()
  if (departmentId === 2) return buildStageElec()
  if (departmentId === 3) return buildStageCode()
  if (departmentId === 4) return buildStageBio()
  return buildStageDefault()
}

// 生物応用化学科（液体スイム）専用地形：地面・壁・穴すべてなし。全画面が液体。
function buildStageBio(): TerrainSegment[] {
  return []
}

// 電子情報工学科専用地形：踏みつけのテンポと公平性を優先し、穴も段差も無い平坦。
// 踏み損ね＋穴落下の二重ミスを避け、「踏む／壁を越える」に集中させる。
function buildStageCode(): TerrainSegment[] {
  return [{
    type: 'ground',
    stageX: 0,
    width: STAGE_LENGTH + CANVAS_W + 200,
    groundY: DEFAULT_GROUND_Y,
  }]
}

// 電気電子工学科専用地形：穴も段差も無い完全な平坦。
// プレイヤーは「充電維持＋障害物回避」に集中する。機械工学科の山登り階段とも差別化。
function buildStageElec(): TerrainSegment[] {
  return [{
    type: 'ground',
    stageX: 0,
    width: STAGE_LENGTH + CANVAS_W + 200,
    groundY: DEFAULT_GROUND_Y,
  }]
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

// 機械工学科専用地形：穴は無し。段差を積み上げた「山登り」階段で差別化
const STEP_H = 40  // 1段の高さ。1ジャンプ（最大約140px）で余裕を持って越えられる

// 山型階段を1まとまり生成して新しい cursor を返す。
// 段（2〜4段）を上って頂上の平坦部に達する。下りは無く、頂上の端から基準高さへ急落下する。
function pushMountain(segments: TerrainSegment[], startCursor: number): number {
  let cursor = startCursor
  const steps = 2 + Math.floor(Math.random() * 3)  // 2〜4段

  // 上り
  for (let i = 1; i <= steps; i++) {
    const groundY = DEFAULT_GROUND_Y - STEP_H * i
    const width = 90 + Math.random() * 50
    segments.push({ type: 'ground', stageX: cursor, width, groundY })
    cursor += width
  }
  // 頂上の平坦部（この端から次の基準高さ地面へ急落下する）
  const topWidth = 120 + Math.random() * 60
  segments.push({ type: 'ground', stageX: cursor, width: topWidth, groundY: DEFAULT_GROUND_Y - STEP_H * steps })
  cursor += topWidth

  return cursor
}

function buildStageMech(): TerrainSegment[] {
  const segments: TerrainSegment[] = []
  let cursor = 0
  let currentLevel = DEFAULT_GROUND_Y  // 現在の地面高さ（単段差で変化）

  segments.push({ type: 'ground', stageX: 0, width: 500, groundY: DEFAULT_GROUND_Y })
  cursor = 500

  const SAFE_ZONE_END = STAGE_LENGTH - 600

  while (cursor < SAFE_ZONE_END) {
    const groundWidth = 140 + Math.random() * 180
    segments.push({ type: 'ground', stageX: cursor, width: groundWidth, groundY: currentLevel })
    cursor += groundWidth

    if (cursor >= SAFE_ZONE_END) break

    const pat = Math.random()
    if (pat < 0.45 && cursor + 700 < SAFE_ZONE_END) {
      // 山登り（メインギミック）：上って下る山型階段
      cursor = pushMountain(segments, cursor)
      currentLevel = DEFAULT_GROUND_Y  // 山型の後は必ず基準高さへ戻る
    } else if (pat < 0.70) {
      // 単段差（軽い起伏）：1段だけ上下トグル
      currentLevel = currentLevel === DEFAULT_GROUND_Y
        ? DEFAULT_GROUND_Y - STEP_H
        : DEFAULT_GROUND_Y
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
