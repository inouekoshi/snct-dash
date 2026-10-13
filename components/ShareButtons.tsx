'use client'

import { useState } from 'react'
import { formatTime } from '@/lib/format'

interface Props {
  clearId: string
  departmentName: string
  timeMs: number
  rank: number
}

// リザルトのシェア（X / LINE / 端末の共有メニュー / リンクコピー）。
// 共有するURL /r/[id] は、クリア記録を DB から読んでリザルト画像（OGP）付きで表示するページ。
export default function ShareButtons({ clearId, departmentName, timeMs, rank }: Props) {
  const [copied, setCopied] = useState(false)
  const url = typeof window === 'undefined' ? '' : `${window.location.origin}/r/${clearId}`
  const text = `高専ダッシュ！で${departmentName}を ${formatTime(timeMs)} でクリア！（${rank}位）\n#高専ダッシュ #鈴鹿高専祭`
  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  async function nativeShare() {
    try {
      await navigator.share({ title: '高専ダッシュ！', text, url })
    } catch {
      // キャンセルは無視
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // クリップボードが使えない環境は無視
    }
  }

  const btn = 'flex-1 py-2 rounded-xl font-bold text-sm text-white transition-opacity hover:opacity-90'
  return (
    <div className="w-full max-w-xs space-y-2" data-testid="share">
      <p className="text-xs text-gray-400">結果をシェアしよう</p>
      <div className="flex gap-2">
        <a
          className={`${btn} bg-black border border-gray-600`}
          href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          𝕏 ポスト
        </a>
        <a
          className={`${btn} bg-[#06C755]`}
          href={`https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          LINE
        </a>
        {canNativeShare ? (
          <button className={`${btn} bg-gray-700`} onClick={nativeShare}>共有…</button>
        ) : (
          <button className={`${btn} bg-gray-700`} onClick={copy}>{copied ? 'コピーした！' : 'リンクをコピー'}</button>
        )}
      </div>
    </div>
  )
}
