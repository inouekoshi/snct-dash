import type { Obstacle } from './engine-types'
import type { AreaId } from './areas'
import { AREAS } from './areas'
import { GROUND_Y } from './constants'
import { rrect } from './helpers'

type Theme = typeof AREAS[AreaId]
export type ObstacleDrawFn = (ctx: CanvasRenderingContext2D, o: Obstacle, theme: Theme, frame: number) => void

function dGear(ctx: CanvasRenderingContext2D, o: Obstacle, theme: Theme) {
  rrect(ctx, o.x, o.y, o.w, o.h, 3); ctx.fill()
  rrect(ctx, o.x, o.y, o.w, o.h, 3); ctx.stroke()
  for (let tx = o.x + 3; tx < o.x + o.w - 3; tx += 10) { ctx.fillRect(tx, o.y - 6, 5, 6) }
  ctx.beginPath(); ctx.arc(o.x + o.w / 2, o.y + o.h / 2, o.w / 4, 0, Math.PI * 2); ctx.strokeStyle = theme.obstacleStroke; ctx.stroke()
}

function dBolt(ctx: CanvasRenderingContext2D, o: Obstacle, theme: Theme) {
  const cx = o.x + o.w / 2
  const hh = Math.min(o.h * 0.3, 14)
  ctx.beginPath()
  ctx.moveTo(o.x + 3, o.y); ctx.lineTo(o.x + o.w - 3, o.y)
  ctx.lineTo(o.x + o.w, o.y + hh * 0.5); ctx.lineTo(o.x + o.w - 3, o.y + hh)
  ctx.lineTo(o.x + 3, o.y + hh); ctx.lineTo(o.x, o.y + hh * 0.5)
  ctx.closePath(); ctx.fill(); ctx.stroke()
  const sw = o.w * 0.42
  ctx.fillRect(cx - sw / 2, o.y + hh, sw, o.h - hh)
  ctx.strokeRect(cx - sw / 2, o.y + hh, sw, o.h - hh)
  ctx.strokeStyle = theme.obstacleStroke + '66'; ctx.lineWidth = 1
  for (let sy = o.y + hh + 4; sy < o.y + o.h - 3; sy += 5) {
    ctx.beginPath(); ctx.moveTo(cx - sw / 2, sy); ctx.lineTo(cx + sw / 2, sy); ctx.stroke()
  }
}

function dPiston(ctx: CanvasRenderingContext2D, o: Obstacle, theme: Theme) {
  const cx = o.x + o.w / 2
  const headH = o.h * 0.28, rodH = o.h * 0.22
  const cylY = o.y + headH + rodH
  ctx.fillRect(o.x - 3, o.y, o.w + 6, headH); ctx.strokeRect(o.x - 3, o.y, o.w + 6, headH)
  ctx.fillRect(cx - 4, o.y + headH, 8, rodH); ctx.strokeRect(cx - 4, o.y + headH, 8, rodH)
  ctx.fillRect(o.x + 2, cylY, o.w - 4, o.y + o.h - cylY)
  ctx.strokeRect(o.x + 2, cylY, o.w - 4, o.y + o.h - cylY)
  ctx.fillStyle = theme.obstacleStroke + '33'
  ctx.fillRect(o.x + 5, cylY + 3, 4, o.y + o.h - cylY - 6)
}

function dCircuit(ctx: CanvasRenderingContext2D, o: Obstacle, theme: Theme) {
  rrect(ctx, o.x, o.y, o.w, o.h, 3); ctx.fill()
  rrect(ctx, o.x, o.y, o.w, o.h, 3); ctx.stroke()
  ctx.strokeStyle = theme.obstacleStroke + '66'; ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(o.x + 4, o.y + o.h * 0.3); ctx.lineTo(o.x + o.w * 0.5, o.y + o.h * 0.3)
  ctx.lineTo(o.x + o.w * 0.5, o.y + o.h * 0.7); ctx.lineTo(o.x + o.w - 4, o.y + o.h * 0.7)
  ctx.stroke()
  ctx.fillStyle = theme.obstacleStroke; ctx.globalAlpha = 0.8
  ;[[o.x + 4, o.y + o.h * 0.3], [o.x + o.w - 4, o.y + o.h * 0.7]].forEach(([nx, ny]) => {
    ctx.beginPath(); ctx.arc(nx, ny, 3, 0, Math.PI * 2); ctx.fill()
  })
  ctx.globalAlpha = 1
}

function dCoil(ctx: CanvasRenderingContext2D, o: Obstacle, _theme: Theme) {
  const cx = o.x + o.w / 2
  const segments = 5, segH = o.h / (segments + 1)
  ctx.lineWidth = 3; ctx.lineCap = 'round'
  ctx.beginPath(); ctx.moveTo(cx, o.y); ctx.lineTo(cx, o.y + segH * 0.3); ctx.stroke()
  for (let i = 0; i < segments; i++) {
    const y1 = o.y + segH * (i + 0.3), y2 = o.y + segH * (i + 1.3)
    ctx.beginPath()
    if (i % 2 === 0) { ctx.moveTo(cx, y1); ctx.lineTo(o.x + o.w - 2, y1 + segH * 0.5); ctx.lineTo(cx, y2) }
    else { ctx.moveTo(cx, y1); ctx.lineTo(o.x + 2, y1 + segH * 0.5); ctx.lineTo(cx, y2) }
    ctx.stroke()
  }
  ctx.beginPath(); ctx.moveTo(cx, o.y + segH * (segments + 0.3)); ctx.lineTo(cx, o.y + o.h); ctx.stroke()
  ctx.lineWidth = 4
  ctx.beginPath(); ctx.moveTo(o.x + 2, o.y); ctx.lineTo(o.x + o.w - 2, o.y); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(o.x + 2, o.y + o.h); ctx.lineTo(o.x + o.w - 2, o.y + o.h); ctx.stroke()
}

function dCapacitor(ctx: CanvasRenderingContext2D, o: Obstacle, theme: Theme) {
  const cx = o.x + o.w / 2, er = 6
  ctx.beginPath(); ctx.ellipse(cx, o.y + er, o.w / 2, er, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
  ctx.fillRect(o.x, o.y + er, o.w, o.h - er * 2)
  ctx.beginPath(); ctx.moveTo(o.x, o.y + er); ctx.lineTo(o.x, o.y + o.h - er); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(o.x + o.w, o.y + er); ctx.lineTo(o.x + o.w, o.y + o.h - er); ctx.stroke()
  ctx.beginPath(); ctx.ellipse(cx, o.y + o.h - er, o.w / 2, er, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
  ctx.fillStyle = theme.obstacleStroke + '33'
  ctx.fillRect(o.x + 3, o.y + er + 2, o.w * 0.22, o.h - er * 2 - 4)
  ctx.strokeStyle = theme.obstacleStroke; ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(cx, o.y + 2); ctx.lineTo(cx, o.y + er - 1)
  ctx.moveTo(cx - 4, o.y + er * 0.5); ctx.lineTo(cx + 4, o.y + er * 0.5)
  ctx.stroke()
}

function dBug(ctx: CanvasRenderingContext2D, o: Obstacle) {
  ctx.beginPath(); ctx.ellipse(o.x + o.w / 2, o.y + o.h / 2, o.w / 2, o.h / 2, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(o.x + o.w * 0.35, o.y); ctx.lineTo(o.x + o.w * 0.25, o.y - 10)
  ctx.moveTo(o.x + o.w * 0.65, o.y); ctx.lineTo(o.x + o.w * 0.75, o.y - 10); ctx.stroke()
  ctx.strokeStyle = '#ff4444'; ctx.lineWidth = 2
  const ex = o.x + o.w * 0.35, ey = o.y + o.h * 0.38, es = 5
  ctx.beginPath(); ctx.moveTo(ex - es, ey - es); ctx.lineTo(ex + es, ey + es); ctx.moveTo(ex + es, ey - es); ctx.lineTo(ex - es, ey + es); ctx.stroke()
  const ex2 = o.x + o.w * 0.65
  ctx.beginPath(); ctx.moveTo(ex2 - es, ey - es); ctx.lineTo(ex2 + es, ey + es); ctx.moveTo(ex2 + es, ey - es); ctx.lineTo(ex2 - es, ey + es); ctx.stroke()
}

function dMonitor(ctx: CanvasRenderingContext2D, o: Obstacle, theme: Theme, frame: number) {
  const cx = o.x + o.w / 2
  const screenH = o.h * 0.72
  rrect(ctx, o.x, o.y, o.w, screenH, 3); ctx.fill(); ctx.stroke()
  ctx.fillStyle = '#001122'
  rrect(ctx, o.x + 3, o.y + 3, o.w - 6, screenH - 6, 2); ctx.fill()
  ctx.fillStyle = '#00ff44'
  ctx.font = `bold ${Math.max(8, Math.floor(o.w * 0.18))}px monospace`
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.globalAlpha = 0.6 + Math.sin(frame * 0.14) * 0.4
  ctx.fillText('ERROR', cx, o.y + screenH * 0.5)
  ctx.globalAlpha = 1
  ctx.fillStyle = theme.obstacleColor
  ctx.fillRect(cx - o.w * 0.12, o.y + screenH, o.w * 0.24, o.h - screenH)
  ctx.strokeRect(cx - o.w * 0.12, o.y + screenH, o.w * 0.24, o.h - screenH)
}

function dChip(ctx: CanvasRenderingContext2D, o: Obstacle, theme: Theme) {
  const pw = 5, pinH = 6, pinGap = 10
  const pins = Math.max(2, Math.floor((o.h - 10) / pinGap))
  const bodyX = o.x + pw + 3, bodyW = o.w - (pw + 3) * 2
  for (let i = 0; i < pins; i++) {
    const py = o.y + 5 + i * pinGap
    ctx.fillRect(o.x, py, pw, pinH); ctx.strokeRect(o.x, py, pw, pinH)
    ctx.fillRect(o.x + o.w - pw, py, pw, pinH); ctx.strokeRect(o.x + o.w - pw, py, pw, pinH)
  }
  rrect(ctx, bodyX, o.y, bodyW, o.h, 2); ctx.fill(); ctx.stroke()
  ctx.fillStyle = '#001133'
  ctx.beginPath(); ctx.arc(bodyX + 8, o.y + 8, 4, 0, Math.PI * 2); ctx.fill()
  ctx.strokeStyle = theme.obstacleStroke + '44'; ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(bodyX + 4, o.y + o.h * 0.44); ctx.lineTo(bodyX + bodyW - 4, o.y + o.h * 0.44); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(bodyX + 4, o.y + o.h * 0.66); ctx.lineTo(bodyX + bodyW - 4, o.y + o.h * 0.66); ctx.stroke()
}

function dBacteria(ctx: CanvasRenderingContext2D, o: Obstacle, theme: Theme, frame: number) {
  const cx = o.x + o.w / 2, cy = o.y + o.h / 2, rx = o.w / 2, ry = o.h / 2
  const wb = Math.sin(frame * 0.08) * 2.5
  ctx.beginPath(); ctx.ellipse(cx, cy, rx + wb * 0.5, ry - wb * 0.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
  ctx.strokeStyle = theme.obstacleStroke + '88'; ctx.lineWidth = 1.5
  for (let i = 0; i < 4; i++) {
    const a = i / 4 * Math.PI * 2 + frame * 0.03
    ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry); ctx.lineTo(cx + Math.cos(a) * (rx + 10), cy + Math.sin(a) * (ry + 10)); ctx.stroke()
  }
}

function dFlask(ctx: CanvasRenderingContext2D, o: Obstacle, theme: Theme) {
  const cx = o.x + o.w / 2
  const neckH = o.h * 0.32, nw = o.w * 0.32
  ctx.beginPath()
  ctx.moveTo(cx - nw / 2, o.y); ctx.lineTo(cx + nw / 2, o.y)
  ctx.lineTo(cx + nw / 2, o.y + neckH); ctx.lineTo(o.x + o.w, o.y + o.h)
  ctx.lineTo(o.x, o.y + o.h); ctx.lineTo(cx - nw / 2, o.y + neckH)
  ctx.closePath(); ctx.fill(); ctx.stroke()
  const liqRatio = 0.42
  const liqTop = o.y + neckH + (o.h - neckH) * liqRatio
  const liqW = liqRatio * o.w
  ctx.fillStyle = theme.groundLineColor + '50'
  ctx.beginPath()
  ctx.moveTo(cx - liqW / 2, liqTop); ctx.lineTo(cx + liqW / 2, liqTop)
  ctx.lineTo(o.x + o.w, o.y + o.h); ctx.lineTo(o.x, o.y + o.h)
  ctx.closePath(); ctx.fill()
  ctx.fillStyle = theme.obstacleStroke
  ctx.fillRect(cx - nw / 2 - 2, o.y - 5, nw + 4, 6); ctx.strokeRect(cx - nw / 2 - 2, o.y - 5, nw + 4, 6)
}

function dMushroom(ctx: CanvasRenderingContext2D, o: Obstacle, theme: Theme) {
  const cx = o.x + o.w / 2
  const stemH = o.h * 0.4, stemW = o.w * 0.36
  const capY = o.y + o.h - stemH - 6
  ctx.fillRect(cx - stemW / 2, o.y + o.h - stemH, stemW, stemH)
  ctx.strokeRect(cx - stemW / 2, o.y + o.h - stemH, stemW, stemH)
  ctx.beginPath()
  ctx.arc(cx, capY, o.w / 2, Math.PI, 0)
  ctx.lineTo(o.x + o.w, capY + 10)
  ctx.quadraticCurveTo(cx + o.w * 0.14, capY + 18, cx, capY + 13)
  ctx.quadraticCurveTo(cx - o.w * 0.14, capY + 18, o.x, capY + 10)
  ctx.closePath(); ctx.fill(); ctx.stroke()
  ctx.fillStyle = theme.obstacleStroke + '55'
  ctx.beginPath(); ctx.arc(cx - o.w * 0.2, capY - o.h * 0.1, o.w * 0.1, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.arc(cx + o.w * 0.2, capY - o.h * 0.08, o.w * 0.08, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.arc(cx, capY - o.h * 0.22, o.w * 0.09, 0, Math.PI * 2); ctx.fill()
}

function dCrystal(ctx: CanvasRenderingContext2D, o: Obstacle) {
  const cx = o.x + o.w / 2
  ctx.beginPath()
  ctx.moveTo(cx, o.y); ctx.lineTo(cx + o.w * 0.18, o.y + o.h * 0.38); ctx.lineTo(o.x + o.w, o.y + o.h); ctx.lineTo(o.x, o.y + o.h); ctx.lineTo(cx - o.w * 0.18, o.y + o.h * 0.38); ctx.closePath()
  ctx.fill(); ctx.stroke()
  ctx.lineWidth = 1; ctx.globalAlpha = 0.5
  ctx.beginPath(); ctx.moveTo(cx, o.y); ctx.lineTo(cx + o.w * 0.08, o.y + o.h * 0.55); ctx.stroke()
  ctx.globalAlpha = 1
}

function dIngot(ctx: CanvasRenderingContext2D, o: Obstacle, theme: Theme) {
  const bv = Math.min(o.h * 0.38, 9)
  ctx.beginPath()
  ctx.moveTo(o.x + bv, o.y); ctx.lineTo(o.x + o.w - bv, o.y)
  ctx.lineTo(o.x + o.w, o.y + o.h); ctx.lineTo(o.x, o.y + o.h)
  ctx.closePath(); ctx.fill(); ctx.stroke()
  ctx.fillStyle = theme.obstacleStroke + '44'
  ctx.beginPath()
  ctx.moveTo(o.x + bv + 3, o.y + 3); ctx.lineTo(o.x + o.w * 0.52, o.y + 3)
  ctx.lineTo(o.x + o.w * 0.52 + 2, o.y + o.h - 3); ctx.lineTo(o.x + bv + 1, o.y + o.h - 3)
  ctx.closePath(); ctx.fill()
  ctx.strokeStyle = theme.obstacleStroke + '44'; ctx.lineWidth = 1
  const midY = o.y + o.h * 0.5
  ctx.beginPath(); ctx.moveTo(o.x + bv * 0.5, midY); ctx.lineTo(o.x + o.w - bv * 0.5, midY); ctx.stroke()
}

function dLattice(ctx: CanvasRenderingContext2D, o: Obstacle, theme: Theme) {
  ctx.fillStyle = theme.obstacleColor + '55'
  ctx.fillRect(o.x, o.y, o.w, o.h)
  const cols = Math.max(2, Math.round(o.w / 15))
  const rows = Math.max(2, Math.round(o.h / 15))
  ctx.strokeStyle = theme.obstacleStroke; ctx.lineWidth = 2.5
  for (let c = 0; c <= cols; c++) {
    const x = o.x + (o.w / cols) * c
    ctx.beginPath(); ctx.moveTo(x, o.y); ctx.lineTo(x, o.y + o.h); ctx.stroke()
  }
  for (let r = 0; r <= rows; r++) {
    const y = o.y + (o.h / rows) * r
    ctx.beginPath(); ctx.moveTo(o.x, y); ctx.lineTo(o.x + o.w, y); ctx.stroke()
  }
  ctx.fillStyle = theme.obstacleStroke
  for (let c = 0; c <= cols; c++) {
    for (let r = 0; r <= rows; r++) {
      ctx.beginPath()
      ctx.arc(o.x + (o.w / cols) * c, o.y + (o.h / rows) * r, 3, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

function dStalactite(ctx: CanvasRenderingContext2D, o: Obstacle, theme: Theme) {
  const { x, y, w, h } = o
  const tipCount = Math.max(2, Math.round(w / 16))
  const tipW = w / tipCount

  ctx.fillStyle = theme.obstacleColor
  ctx.strokeStyle = theme.obstacleStroke
  ctx.lineWidth = 2

  ctx.fillRect(x, y, w, h * 0.55)
  ctx.strokeRect(x, y, w, h * 0.55)

  for (let i = 0; i < tipCount; i++) {
    const tx = x + i * tipW
    const ty = y + h * 0.55
    ctx.beginPath()
    ctx.moveTo(tx, ty)
    ctx.lineTo(tx + tipW, ty)
    ctx.lineTo(tx + tipW / 2, y + h)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
  }

  ctx.strokeStyle = theme.obstacleStroke + 'aa'
  ctx.lineWidth = 1
  ctx.setLineDash([4, 4])
  ctx.beginPath(); ctx.moveTo(x + w / 2, y + h); ctx.lineTo(x + w / 2, GROUND_Y); ctx.stroke()
  ctx.setLineDash([])
}

export const OBSTACLE_DRAWERS: Record<Obstacle['shape'], ObstacleDrawFn> = {
  gear: dGear,
  bolt: dBolt,
  piston: dPiston,
  circuit: dCircuit,
  coil: dCoil,
  capacitor: dCapacitor,
  bug: (ctx, o) => dBug(ctx, o),
  monitor: dMonitor,
  chip: dChip,
  bacteria: dBacteria,
  flask: dFlask,
  mushroom: dMushroom,
  crystal: (ctx, o) => dCrystal(ctx, o),
  ingot: dIngot,
  lattice: dLattice,
  stalactite: dStalactite,
}

export function drawObstacle(ctx: CanvasRenderingContext2D, o: Obstacle, theme: Theme, frame: number) {
  ctx.save()
  ctx.fillStyle = theme.obstacleColor; ctx.strokeStyle = theme.obstacleStroke; ctx.lineWidth = 2
  ctx.shadowColor = theme.obstacleStroke; ctx.shadowBlur = 6
  OBSTACLE_DRAWERS[o.shape](ctx, o, theme, frame)
  ctx.restore()
}
