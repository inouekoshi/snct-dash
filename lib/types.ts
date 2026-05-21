export interface GameResult {
  score: number
  distance: number
  maxArea: number
  lap: number
}

export interface ScoreEntry {
  id: string
  nickname: string
  score: number
  distance: number
  max_area: number
  created_at: string
}

export type LeaderboardFilter = 'all' | 'today'
