import Link from 'next/link'
import SponsorCredit from '@/components/SponsorCredit'

// 存在しないURL・見つからないクリア記録（/r/[id] の notFound()）で出す画面
export default function NotFound() {
  return (
    <main className="relative flex flex-col items-center justify-center min-h-svh gap-6 px-4 pt-8 pb-14 text-center">
      <p className="text-5xl">🔍</p>
      <div className="space-y-2">
        <h1 className="text-2xl font-black">ページが見つかりません</h1>
        <p className="text-gray-400 text-sm">
          URL がまちがっているか、
          <br />
          シェアされた記録が削除された可能性があります
        </p>
      </div>
      <Link
        href="/"
        className="w-full max-w-xs py-4 bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-black text-xl rounded-2xl transition-colors"
      >
        高専ダッシュ！で遊ぶ
      </Link>
      <SponsorCredit />
    </main>
  )
}
