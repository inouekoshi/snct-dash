import { ImageResponse } from 'next/og'
import { AREAS, type AreaId } from '@/lib/game/areas'
import { formatTime } from '@/lib/format'
import { loadJapaneseFont } from './font'

export const OG_SIZE = { width: 1200, height: 630 }

// 日本語フォントが取れなかったときの学科名
const DEPT_EN: Record<AreaId, string> = {
  1: 'Mechanical Engineering',
  2: 'Electrical & Electronic Eng.',
  3: 'Electronic & Information Eng.',
  4: 'Biological & Chemical Eng.',
  5: 'Materials Science & Eng.',
}

export interface ResultImageData {
  nickname: string
  department: number
  timeMs: number
  rank: number
}

/** シェア用のリザルト画像（1200×630）。data が null なら作品紹介の画像 */
export async function renderResultImage(data: ResultImageData | null): Promise<ImageResponse> {
  const dept = (data ? AREAS[data.department as AreaId] : null) ?? null
  const accent = dept?.groundLineColor ?? '#facc15'
  const title = '高専ダッシュ！'
  const lines = data && dept
    ? [title, dept.name, `${data.nickname} さん`, `${data.rank}位`, '鈴鹿高専祭 5学科タイムアタック']
    : [title, '鈴鹿高専の5学科を走り抜けろ！', '鈴鹿高専祭 5学科タイムアタック']
  const font = await loadJapaneseFont(lines.join(''))
  const ja = font !== null
  const isAscii = (s: string) => /^[\x20-\x7e]*$/.test(s)

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: `linear-gradient(135deg, #030712 0%, ${dept?.bgBottom ?? '#111827'} 100%)`,
          color: 'white', fontFamily: ja ? 'NotoSansJP' : undefined,
          border: `12px solid ${accent}`,
        }}
      >
        <div style={{ fontSize: 56, fontWeight: 900, color: '#facc15', display: 'flex' }}>
          {ja ? title : 'KOSEN DASH!'}
        </div>
        {data && dept ? (
          <>
            <div style={{ fontSize: 44, marginTop: 16, color: accent, display: 'flex' }}>
              {ja ? dept.name : DEPT_EN[data.department as AreaId]}
            </div>
            <div style={{ fontSize: 168, fontWeight: 900, marginTop: 8, display: 'flex', letterSpacing: 4 }}>
              {formatTime(data.timeMs)}
            </div>
            <div style={{ fontSize: 44, marginTop: 8, display: 'flex', gap: 24 }}>
              {(ja || isAscii(data.nickname)) && <span>{ja ? `${data.nickname} さん` : data.nickname}</span>}
              <span style={{ color: '#60a5fa' }}>{ja ? `${data.rank}位` : `#${data.rank}`}</span>
            </div>
          </>
        ) : (
          <div style={{ fontSize: 52, marginTop: 24, display: 'flex' }}>
            {ja ? '鈴鹿高専の5学科を走り抜けろ！' : 'Suzuka KOSEN Festival Time Attack'}
          </div>
        )}
        <div style={{ fontSize: 28, marginTop: 36, color: '#9ca3af', display: 'flex' }}>
          {ja ? '鈴鹿高専祭 5学科タイムアタック' : 'Suzuka KOSEN Festival'}
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: font ? [{ name: 'NotoSansJP', data: font, weight: 900, style: 'normal' }] : undefined,
    },
  )
}
