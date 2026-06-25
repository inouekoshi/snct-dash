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
