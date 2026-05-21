export interface GameClearResult {
  timeMs: number       // クリアタイム（ミリ秒）
  departmentId: number // 学科ID（1〜5）
}

export interface StageClearEntry {
  id: string
  nickname: string
  department: number
  clear_time_ms: number
  played_at: string
}
