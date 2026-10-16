import { createHash } from 'node:crypto'

// 連続プレイ開始の制限に使う「クライアントの鍵」。生の IP は保存せず、ハッシュの先頭だけを使う。
// Vercel では x-forwarded-for の先頭が接続元 IP（Vercel が付け直すので偽装できない）。
export function clientKeyFrom(headers: Headers): string | null {
  const ip = headers.get('x-forwarded-for')?.split(',')[0]?.trim() || headers.get('x-real-ip')
  if (!ip) return null
  return createHash('sha256').update(`kosendash:${ip}`).digest('hex').slice(0, 32)
}

export type Device = 'mobile' | 'tablet' | 'desktop' | 'unknown'

export function deviceFrom(userAgent: string | null): Device {
  if (!userAgent) return 'unknown'
  if (/iPad|Tablet|Android(?!.*Mobile)/i.test(userAgent)) return 'tablet'
  if (/Mobi|iPhone|Android/i.test(userAgent)) return 'mobile'
  return 'desktop'
}
