import type { PlayerState } from './engine-types'
import { DEFAULT_GROUND_Y as GROUND_Y, PLAYER_X } from './constants'
import { rrect } from './helpers'

export interface PlayerRenderState {
  py: number
  pState: PlayerState
  pvy: number
  invincible: number
  legPhase: number
  shield: boolean
  deathTimer: number
  frame: number
}

export function drawPlayer(ctx: CanvasRenderingContext2D, accent: string, p: PlayerRenderState) {
  const x = PLAYER_X, y = p.py
  const blink = p.invincible > 0 && Math.floor(p.invincible / 4) % 2 === 1

  if (blink) ctx.globalAlpha = 0.35

  ctx.save()
  if (p.pState === 'falling' && p.deathTimer > 0) {
    ctx.translate(x, y - 23); ctx.rotate(Math.min(p.deathTimer * 0.08, Math.PI * 0.55)); ctx.translate(-x, -(y - 23))
  }

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.22)'
  ctx.beginPath(); ctx.ellipse(x, GROUND_Y + 3, 13, 4, 0, 0, Math.PI * 2); ctx.fill()

  // Legs
  const lp = p.pState === 'jumping' ? 0 : p.legPhase
  ctx.strokeStyle = '#2255bb'; ctx.lineWidth = 5; ctx.lineCap = 'round'
  ctx.beginPath(); ctx.moveTo(x - 5, y - 12); ctx.lineTo(x - 7 + Math.sin(lp) * 10, y + 2); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(x + 5, y - 12); ctx.lineTo(x + 7 - Math.sin(lp) * 10, y + 2); ctx.stroke()

  // Body
  ctx.fillStyle = '#3366dd'
  rrect(ctx, x - 13, y - 40, 26, 28, 5); ctx.fill()
  ctx.strokeStyle = '#6699ff'; ctx.lineWidth = 2
  rrect(ctx, x - 13, y - 40, 26, 28, 5); ctx.stroke()

  // Chest patch
  ctx.fillStyle = accent; ctx.globalAlpha = blink ? 0.25 : 0.65
  rrect(ctx, x - 6, y - 36, 12, 8, 3); ctx.fill()
  ctx.globalAlpha = blink ? 0.35 : 1

  // Arms
  ctx.strokeStyle = '#3366dd'; ctx.lineWidth = 4; ctx.lineCap = 'round'
  const ap = p.legPhase
  ctx.beginPath(); ctx.moveTo(x - 13, y - 33); ctx.lineTo(x - 21, y - 33 + Math.sin(ap) * 7); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(x + 13, y - 33); ctx.lineTo(x + 21, y - 33 - Math.sin(ap) * 7); ctx.stroke()

  // Head
  ctx.fillStyle = '#4488ff'
  ctx.beginPath(); ctx.arc(x, y - 50, 12, 0, Math.PI * 2); ctx.fill()
  ctx.strokeStyle = '#88bbff'; ctx.lineWidth = 2; ctx.stroke()

  // Eyes
  ctx.fillStyle = '#fff'; ctx.fillRect(x - 9, y - 57, 6, 8); ctx.fillRect(x + 3, y - 57, 6, 8)
  ctx.fillStyle = '#001133'; ctx.fillRect(x - 7, y - 55, 3, 5); ctx.fillRect(x + 5, y - 55, 3, 5)

  // Shield aura
  if (p.shield) {
    ctx.strokeStyle = '#00ffff'; ctx.lineWidth = 1.5
    ctx.globalAlpha = 0.35 + Math.sin(p.frame * 0.1) * 0.1
    ctx.beginPath(); ctx.ellipse(x, y - 25, 20, 33, 0, 0, Math.PI * 2); ctx.stroke()
    ctx.globalAlpha = blink ? 0.35 : 1
  }

  ctx.restore()
  ctx.globalAlpha = 1
}
