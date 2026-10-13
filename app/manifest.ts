import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '高専ダッシュ！',
    short_name: '高専ダッシュ',
    description: '鈴鹿高専の5学科をテーマにしたタイムアタックゲーム。学科を選んでクリアタイムを競おう！',
    id: '/',
    start_url: '/',
    scope: '/',
    display: 'fullscreen',
    orientation: 'landscape',
    background_color: '#030712',
    theme_color: '#030712',
    lang: 'ja',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
