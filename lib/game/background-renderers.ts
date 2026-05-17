import type { AreaId } from './areas'
import { AREAS } from './areas'
import { CANVAS_W, CANVAS_H, GROUND_Y } from './constants'

type Theme = typeof AREAS[AreaId]

export interface BgContext {
  frame: number
  bgX: number
  speed: number
}

export function drawBg(ctx: CanvasRenderingContext2D, area: AreaId, theme: Theme, bg: BgContext) {
  const g = ctx.createLinearGradient(0, 0, 0, CANVAS_H)
  g.addColorStop(0, theme.bgTop); g.addColorStop(1, theme.bgBottom)
  ctx.fillStyle = g; ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

  ctx.save()
  switch (area) {
    case 1: bgMech(ctx, theme, bg); break
    case 2: bgElec(ctx, theme, bg); break
    case 3: bgCode(ctx, theme, bg); break
    case 4: bgBio(ctx, theme, bg);  break
    case 5: bgMat(ctx, theme, bg);  break
  }
  ctx.restore()
}

function bgMech(ctx: CanvasRenderingContext2D, theme: Theme, bg: BgContext) {
  ctx.strokeStyle = theme.groundLineColor; ctx.lineWidth = 2
  for (let gx = (bg.bgX * 0.15 % 220) - 220; gx < CANVAS_W + 220; gx += 220) {
    for (let i = 0; i < 2; i++) {
      const gy = 70 + i * 115, r = 40 + i * 15
      const rot = bg.frame * 0.004 * (i % 2 ? -1 : 1)
      ctx.globalAlpha = 0.07
      ctx.beginPath(); ctx.arc(gx + i * 100, gy, r, 0, Math.PI * 2); ctx.stroke()
      for (let t = 0; t < 12; t++) {
        const a = rot + t / 12 * Math.PI * 2
        ctx.beginPath()
        ctx.moveTo(gx + i * 100 + Math.cos(a) * r, gy + Math.sin(a) * r)
        ctx.lineTo(gx + i * 100 + Math.cos(a) * (r + 9), gy + Math.sin(a) * (r + 9))
        ctx.stroke()
      }
    }
  }
  ctx.globalAlpha = 1
}

function bgElec(ctx: CanvasRenderingContext2D, theme: Theme, bg: BgContext) {
  ctx.strokeStyle = theme.groundLineColor; ctx.lineWidth = 1
  const gs = 32, ox = bg.bgX % gs
  ctx.globalAlpha = 0.08
  for (let x = ox; x < CANVAS_W; x += gs) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, GROUND_Y); ctx.stroke() }
  for (let y = 30; y < GROUND_Y; y += gs) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_W, y); ctx.stroke() }
  ctx.fillStyle = theme.groundLineColor
  ctx.globalAlpha = 0.18
  for (let x = ox; x < CANVAS_W; x += gs) {
    for (let y = 30; y < GROUND_Y; y += gs) {
      if (Math.abs(Math.sin(x * 0.31 + y * 0.67)) > 0.84) { ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI * 2); ctx.fill() }
    }
  }
  ctx.globalAlpha = 1
}

function bgCode(ctx: CanvasRenderingContext2D, theme: Theme, bg: BgContext) {
  ctx.fillStyle = theme.groundLineColor
  ctx.font = '10px monospace'; ctx.textAlign = 'center'
  for (let col = 0; col < CANVAS_W; col += 22) {
    const drop = ((bg.frame * 0.5 + col * 3.7) % 80)
    ctx.globalAlpha = Math.max(0, 0.18 - drop * 0.003)
    const bit = Math.floor(Math.sin(col * 13.7 + drop) * 100) % 2 === 0 ? '1' : '0'
    ctx.fillText(bit, col, drop + 10)
    ctx.globalAlpha = Math.max(0, 0.10 - drop * 0.002)
    ctx.fillText(bit === '1' ? '0' : '1', col, drop + 24)
  }
  ctx.globalAlpha = 1
}

function bgBio(ctx: CanvasRenderingContext2D, theme: Theme, bg: BgContext) {
  ctx.strokeStyle = theme.groundLineColor; ctx.lineWidth = 1.5
  for (let i = 0; i < 8; i++) {
    const bx = ((bg.frame * 0.4 + i * 137) % (CANVAS_W + 60)) - 30
    const by = GROUND_Y - 25 - ((bg.frame * 0.8 + i * 47) % (GROUND_Y - 60))
    const br = 8 + (i % 3) * 7
    ctx.globalAlpha = 0.09
    ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.stroke()
    ctx.fillStyle = theme.groundLineColor; ctx.globalAlpha = 0.04
    ctx.beginPath(); ctx.arc(bx - br * 0.3, by - br * 0.3, br * 0.25, 0, Math.PI * 2); ctx.fill()
  }
  ctx.globalAlpha = 1
}

function bgMat(ctx: CanvasRenderingContext2D, theme: Theme, bg: BgContext) {
  ctx.strokeStyle = theme.groundLineColor; ctx.lineWidth = 1
  const s = 40, ox = bg.bgX % (s * 2)
  ctx.globalAlpha = 0.07
  for (let x = ox; x < CANVAS_W + s; x += s) {
    for (let y = 20; y < GROUND_Y; y += s) {
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x + s, y + s * 0.5)
      ctx.lineTo(x, y + s)
      ctx.lineTo(x - s, y + s * 0.5)
      ctx.closePath(); ctx.stroke()
    }
  }
  const lv = ctx.createLinearGradient(0, GROUND_Y - 20, 0, GROUND_Y)
  lv.addColorStop(0, 'transparent'); lv.addColorStop(1, theme.groundLineColor + '44')
  ctx.globalAlpha = 0.6; ctx.fillStyle = lv; ctx.fillRect(0, GROUND_Y - 20, CANVAS_W, 20)
  ctx.globalAlpha = 1
}

export function drawGround(ctx: CanvasRenderingContext2D, theme: Theme, bg: BgContext) {
  ctx.fillStyle = theme.groundColor
  ctx.fillRect(0, GROUND_Y + 3, CANVAS_W, CANVAS_H - GROUND_Y - 3)
  ctx.strokeStyle = theme.groundLineColor; ctx.lineWidth = 2
  ctx.shadowColor = theme.groundLineColor; ctx.shadowBlur = 5
  ctx.setLineDash([28, 14])
  ctx.lineDashOffset = -(bg.frame * bg.speed * 0.4) % 42
  ctx.beginPath(); ctx.moveTo(0, GROUND_Y + 3); ctx.lineTo(CANVAS_W, GROUND_Y + 3); ctx.stroke()
  ctx.setLineDash([]); ctx.shadowBlur = 0
}
