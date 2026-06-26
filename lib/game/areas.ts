export type AreaId = 1 | 2 | 3 | 4 | 5

export interface AreaTheme {
  id: AreaId
  name: string
  emoji: string
  bgTop: string
  bgBottom: string
  groundColor: string
  groundLineColor: string
  obstacleColor: string
  obstacleStroke: string
  coinColor: string
  decorations: string[]
}

export const AREAS: Record<AreaId, AreaTheme> = {
  1: {
    id: 1,
    name: '機械工学科',
    emoji: '⚙',
    bgTop: '#0d0500',
    bgBottom: '#1a0a00',
    groundColor: '#5c2800',
    groundLineColor: '#ff8c00',
    obstacleColor: '#cc6600',
    obstacleStroke: '#ff9933',
    coinColor: '#ff8c00',
    decorations: ['gear', 'bolt'],
  },
  2: {
    id: 2,
    name: '電気電子工学科',
    emoji: '⚡',
    bgTop: '#0d0d00',
    bgBottom: '#1a1a00',
    groundColor: '#4d4d00',
    groundLineColor: '#ffff00',
    obstacleColor: '#cccc00',
    obstacleStroke: '#ffff44',
    coinColor: '#ffff00',
    decorations: ['spark', 'wire'],
  },
  3: {
    id: 3,
    name: '電子情報工学科',
    emoji: '💻',
    bgTop: '#000d1a',
    bgBottom: '#001133',
    groundColor: '#003366',
    groundLineColor: '#0099ff',
    obstacleColor: '#005599',
    obstacleStroke: '#33aaff',
    coinColor: '#00aaff',
    decorations: ['bug', 'bit'],
  },
  4: {
    id: 4,
    name: '生物応用化学科',
    emoji: '🧬',
    bgTop: '#021a14',
    bgBottom: '#002b1f',
    groundColor: '#004400',
    groundLineColor: '#00cc44',
    obstacleColor: '#006622',
    obstacleStroke: '#00ee55',
    coinColor: '#00dd44',
    decorations: ['dna', 'bubble'],
  },
  5: {
    id: 5,
    name: '材料工学科',
    emoji: '💎',
    bgTop: '#0a0015',
    bgBottom: '#150033',
    groundColor: '#330066',
    groundLineColor: '#9900ff',
    obstacleColor: '#660099',
    obstacleStroke: '#cc44ff',
    coinColor: '#aa44ff',
    decorations: ['crystal', 'atom'],
  },
}

export const AREA_DISTANCE = 2000

export function bioZone(p: number): 'chem' | 'bio' {
  return Math.floor(p / 2200) % 2 === 0 ? 'chem' : 'bio'
}
