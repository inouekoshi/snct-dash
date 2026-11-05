import type { AreaId } from '@/lib/game/areas'

// 高専祭の最終結果（クロージング画面用）。
// 高専祭が終わった後も遊べるので、ランキングは動き続ける。ここでは終了時点の結果を固定して持つ。
// 集計期間: 公開日（2026-10-19）〜 高専祭終了（2026-11-01 15:00 JST）。本番DBから 2026-11-05 に集計した。
//   plays   = runs の件数（プレイ開始数）
//   clears  = runs のうちゴールした件数
//   players = stage_clears（非表示を除く）のニックネームの種類数
//   champions = 学科ごとの最速記録（非表示を除く。同タイムは先に出した人）

export const FESTIVAL_PERIOD_LABEL = '10/19 公開 〜 11/1 高専祭終了'

export const FESTIVAL_TOTALS = {
  plays: 4937,
  clears: 666,
  players: 185,
}

export interface DepartmentResult {
  department: AreaId
  plays: number
  clears: number
  champion: { nickname: string; clearTimeMs: number }
}

export const DEPARTMENT_RESULTS: DepartmentResult[] = [
  { department: 1, plays: 2036, clears: 211, champion: { nickname: '1024', clearTimeMs: 108083 } },
  { department: 2, plays: 566, clears: 156, champion: { nickname: 'sugiokaSUB', clearTimeMs: 104783 } },
  { department: 3, plays: 1176, clears: 94, champion: { nickname: 'h27i10', clearTimeMs: 92183 } },
  { department: 4, plays: 357, clears: 73, champion: { nickname: 'sugiokaSUB', clearTimeMs: 149000 } },
  { department: 5, plays: 802, clears: 132, champion: { nickname: '1024', clearTimeMs: 90493 } },
]
