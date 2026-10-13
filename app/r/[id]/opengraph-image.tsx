import { getClear } from '@/lib/server/clears'
import { renderResultImage, OG_SIZE } from '@/lib/og/result-image'

export const alt = '高専ダッシュ！のクリア記録'
export const size = OG_SIZE
export const contentType = 'image/png'

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const clear = await getClear(id)
  return renderResultImage(
    clear && { nickname: clear.nickname, department: clear.department, timeMs: clear.clear_time_ms, rank: clear.rank },
  )
}
