import type { ApiError, ApiErrorCode } from '@/lib/types'

// DB関数（supabase/migrations）が raise する例外メッセージ → HTTP ステータスと画面向けの文言
const ERRORS: Record<ApiErrorCode, { status: number; message: string }> = {
  invalid_request:      { status: 400, message: 'リクエストの形式が正しくありません' },
  invalid_department:   { status: 400, message: '学科の指定が正しくありません' },
  invalid_nickname:     { status: 400, message: 'ニックネームは1〜20文字にしてください' },
  nickname_rejected:    { status: 422, message: 'このニックネームは使えません。名前を変えてもう一度遊んでね' },
  invalid_time:         { status: 422, message: 'クリアタイムが正しくありません' },
  time_mismatch:        { status: 422, message: 'クリアタイムが正しくありません' },
  run_not_found:        { status: 404, message: 'プレイ情報が見つかりません' },
  run_already_finished: { status: 409, message: 'このプレイはすでに登録済みです' },
  run_expired:          { status: 410, message: 'プレイ開始から時間が経ちすぎたため登録できません' },
  rate_limited:         { status: 429, message: '短時間に何度も始めすぎです。少し待ってから遊んでね' },
  department_maintenance: { status: 503, message: 'この学科のステージはメンテナンス中です' },
  server_error:         { status: 500, message: 'サーバーでエラーが起きました' },
}

export function apiError(code: ApiErrorCode, extraHeaders?: HeadersInit): Response {
  const { status, message } = ERRORS[code]
  const body: ApiError = { error: message, code }
  return Response.json(body, { status, headers: extraHeaders })
}

/** Supabase（PostgREST）のエラーを ApiErrorCode に変換する。知らないものは server_error */
export function codeFromDbError(err: { message?: string } | null | undefined): ApiErrorCode {
  const msg = err?.message ?? ''
  return msg in ERRORS ? (msg as ApiErrorCode) : 'server_error'
}
