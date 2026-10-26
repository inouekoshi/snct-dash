import { NICKNAME_STORAGE_KEY } from '@/lib/nickname'

// ニックネームの保存（ブラウザ側）。
// localStorage は Safari で Cookie を全部ブロックしているときなどに、読み書きするだけで例外が出る。
// そのときはメモリに持っておき、ページを開いている間（画面遷移しても）は遊べるようにする。
let memory: string | null = null

export function loadNickname(): string | null {
  try {
    return localStorage.getItem(NICKNAME_STORAGE_KEY) ?? memory
  } catch {
    return memory
  }
}

export function saveNickname(name: string): void {
  memory = name
  try {
    localStorage.setItem(NICKNAME_STORAGE_KEY, name)
  } catch {
    // 保存できない環境ではメモリだけで覚える
  }
}

export function clearNickname(): void {
  memory = null
  try {
    localStorage.removeItem(NICKNAME_STORAGE_KEY)
  } catch {
    // 同上
  }
}
