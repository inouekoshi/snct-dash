import { renderResultImage, OG_SIZE } from '@/lib/og/result-image'

export const alt = '高専ダッシュ！ — 鈴鹿高専の5学科を走り抜けるタイムアタックゲーム'
export const size = OG_SIZE
export const contentType = 'image/png'

export default async function Image() {
  return renderResultImage(null)
}
