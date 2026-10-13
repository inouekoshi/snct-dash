// ニックネームの整形。入力画面（app/page.tsx）と API（app/api/stage-clears）で共通。
// 禁止語のチェックは DB関数 submit_clear()（ng_words テーブル）で行う。
export const NICKNAME_MAX = 20
export const NICKNAME_STORAGE_KEY = 'snct_nickname'

/** 前後の空白を除き、制御文字を取り除く。空や長すぎる場合は null */
export function normalizeNickname(input: string): string | null {
  const name = input.replace(/[\u0000-\u001f\u007f]/g, '').trim()
  if (name.length === 0 || [...name].length > NICKNAME_MAX) return null
  return name
}
