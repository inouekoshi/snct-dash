import type { AreaId } from './areas'
import { AREAS } from './areas'
import type { Coin, ShieldDrop } from './engine-types'
import { CANVAS_W, CANVAS_H, AREA_DURATION } from './constants'

type Theme = typeof AREAS[AreaId]

export interface HudState {
  score: number
  distance: number
  shield: boolean
  lap: number
  areaTimer: number
  invincible: number
  multiplier: number
}

export function drawHUD(ctx: CanvasRenderingContext2D, theme: Theme, s: HudState) {
  ctx.fillStyle = 'rgba(0,0,0,0.62)'; ctx.fillRect(0, 0, CANVAS_W, 42)

  ctx.font = 'bold 16px monospace'; ctx.textBaseline = 'middle'
  ctx.fillStyle = '#FFD700'; ctx.textAlign = 'left'
  const multiplierTag = s.multiplier >= 2 ? ` ×${s.multiplier}` : ''
  ctx.fillText(`SCORE  ${s.score.toLocaleString()}${multiplierTag}`, 10, 18)

  ctx.fillStyle = theme.groundLineColor; ctx.textAlign = 'center'
  ctx.fillText(`${theme.emoji} ${theme.name}`, CANVAS_W / 2, 14)

  ctx.fillStyle = '#aaaaaa'; ctx.textAlign = 'right'
  ctx.fillText(`${Math.floor(s.distance)} m`, CANVAS_W - 10, 18)

  // Shield icon
  ctx.textAlign = 'left'; ctx.font = '14px sans-serif'
  ctx.fillText(s.shield ? '🛡' : '💔', CANVAS_W - 42, 33)

  // Lap badge
  if (s.lap >= 1) {
    ctx.font = 'bold 13px monospace'; ctx.textAlign = 'left'
    ctx.fillStyle = '#ff6644'
    ctx.fillText(`LAP ${s.lap + 1}`, 10, 36)
  }

  // Area progress bar
  const bw = 140, bx = (CANVAS_W - bw) / 2, by = 30
  ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fillRect(bx, by, bw, 5)
  ctx.fillStyle = theme.groundLineColor
  ctx.shadowColor = theme.groundLineColor; ctx.shadowBlur = 4
  ctx.fillRect(bx, by, bw * (s.areaTimer / AREA_DURATION), 5)
  ctx.shadowBlur = 0

  // Invincibility flash overlay
  if (s.invincible > 0 && Math.floor(s.invincible / 6) % 2 === 0) {
    ctx.globalAlpha = 0.22; ctx.fillStyle = '#ff8800'; ctx.fillRect(0, 0, CANVAS_W, CANVAS_H); ctx.globalAlpha = 1
  }
}

export function drawTransition(ctx: CanvasRenderingContext2D, theme: Theme, transAlpha: number, lap: number, multiplier = 1, multiplierJustUp = false) {
  ctx.globalAlpha = transAlpha * 0.35; ctx.fillStyle = theme.groundLineColor; ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
  ctx.globalAlpha = Math.min(transAlpha * 2.2, 1)

  ctx.fillStyle = '#fff'; ctx.font = 'bold 26px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  const hasExtra = lap >= 1 || multiplierJustUp
  const yOffset = hasExtra ? -16 : 0
  ctx.fillText(`${theme.emoji}  ${theme.name}`, CANVAS_W / 2, CANVAS_H / 2 + yOffset)

  if (lap >= 1) {
    ctx.font = 'bold 16px monospace'; ctx.fillStyle = '#ff6644'
    ctx.fillText(`LAP ${lap + 1}`, CANVAS_W / 2, CANVAS_H / 2 + (multiplierJustUp ? 4 : 12))
  }
  if (multiplierJustUp) {
    ctx.font = 'bold 18px monospace'
    ctx.fillStyle = '#ffee00'
    ctx.shadowColor = '#ffaa00'; ctx.shadowBlur = 10
    ctx.fillText(`× ${multiplier}  BONUS!`, CANVAS_W / 2, CANVAS_H / 2 + (lap >= 1 ? 22 : 12))
    ctx.shadowBlur = 0
  }
  ctx.globalAlpha = 1
}

export function renderPauseOverlay(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = 'rgba(0,0,0,0.55)'
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 38px monospace'
  ctx.fillText('⏸  PAUSE', CANVAS_W / 2, CANVAS_H / 2 - 18)
  ctx.font = '16px sans-serif'
  ctx.fillStyle = '#aaaaaa'
  ctx.fillText('P キー / ポーズボタンで再開', CANVAS_W / 2, CANVAS_H / 2 + 24)
}

export function drawCoin(ctx: CanvasRenderingContext2D, c: Coin, color: string) {
  const cy = c.y + Math.sin(c.wobble) * 4
  ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 10
  ctx.beginPath(); ctx.arc(c.x, cy, 9, 0, Math.PI * 2); ctx.fill()
  ctx.shadowBlur = 0; ctx.strokeStyle = '#ffffff66'; ctx.lineWidth = 1.5; ctx.stroke()
  ctx.fillStyle = '#ffffff33'; ctx.beginPath(); ctx.arc(c.x - 3, cy - 3, 3.5, 0, Math.PI * 2); ctx.fill()
}

export function drawShieldDrop(ctx: CanvasRenderingContext2D, s: ShieldDrop, frame: number) {
  const x = s.x, y = s.y + Math.sin(s.wobble) * 5
  ctx.shadowColor = '#00ffff'; ctx.shadowBlur = 12 + Math.sin(frame * 0.1) * 4
  ctx.strokeStyle = '#00ffff'; ctx.fillStyle = '#00ffff22'; ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(x, y - 13); ctx.lineTo(x + 11, y - 6); ctx.lineTo(x + 11, y + 4); ctx.lineTo(x, y + 13); ctx.lineTo(x - 11, y + 4); ctx.lineTo(x - 11, y - 6); ctx.closePath()
  ctx.fill(); ctx.stroke()
  ctx.strokeStyle = '#00ffff'; ctx.lineWidth = 1.5
  ctx.beginPath(); ctx.moveTo(x, y - 7); ctx.lineTo(x, y + 7); ctx.moveTo(x - 5, y); ctx.lineTo(x + 5, y); ctx.stroke()
  ctx.shadowBlur = 0
}
