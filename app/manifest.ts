import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '高専ダッシュ！',
    short_name: '高専ダッシュ',
    description: '鈴鹿高専の5学科をテーマにしたタイムアタックゲーム。学科を選んでクリアタイムを競おう！',
    start_url: '/game',
    display: 'fullscreen',
    orientation: 'landscape',
    background_color: '#030712',
    theme_color: '#030712',
    icons: [],
  }
}
