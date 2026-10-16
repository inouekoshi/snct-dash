'use client'

import { useEffect } from 'react'

// 本番ビルドでだけ Service Worker を登録する（開発中はキャッシュで混乱しないように登録しない）
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).catch(() => {})
  }, [])
  return null
}
