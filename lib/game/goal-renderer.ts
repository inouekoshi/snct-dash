import type { AreaId } from './areas'
import { AREAS } from './areas'
import { DEFAULT_GROUND_Y, PLAYER_X, STAGE_LENGTH } from './constants'

type Theme = typeof AREAS[AreaId]

export function drawGoal(
  ctx: CanvasRenderingContext2D,
  areaId: AreaId,
  theme: Theme,
  stageProgress: number,
  frame: number,
): void {
  const canvasX = PLAYER_X + (STAGE_LENGTH - stageProgress)
  if (canvasX > 900 || canvasX < -100) return

  const poleTop = 15
  const baseH = 12, baseW = 28
  const poleW = 7
  const poleH = DEFAULT_GROUND_Y - baseH - poleTop

  const dist = Math.max(0, STAGE_LENGTH - stageProgress)
  const proximity = Math.max(0, 1 - dist / 750)
  const pulse = Math.sin(frame * 0.09) * 0.15 + 0.85
  const glow = (0.1 + proximity * 0.9) * pulse

  ctx.save()
  ctx.shadowColor = theme.groundLineColor
  ctx.shadowBlur = 4 + glow * 20

  // 台座
  ctx.fillStyle = theme.obstacleStroke
  ctx.strokeStyle = theme.groundLineColor
  ctx.lineWidth = 1.5
  ctx.fillRect(canvasX - baseW / 2, DEFAULT_GROUND_Y - baseH, baseW, baseH)
  ctx.strokeRect(canvasX - baseW / 2, DEFAULT_GROUND_Y - baseH, baseW, baseH)

  // ポール
  ctx.lineWidth = 1
  ctx.fillRect(canvasX - poleW / 2, poleTop, poleW, poleH)
  ctx.strokeRect(canvasX - poleW / 2, poleTop, poleW, poleH)

  // フィニアル（頂点の丸）
  ctx.fillStyle = theme.groundLineColor
  ctx.beginPath()
  ctx.arc(canvasX, poleTop, 6, 0, Math.PI * 2)
  ctx.fill()

  // 旗布（波うちアニメ）
  const flagW = 62, flagH = 36
  const flagX = canvasX + poleW / 2
  const flagY = poleTop + 6
  const segs = 8

  ctx.fillStyle = theme.groundLineColor
  ctx.globalAlpha = 0.85
  ctx.beginPath()
  for (let i = 0; i <= segs; i++) {
    const t = i / segs
    const wave = Math.sin(frame * 0.12 + t * 3.5) * (2 + t * 5)
    const wx = flagX + t * flagW
    if (i === 0) ctx.moveTo(wx, flagY + wave)
    else ctx.lineTo(wx, flagY + wave)
  }
  for (let i = segs; i >= 0; i--) {
    const t = i / segs
    const wave = Math.sin(frame * 0.12 + t * 3.5) * (2 + t * 5)
    ctx.lineTo(flagX + t * flagW, flagY + flagH + wave)
  }
  ctx.closePath()
  ctx.fill()
  ctx.globalAlpha = 1

  // 旗の学科 emoji（シャドウなし）
  ctx.save()
  ctx.shadowBlur = 0
  ctx.font = '18px serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.globalAlpha = 0.9
  const emojiWave = Math.sin(frame * 0.12 + 1.75) * 4
  ctx.fillText(AREAS[areaId].emoji, flagX + flagW * 0.45, flagY + flagH * 0.5 + emojiWave)
  ctx.globalAlpha = 1
  ctx.restore()

  // GOAL テキスト（近づくとフェードイン）
  if (proximity > 0.3) {
    const alpha = Math.min(1, (proximity - 0.3) / 0.7)
    ctx.font = `bold ${Math.floor(9 + proximity * 7)}px monospace`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = theme.groundLineColor
    ctx.shadowBlur = proximity * 14
    ctx.globalAlpha = alpha
    ctx.fillText('GOAL', canvasX, poleTop + poleH * 0.65)
    ctx.globalAlpha = 1
  }

  ctx.restore()
}
