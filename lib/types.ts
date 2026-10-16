export interface GameClearResult {
  timeMs: number       // クリアタイム（ゲーム内時間・ミリ秒）
  departmentId: number // 学科ID（1〜5）
  misses: number       // ミス（ノックバック）の回数
}

export interface StageClearEntry {
  id: string
  nickname: string
  department: number
  clear_time_ms: number
  played_at: string
}

/** POST /api/runs のレスポンス */
export interface StartRunResponse {
  runId: string
}

/** POST /api/stage-clears のレスポンス */
export interface SubmitClearResponse {
  id: string             // 登録したクリアのID（シェアページ /r/[id] に使う）
  rank: number           // 自己ベストでの順位（同じニックネームは最速1件で数える）
  bestMs: number         // 自己ベスト
  isPersonalBest: boolean
  totalPlayers: number   // その学科のプレイヤー数（ニックネーム数）
}

/** API のエラーレスポンス。code は画面の文言の出し分けに使う */
export interface ApiError {
  error: string
  code: ApiErrorCode
}

export type ApiErrorCode =
  | 'invalid_request'
  | 'invalid_department'
  | 'invalid_nickname'
  | 'nickname_rejected'
  | 'invalid_time'
  | 'time_mismatch'
  | 'run_not_found'
  | 'run_already_finished'
  | 'run_expired'
  | 'rate_limited'
  | 'department_maintenance'
  | 'server_error'
