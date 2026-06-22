import type { AreaId } from './areas'
import { AREAS } from './areas'
import { CANVAS_W, CANVAS_H, STAGE_LENGTH } from './constants'

type Theme = typeof AREAS[AreaId]

export interface HudState {
  elapsedMs: number
  stageProgress: number
  invincible: number
  departmentId: number
  charge?: number      // 電気電子工学科：充電ゲージ残量
  chargeMax?: number
}

function formatTime(ms: number): string {
  const m = Math.floor(ms / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  const cs = Math.floor((ms % 1000) / 10)
  return `${m}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`
}

export function drawHUD(ctx: CanvasRenderingContext2D, theme: Theme, s: HudState) {
  ctx.fillStyle = 'rgba(0,0,0,0.62)'; ctx.fillRect(0, 0, CANVAS_W, 42)

  // タイマー（左）
  ctx.font = 'bold 18px monospace'; ctx.textBaseline = 'middle'
  ctx.fillStyle = '#FFD700'; ctx.textAlign = 'left'
  ctx.fillText(formatTime(s.elapsedMs), 10, 20)

  // 学科名（中央）
  ctx.fillStyle = theme.groundLineColor; ctx.textAlign = 'center'
  ctx.font = 'bold 14px monospace'
  ctx.fillText(`${theme.emoji} ${theme.name}`, CANVAS_W / 2, 14)

  // 進捗（右）
  ctx.fillStyle = '#aaaaaa'; ctx.textAlign = 'right'
  ctx.font = '13px monospace'
  const pct = Math.min(100, Math.floor(s.stageProgress / STAGE_LENGTH * 100))
  ctx.fillText(`${pct}%`, CANVAS_W - 10, 20)

  // 進捗バー
  const bw = 160, bx = (CANVAS_W - bw) / 2, by = 30
  ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fillRect(bx, by, bw, 5)
  ctx.fillStyle = theme.groundLineColor
  ctx.shadowColor = theme.groundLineColor; ctx.shadowBlur = 4
  ctx.fillRect(bx, by, bw * Math.min(s.stageProgress / STAGE_LENGTH, 1), 5)
  ctx.shadowBlur = 0

  // 充電ゲージ（電気電子工学科のみ）
  if (s.charge !== undefined && s.chargeMax) {
    const ratio = Math.max(0, Math.min(1, s.charge / s.chargeMax))
    const gx = 110, gy = 15, gw = 130, gh = 12
    const low = ratio < 0.25

    // ⚡アイコン（低残量時は点滅）
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle'
    ctx.font = '14px monospace'
    ctx.globalAlpha = low && Math.floor(Date.now() / 150) % 2 === 0 ? 0.35 : 1
    ctx.fillStyle = '#ffff66'
    ctx.fillText('⚡', gx - 18, gy + gh / 2)
    ctx.globalAlpha = 1

    // 枠
    ctx.fillStyle = 'rgba(255,255,255,0.12)'
    ctx.fillRect(gx, gy, gw, gh)

    // 残量に応じた色（緑→黄→赤）
    const barColor = ratio > 0.5 ? '#33dd55' : ratio > 0.25 ? '#ffdd33' : '#ff4444'
    ctx.fillStyle = barColor
    ctx.shadowColor = barColor
    ctx.shadowBlur = low ? 6 + Math.sin(Date.now() / 80) * 6 : 4
    ctx.fillRect(gx, gy, gw * ratio, gh)
    ctx.shadowBlur = 0

    ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1
    ctx.strokeRect(gx + 0.5, gy + 0.5, gw - 1, gh - 1)
  }

  // 無敵フラッシュ
  if (s.invincible > 0 && Math.floor(s.invincible / 6) % 2 === 0) {
    ctx.globalAlpha = 0.22; ctx.fillStyle = '#ff8800'
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
    ctx.globalAlpha = 1
  }
}

export function renderMissOverlay(
  ctx: CanvasRenderingContext2D,
  theme: Theme,
  progressLost: number,
  timer: number,
  maxTimer: number,
) {
  const fadeIn  = Math.min(1, (maxTimer - timer) / 3)
  const fadeOut = Math.min(1, timer / 10)
  const alpha   = Math.min(fadeIn, fadeOut)

  ctx.save()
  ctx.globalAlpha = alpha * 0.65
  ctx.fillStyle = '#a00000'
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

  const cy = CANVAS_H / 2
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'

  const TRANSITION = 20
  if (timer > TRANSITION) {
    const missAlpha = Math.min(1, (timer - TRANSITION) / 5)
    ctx.globalAlpha = alpha * missAlpha
    ctx.font = 'bold 44px monospace'
    ctx.fillStyle = '#ffffff'
    ctx.shadowColor = '#ff4444'; ctx.shadowBlur = 20
    ctx.fillText('MISS!', CANVAS_W / 2, cy - 24)
    ctx.shadowBlur = 0
    ctx.font = '20px monospace'
    ctx.fillStyle = theme.groundLineColor
    ctx.globalAlpha = alpha * missAlpha * 0.9
    ctx.fillText(`← ${progressLost} pt 後退`, CANVAS_W / 2, cy + 24)
  }

  if (timer <= TRANSITION + 10) {
    const readyAlpha = Math.min(1, (TRANSITION + 10 - timer) / 10)
    ctx.globalAlpha = alpha * readyAlpha
    ctx.font = 'bold 22px monospace'
    ctx.fillStyle = theme.groundLineColor
    ctx.shadowColor = theme.groundLineColor; ctx.shadowBlur = 10
    ctx.fillText('GET READY...', CANVAS_W / 2, cy)
    ctx.shadowBlur = 0
  }

  ctx.restore()
}

export function renderRevivalHint(
  ctx: CanvasRenderingContext2D,
  theme: Theme,
  timer: number,
  maxTimer: number,
) {
  ctx.save()
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.font = 'bold 20px monospace'
  ctx.fillStyle = theme.groundLineColor
  ctx.shadowColor = theme.groundLineColor; ctx.shadowBlur = 8
  ctx.globalAlpha = (timer / maxTimer) * 0.85
  ctx.fillText('GET READY...', CANVAS_W / 2, CANVAS_H / 2)
  ctx.restore()
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
