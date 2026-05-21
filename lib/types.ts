// 旧型（Phase 2でengine.ts/Leaderboard.tsx書き換え後に削除予定）
export interface GameResult {
  score: number
  distance: number
  maxArea: number
  lap: number
}

export interface ScoreEntry {
  id: string
  nickname: string
  score: number
  distance: number
  max_area: number
  created_at: string
}

export type LeaderboardFilter = 'all' | 'today'

// 新型
export interface GameClearResult {
  timeMs: number
  departmentId: number
}

export interface StageClearEntry {
  id: string
  nickname: string
  department: number
  clear_time_ms: number
  played_at: string
}
