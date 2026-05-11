'use client'

/**
 * ゲームメインコンポーネント（antigravityが実装）
 *
 * このコンポーネントはCanvas APIを使ったエンドレスランナーゲームを実装する。
 *
 * Props:
 *   nickname: string - プレイヤーのニックネーム（表示用）
 *   onGameOver: (result: GameResult) => void - ゲームオーバー時に呼び出すコールバック
 *
 * GameResult:
 *   score: number - 最終スコア (0〜999999)
 *   distance: number - 走った距離 (px単位整数)
 *   maxArea: number - 到達した最大エリア番号 (1〜5)
 *
 * 5学科エリア順序: 機械(1) → 電気電子(2) → 電子情報(3) → 生物応用化学(4) → 材料(5) → ループ
 *
 * 操作:
 *   - スペースキー / タップ: ジャンプ
 *   - ↓キー / スワイプ下: スライディング
 */

import type { GameResult } from '@/lib/types'

interface GameProps {
  nickname: string
  onGameOver: (result: GameResult) => void
}

export default function Game({ nickname, onGameOver }: GameProps) {
  // TODO: antigravityがCanvas APIを使ったゲームロジックを実装する
  // 仮のUI（実装前のプレースホルダー）
  return (
    <main className="flex flex-col items-center justify-center min-h-screen gap-6 px-4">
      <p className="text-gray-400">🎮 ゲーム実装中... {nickname}</p>
      <button
        onClick={() => onGameOver({ score: 1234, distance: 567, maxArea: 3 })}
        className="px-6 py-3 bg-yellow-400 text-gray-950 font-bold rounded-xl"
      >
        テスト: ゲームオーバー
      </button>
    </main>
  )
}
