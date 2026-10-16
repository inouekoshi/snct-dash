import type { AreaId } from './areas'
import {
  STAGE_LENGTH, SPEED_START, SPEED_END, BIO_SPEED_START, BIO_SPEED_END, DEBUG_SPEED_MULT, MAT_BOOST_MAX,
} from './constants'

// クリアタイムの受付範囲。サーバー（API・DB関数）で不正タイムを弾くのに使う。
//
// 下限は「物理的にこれより速くは走れない」タイムから約3%の余裕を引いた値。
// DB関数 public.min_clear_time_ms()（supabase/migrations）にも同じ値を書いているので、
// 変えるときは両方を直す（tests/unit/limits.test.ts が定数との整合をチェックする）。
// ステージの長さ・速度・加速倍率を変えたら theoreticalMinClearMs() が変わるので、テストが落ちたら見直すこと。
export const MIN_CLEAR_TIME_MS: Record<AreaId, number> = {
  1: 100_000, // 機械：段差で止まらず常に最高効率（理論値 約104.8秒）
  2: 100_000, // 電気電子（理論値 約104.8秒）
  3: 59_000,  // 電子情報：ずっとデバッグモード（×1.7）でも約61.7秒
  4: 144_000, // 生物応化：スイムは遅い（理論値 約149.0秒）
  5: 100_000, // 材料：ブーストなし（理論値 約104.8秒）
}

export const MAX_CLEAR_TIME_MS = 600_000 // 10分

/** 学科ごとの理論最短タイム（ミスなし・加速ギミックを常に最大で受け続けた場合）。テスト用 */
export function theoreticalMinClearMs(departmentId: AreaId): number {
  const isBio = departmentId === 4
  const s0 = isBio ? BIO_SPEED_START : SPEED_START
  const s1 = isBio ? BIO_SPEED_END : SPEED_END
  const mult = departmentId === 3 ? DEBUG_SPEED_MULT : departmentId === 5 ? MAT_BOOST_MAX : 1
  let progress = 0
  let frames = 0
  while (progress < STAGE_LENGTH) {
    progress += (s0 + (s1 - s0) * Math.min(progress / STAGE_LENGTH, 1)) * mult
    frames++
  }
  return (frames * 1000) / 60
}

export function isValidClearTime(departmentId: AreaId, ms: number): boolean {
  return Number.isInteger(ms) && ms >= MIN_CLEAR_TIME_MS[departmentId] && ms <= MAX_CLEAR_TIME_MS
}
