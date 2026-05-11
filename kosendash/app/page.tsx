import Link from 'next/link'

const DEPARTMENTS = [
  { emoji: '⚙', name: '機械', color: 'bg-orange-900/40 border-orange-700' },
  { emoji: '⚡', name: '電気電子', color: 'bg-yellow-900/40 border-yellow-700' },
  { emoji: '💻', name: '電子情報', color: 'bg-blue-900/40 border-blue-700' },
  { emoji: '🧬', name: '生物応用', color: 'bg-green-900/40 border-green-700' },
  { emoji: '💎', name: '材料', color: 'bg-purple-900/40 border-purple-700' },
]

export default function Home() {
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
    </main>
  )
}
