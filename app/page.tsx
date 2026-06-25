'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const DEPARTMENTS = [
  { emoji: '⚙', name: '機械', color: 'bg-orange-900/40 border-orange-700' },
  { emoji: '⚡', name: '電気電子', color: 'bg-yellow-900/40 border-yellow-700' },
  { emoji: '💻', name: '電子情報', color: 'bg-blue-900/40 border-blue-700' },
  { emoji: '🧬', name: '生物応用', color: 'bg-green-900/40 border-green-700' },
  { emoji: '💎', name: '材料', color: 'bg-purple-900/40 border-purple-700' },
]

export default function Home() {
  const [isMounted, setIsMounted] = useState(false)
  const [nickname, setNickname] = useState('')
  const [inputName, setInputName] = useState('')

  useEffect(() => {
    const saved = localStorage.getItem('snct_nickname')
    if (saved) {
      setNickname(saved)
    }
    setIsMounted(true)
  }, [])

  function handleNameSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (inputName.trim().length === 0) return
    const name = inputName.trim().slice(0, 20)
    localStorage.setItem('snct_nickname', name)
    setNickname(name)
  }

  if (!isMounted) return null

  if (!nickname) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen gap-6 px-4">
        <h2 className="text-3xl font-black">ニックネームを入力</h2>
        <p className="text-gray-400 text-sm">ランキングに表示される名前（最大20文字）</p>
        <form onSubmit={handleNameSubmit} className="flex flex-col gap-4 w-full max-w-xs">
          <input
            type="text"
            value={inputName}
            onChange={(e) => setInputName(e.target.value)}
            placeholder="例: 高専太郎"
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white text-lg focus:outline-none focus:border-yellow-400"
            autoFocus
          />
          <button
            type="submit"
            disabled={inputName.trim().length === 0}
            className="w-full py-4 bg-yellow-400 hover:bg-yellow-300 disabled:bg-gray-600 disabled:cursor-not-allowed text-gray-950 font-black text-xl rounded-2xl transition-colors"
          >
            次へ →
          </button>
        </form>
      </main>
    )
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen gap-8 px-4 text-center">
      <div className="space-y-2">
        <p className="text-blue-400 text-sm tracking-widest uppercase">鈴鹿高専祭</p>
        <h1 className="text-6xl font-black tracking-tight">
          高専ダッシュ<span className="text-yellow-400">！</span>
        </h1>
        <p className="text-gray-400 text-lg mt-2">
          5学科のエリアを走り抜けろ！
        </p>
      </div>

      <div className="grid grid-cols-5 gap-3 text-xs">
        {DEPARTMENTS.map((dept) => (
          <div
            key={dept.name}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg border ${dept.color}`}
          >
            <span className="text-2xl">{dept.emoji}</span>
            <span className="text-gray-300">{dept.name}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-4 w-full max-w-xs">
        <Link
          href="/game"
          className="w-full py-4 bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-black text-xl rounded-2xl transition-colors"
        >
          ゲームスタート
        </Link>
        <Link
          href="/leaderboard"
          className="w-full py-3 bg-gray-800 hover:bg-gray-700 text-white font-bold text-base rounded-2xl transition-colors border border-gray-700"
        >
          ランキングを見る 🏆
        </Link>
      </div>

      <div className="text-gray-600 text-xs space-y-1">
        <p>スペース / タップ：ジャンプ</p>
        <p>↓ / スワイプ下：スライディング</p>
      </div>
      
      <button 
        onClick={() => {
          setNickname('')
          setInputName('')
          localStorage.removeItem('snct_nickname')
        }}
        className="mt-4 text-gray-500 hover:text-gray-300 text-xs transition-colors underline"
      >
        名前を変更する ({nickname})
      </button>
    </main>
  )
}
