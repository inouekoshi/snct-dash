'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { AREAS, type AreaId } from '@/lib/game/areas'
import { NICKNAME_MAX, NICKNAME_STORAGE_KEY, normalizeNickname } from '@/lib/nickname'

const DEPARTMENTS: AreaId[] = [1, 2, 3, 4, 5]

export default function Home() {
  const [isMounted, setIsMounted] = useState(false)
  const [nickname, setNickname] = useState('')
  const [inputName, setInputName] = useState('')

  useEffect(() => {
    const saved = localStorage.getItem(NICKNAME_STORAGE_KEY)
    if (saved) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNickname(saved)
    }
    setIsMounted(true)
  }, [])

  const normalized = normalizeNickname(inputName)

  function handleNameSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!normalized) return
    localStorage.setItem(NICKNAME_STORAGE_KEY, normalized)
    setNickname(normalized)
  }

  if (!isMounted) return null

  if (!nickname) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen gap-6 px-4">
        <h2 className="text-3xl font-black">ニックネームを入力</h2>
        <p className="text-gray-400 text-sm">ランキングに表示される名前（最大{NICKNAME_MAX}文字）</p>
        <form onSubmit={handleNameSubmit} className="flex flex-col gap-4 w-full max-w-xs">
          <input
            type="text"
            value={inputName}
            onChange={(e) => setInputName(e.target.value)}
            placeholder="例: 高専太郎"
            maxLength={NICKNAME_MAX}
            aria-label="ニックネーム"
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white text-lg focus:outline-none focus:border-yellow-400"
            autoFocus
          />
          <button
            type="submit"
            disabled={!normalized}
            className="w-full py-4 bg-yellow-400 hover:bg-yellow-300 disabled:bg-gray-600 disabled:cursor-not-allowed text-gray-950 font-black text-xl rounded-2xl transition-colors"
          >
            次へ →
          </button>
        </form>
      </main>
    )
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen gap-8 px-4 py-8 text-center">
      <div className="space-y-2">
        <p className="text-blue-400 text-sm tracking-widest uppercase">鈴鹿高専祭</p>
        <h1 className="text-6xl font-black tracking-tight">
          高専ダッシュ<span className="text-yellow-400">！</span>
        </h1>
        <p className="text-gray-400 text-lg mt-2">
          5学科のステージを走り抜けろ！
        </p>
      </div>

      <div className="grid grid-cols-5 gap-3 text-xs">
        {DEPARTMENTS.map((id) => {
          const dept = AREAS[id]
          return (
            <div
              key={id}
              className="flex flex-col items-center gap-1 p-2 rounded-lg border"
              style={{ borderColor: `${dept.groundLineColor}88`, backgroundColor: `${dept.groundLineColor}1a` }}
            >
              <span className="text-2xl">{dept.emoji}</span>
              <span className="text-gray-300">{dept.name.replace(/工学科|学科$/, '')}</span>
            </div>
          )
        })}
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

      <div className="text-gray-500 text-xs space-y-1">
        <p>スペース / タップ：ジャンプ（空中でもう一度で二段ジャンプ）</p>
        <p>学科ごとにルールが変わる！ クリアタイムで競おう</p>
      </div>

      <button
        onClick={() => {
          setNickname('')
          setInputName('')
          localStorage.removeItem(NICKNAME_STORAGE_KEY)
        }}
        className="mt-2 text-gray-500 hover:text-gray-300 text-xs transition-colors underline"
      >
        名前を変更する ({nickname})
      </button>
    </main>
  )
}
