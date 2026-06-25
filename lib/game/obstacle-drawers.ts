import type { Obstacle } from './engine-types'
import type { AreaId } from './areas'
import { AREAS } from './areas'
import { DEFAULT_GROUND_Y as GROUND_Y, mallocSolid } from './constants'
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

// バグ（電子情報で踏める唯一の敵）：緑色＝「踏んでOK」の合図。つぶらな目で愛嬌のある雑魚。
// 頭上で点滅・上下する下向き矢印▼が「ここを踏め」を一目で伝える。障壁（赤系）と色で明確に区別。
function dBug(ctx: CanvasRenderingContext2D, o: Obstacle, _theme: Theme, frame: number) {
  const cx = o.x + o.w / 2, cy = o.y + o.h / 2
  const rx = o.w / 2, ry = o.h / 2
  const pulse = 0.5 + Math.sin(frame * 0.18) * 0.5
  // 脚（うねうね動く）
  ctx.strokeStyle = '#1f9b4e'; ctx.lineWidth = 2
  for (let i = -1; i <= 1; i++) {
    const ly = cy + i * ry * 0.5
    const wig = Math.sin(frame * 0.3 + i) * 3
    ctx.beginPath(); ctx.moveTo(cx - rx, ly); ctx.lineTo(cx - rx - 8, ly + wig); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(cx + rx, ly); ctx.lineTo(cx + rx + 8, ly - wig); ctx.stroke()
  }
  // 本体（緑＝踏んでOK）
  ctx.fillStyle = '#3dd66e'; ctx.strokeStyle = '#1f9b4e'; ctx.lineWidth = 2.5
  ctx.shadowColor = '#3dd66e'; ctx.shadowBlur = 8
  ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
  ctx.shadowBlur = 0
  // 触角
  ctx.strokeStyle = '#1f9b4e'; ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(cx - rx * 0.3, o.y + 2); ctx.lineTo(cx - rx * 0.5, o.y - 9)
  ctx.moveTo(cx + rx * 0.3, o.y + 2); ctx.lineTo(cx + rx * 0.5, o.y - 9); ctx.stroke()
  ctx.fillStyle = '#1f9b4e'
  ctx.beginPath(); ctx.arc(cx - rx * 0.5, o.y - 9, 2, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.arc(cx + rx * 0.5, o.y - 9, 2, 0, Math.PI * 2); ctx.fill()
  // つぶらな丸い目（やられ役の愛嬌）
  const eo = rx * 0.34, eyY = cy - ry * 0.05, eR = Math.max(4, rx * 0.2)
  ctx.fillStyle = '#fff'
  for (const ox of [-eo, eo]) { ctx.beginPath(); ctx.arc(cx + ox, eyY, eR, 0, Math.PI * 2); ctx.fill() }
  ctx.fillStyle = '#222'
  for (const ox of [-eo, eo]) { ctx.beginPath(); ctx.arc(cx + ox, eyY + 1, eR * 0.5, 0, Math.PI * 2); ctx.fill() }
  // ▼ 踏めるサイン（頭上で点滅・上下にバウンド）
  const ay = o.y - 16 - pulse * 4
  ctx.globalAlpha = 0.4 + pulse * 0.6
  ctx.fillStyle = '#9dffb0'
  ctx.shadowColor = '#3dff7e'; ctx.shadowBlur = 6
  ctx.beginPath(); ctx.moveTo(cx - 6, ay); ctx.lineTo(cx + 6, ay); ctx.lineTo(cx, ay + 8); ctx.closePath(); ctx.fill()
  ctx.shadowBlur = 0; ctx.globalAlpha = 1
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

function dWrench(ctx: CanvasRenderingContext2D, o: Obstacle, theme: Theme) {
  const cx = o.x + o.w / 2
  const headR = o.w * 0.46, headY = o.y + headR + 2
  ctx.beginPath(); ctx.arc(cx, headY, headR, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
  ctx.fillStyle = theme.bgTop || '#000'
  ctx.beginPath(); ctx.arc(cx, headY, headR * 0.44, 0, Math.PI * 2); ctx.fill()
  ctx.strokeStyle = theme.obstacleStroke; ctx.lineWidth = 2
  ctx.beginPath(); ctx.arc(cx, headY, headR * 0.44, 0, Math.PI * 2); ctx.stroke()
  ctx.fillStyle = theme.obstacleColor; ctx.strokeStyle = theme.obstacleStroke
  const shaftW = o.w * 0.32, shaftY = headY + headR - 2, shaftH = o.h - (headR * 2 + 2)
  ctx.fillRect(cx - shaftW / 2, shaftY, shaftW, shaftH)
  ctx.strokeRect(cx - shaftW / 2, shaftY, shaftW, shaftH)
  ctx.strokeStyle = theme.obstacleStroke + '77'; ctx.lineWidth = 1
  for (let i = 0; i < 3; i++) {
    const ny = shaftY + shaftH * (0.2 + i * 0.3)
    ctx.beginPath(); ctx.moveTo(cx - shaftW / 2 + 2, ny); ctx.lineTo(cx + shaftW / 2 - 2, ny); ctx.stroke()
  }
}

function dSpring(ctx: CanvasRenderingContext2D, o: Obstacle, theme: Theme) {
  const cx = o.x + o.w / 2
  const plateH = 4, loops = 5
  ctx.fillStyle = theme.obstacleColor; ctx.strokeStyle = theme.obstacleStroke
  ctx.fillRect(o.x, o.y, o.w, plateH); ctx.strokeRect(o.x, o.y, o.w, plateH)
  ctx.fillRect(o.x, o.y + o.h - plateH, o.w, plateH); ctx.strokeRect(o.x, o.y + o.h - plateH, o.w, plateH)
  const coilH = o.h - plateH * 2
  const segH = coilH / (loops * 2)
  ctx.strokeStyle = theme.obstacleStroke; ctx.lineWidth = 3; ctx.lineCap = 'round'
  ctx.beginPath(); ctx.moveTo(cx, o.y + plateH)
  for (let i = 0; i < loops * 2; i++) {
    const tx = i % 2 === 0 ? o.x + 3 : o.x + o.w - 3
    ctx.lineTo(tx, o.y + plateH + segH * (i + 1))
  }
  ctx.lineTo(cx, o.y + o.h - plateH); ctx.stroke()
}

function dFlywheel(ctx: CanvasRenderingContext2D, o: Obstacle, _theme: Theme, frame: number) {
  const cx = o.x + o.w / 2, cy = o.y + o.h / 2
  const R = Math.min(o.w, o.h) / 2 - 2
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
  ctx.strokeStyle = _theme.obstacleStroke + 'aa'; ctx.lineWidth = 2.5
  ctx.beginPath(); ctx.arc(cx, cy, R * 0.72, 0, Math.PI * 2); ctx.stroke()
  const rot = frame * 0.012
  ctx.strokeStyle = _theme.obstacleStroke; ctx.lineWidth = 2
  for (let i = 0; i < 3; i++) {
    const a = rot + (i / 3) * Math.PI * 2
    ctx.beginPath()
    ctx.moveTo(cx + Math.cos(a) * R * 0.14, cy + Math.sin(a) * R * 0.14)
    ctx.lineTo(cx + Math.cos(a) * R * 0.70, cy + Math.sin(a) * R * 0.70)
    ctx.stroke()
  }
  ctx.fillStyle = _theme.obstacleStroke
  ctx.beginPath(); ctx.arc(cx, cy, R * 0.16, 0, Math.PI * 2); ctx.fill()
}

function dRobotArm(ctx: CanvasRenderingContext2D, o: Obstacle, theme: Theme) {
  const cx = o.x + o.w / 2
  const baseH = o.h * 0.18, arm1H = o.h * 0.38, elbowR = 5
  const baseY = o.y + o.h - baseH
  ctx.fillRect(o.x + 2, baseY, o.w - 4, baseH); ctx.strokeRect(o.x + 2, baseY, o.w - 4, baseH)
  const arm1W = o.w * 0.28
  ctx.fillRect(cx - arm1W / 2, baseY - arm1H, arm1W, arm1H); ctx.strokeRect(cx - arm1W / 2, baseY - arm1H, arm1W, arm1H)
  const elbowY = baseY - arm1H
  ctx.beginPath(); ctx.arc(cx, elbowY, elbowR, 0, Math.PI * 2)
  ctx.fillStyle = theme.obstacleStroke; ctx.fill(); ctx.stroke()
  const arm2H = o.h * 0.3, arm2W = o.w * 0.22
  const arm2Y = elbowY - arm2W
  ctx.fillStyle = theme.obstacleColor
  ctx.fillRect(cx - o.w * 0.36, arm2Y, o.w * 0.36, arm2H); ctx.strokeRect(cx - o.w * 0.36, arm2Y, o.w * 0.36, arm2H)
  const gripX = o.x + o.w * 0.06, gripY = arm2Y
  ctx.strokeStyle = theme.obstacleStroke; ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(gripX, gripY); ctx.lineTo(gripX - 4, gripY - 10); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(gripX, gripY); ctx.lineTo(gripX - 4, gripY + 10); ctx.stroke()
}

function dHammer(ctx: CanvasRenderingContext2D, o: Obstacle, theme: Theme) {
  const cx = o.x + o.w / 2
  const headH = Math.min(o.h * 0.32, 28)
  const shaftH = o.h * 0.35
  const baseH = o.h - headH - shaftH
  const shaftW = o.w * 0.28

  ctx.fillRect(o.x, o.y, o.w, headH); ctx.strokeRect(o.x, o.y, o.w, headH)
  ctx.strokeStyle = theme.obstacleStroke + '66'; ctx.lineWidth = 1.5
  for (let i = 1; i < 3; i++) {
    const ly = o.y + headH * (i / 3)
    ctx.beginPath(); ctx.moveTo(o.x + 4, ly); ctx.lineTo(o.x + o.w - 4, ly); ctx.stroke()
  }
  ctx.fillStyle = theme.obstacleColor; ctx.strokeStyle = theme.obstacleStroke; ctx.lineWidth = 2
  ctx.fillRect(cx - shaftW / 2, o.y + headH, shaftW, shaftH)
  ctx.strokeRect(cx - shaftW / 2, o.y + headH, shaftW, shaftH)
  ctx.fillRect(o.x + 4, o.y + headH + shaftH, o.w - 8, baseH)
  ctx.strokeRect(o.x + 4, o.y + headH + shaftH, o.w - 8, baseH)
  ctx.strokeStyle = theme.obstacleStroke + '44'; ctx.lineWidth = 1.5
  for (let i = 0; i < 3; i++) {
    const ly = o.y + 4 + i * (headH * 0.28)
    const len = 8 + i * 4
    ctx.beginPath(); ctx.moveTo(o.x - 3, ly); ctx.lineTo(o.x - 3 - len, ly); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(o.x + o.w + 3, ly); ctx.lineTo(o.x + o.w + 3 + len, ly); ctx.stroke()
  }
}

function dConveyor(ctx: CanvasRenderingContext2D, o: Obstacle, theme: Theme, frame: number) {
  rrect(ctx, o.x, o.y, o.w, o.h, 4); ctx.fill(); ctx.stroke()
  const rr = Math.min(o.h * 0.42, 10)
  ctx.fillStyle = theme.obstacleStroke
  ctx.beginPath(); ctx.arc(o.x + rr + 3, o.y + o.h / 2, rr, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
  ctx.beginPath(); ctx.arc(o.x + o.w - rr - 3, o.y + o.h / 2, rr, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
  const beltX1 = o.x + rr * 2 + 6, beltX2 = o.x + o.w - rr * 2 - 6
  if (beltX2 > beltX1) {
    ctx.save()
    ctx.beginPath(); ctx.rect(beltX1, o.y + 2, beltX2 - beltX1, o.h - 4); ctx.clip()
    const stripeOff = (frame * 2) % 20
    ctx.strokeStyle = theme.obstacleStroke + '77'; ctx.lineWidth = 2
    for (let sx = beltX1 - stripeOff; sx < beltX2 + 20; sx += 20) {
      ctx.beginPath(); ctx.moveTo(sx, o.y + 2); ctx.lineTo(sx + 7, o.y + o.h - 2); ctx.stroke()
    }
    ctx.restore()
  }
}

// ── 電気電子工学科の追加障害物 ───────────────────────────────────────────────

// 抵抗器：低くて幅広。両端にリード線、本体にカラーバンド3本。距離ジャンプ向け。
function dResistor(ctx: CanvasRenderingContext2D, o: Obstacle, theme: Theme) {
  const midY = o.y + o.h / 2
  ctx.strokeStyle = theme.obstacleStroke; ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(o.x - 6, midY); ctx.lineTo(o.x + 5, midY)
  ctx.moveTo(o.x + o.w - 5, midY); ctx.lineTo(o.x + o.w + 6, midY)
  ctx.stroke()
  ctx.fillStyle = theme.obstacleColor
  rrect(ctx, o.x + 4, o.y, o.w - 8, o.h, Math.min(o.h * 0.42, 9)); ctx.fill(); ctx.stroke()
  ctx.fillStyle = theme.obstacleStroke
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(o.x + o.w * (0.32 + i * 0.16), o.y + 2, 3, o.h - 4)
  }
}

// トランジスタ：中サイズ。半円ボディ（TO-92風）＋3本足。
function dTransistor(ctx: CanvasRenderingContext2D, o: Obstacle, theme: Theme) {
  const cx = o.x + o.w / 2
  const pinH = 9
  const bodyH = o.h - pinH
  const arcCy = o.y + o.w * 0.5
  ctx.fillStyle = theme.obstacleColor
  ctx.beginPath()
  ctx.moveTo(o.x, o.y + bodyH)
  ctx.lineTo(o.x, arcCy)
  ctx.arc(cx, arcCy, o.w / 2, Math.PI, 0)
  ctx.lineTo(o.x + o.w, o.y + bodyH)
  ctx.closePath(); ctx.fill(); ctx.stroke()
  ctx.strokeStyle = theme.obstacleStroke + '66'; ctx.lineWidth = 1.5
  ctx.beginPath(); ctx.moveTo(o.x + 3, o.y + bodyH * 0.62); ctx.lineTo(o.x + o.w - 3, o.y + bodyH * 0.62); ctx.stroke()
  ctx.strokeStyle = theme.obstacleStroke; ctx.lineWidth = 2
  for (let i = 0; i < 3; i++) {
    const px = cx + (i - 1) * o.w * 0.26
    ctx.beginPath(); ctx.moveTo(px, o.y + bodyH); ctx.lineTo(px, o.y + o.h); ctx.stroke()
  }
}

// 電子：発光する球が上下に浮遊（moving）。回転する軌道リング＋電子点。
function dElectron(ctx: CanvasRenderingContext2D, o: Obstacle, theme: Theme, frame: number) {
  const cx = o.x + o.w / 2, cy = o.y + o.h / 2
  const r = Math.min(o.w, o.h) / 2 - 3
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
  ctx.fillStyle = theme.coinColor
  ctx.globalAlpha = 0.7
  ctx.beginPath(); ctx.arc(cx - r * 0.28, cy - r * 0.28, r * 0.42, 0, Math.PI * 2); ctx.fill()
  ctx.globalAlpha = 1
  const a = frame * 0.09
  for (let k = 0; k < 2; k++) {
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(a + k * Math.PI / 2)
    ctx.strokeStyle = theme.obstacleStroke; ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.ellipse(0, 0, r + 5, (r + 5) * 0.38, 0, 0, Math.PI * 2); ctx.stroke()
    ctx.fillStyle = theme.obstacleStroke
    const ex = Math.cos(a * 2 + k * 2) * (r + 5), ey = Math.sin(a * 2 + k * 2) * ((r + 5) * 0.38)
    ctx.beginPath(); ctx.arc(ex, ey, 2.5, 0, Math.PI * 2); ctx.fill()
    ctx.restore()
  }
}

// テスラコイル：最も高い壁。台形タワー＋頂部トロイド球＋フリッカーする放電アーク。
function dTesla(ctx: CanvasRenderingContext2D, o: Obstacle, theme: Theme, frame: number) {
  const cx = o.x + o.w / 2
  const sphereR = o.w * 0.42
  const sphereY = o.y + sphereR + 2
  const towerTop = sphereY + sphereR * 0.5
  ctx.fillStyle = theme.obstacleColor
  ctx.beginPath()
  ctx.moveTo(cx - o.w * 0.16, towerTop)
  ctx.lineTo(cx + o.w * 0.16, towerTop)
  ctx.lineTo(o.x + o.w, o.y + o.h)
  ctx.lineTo(o.x, o.y + o.h)
  ctx.closePath(); ctx.fill(); ctx.stroke()
  ctx.strokeStyle = theme.obstacleStroke + '66'; ctx.lineWidth = 1.5
  for (let i = 1; i < 6; i++) {
    const t = i / 6
    const yy = towerTop + (o.y + o.h - towerTop) * t
    const halfW = o.w * 0.16 + o.w * 0.34 * t
    ctx.beginPath(); ctx.moveTo(cx - halfW, yy); ctx.lineTo(cx + halfW, yy); ctx.stroke()
  }
  ctx.fillStyle = theme.obstacleColor; ctx.strokeStyle = theme.obstacleStroke; ctx.lineWidth = 2
  ctx.beginPath(); ctx.ellipse(cx, sphereY, sphereR, sphereR * 0.62, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
  ctx.strokeStyle = theme.obstacleStroke; ctx.lineWidth = 1.5
  ctx.globalAlpha = 0.5 + Math.sin(frame * 0.3) * 0.4
  for (let k = -1; k <= 1; k += 2) {
    let px = cx, py = sphereY - sphereR * 0.5
    ctx.beginPath(); ctx.moveTo(px, py)
    for (let s = 0; s < 4; s++) {
      px += k * (4 + Math.random() * 6)
      py -= 3 + Math.random() * 5
      ctx.lineTo(px, py)
    }
    ctx.stroke()
  }
  ctx.globalAlpha = 1
}

// 放電リング：大きく回転。外輪・内輪をつなぐ放電ジグザグが回る。広い当たり判定。
function dArcRing(ctx: CanvasRenderingContext2D, o: Obstacle, theme: Theme, frame: number) {
  const cx = o.x + o.w / 2, cy = o.y + o.h / 2
  const R = Math.min(o.w, o.h) / 2 - 2
  ctx.strokeStyle = theme.obstacleColor; ctx.lineWidth = 4
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke()
  ctx.strokeStyle = theme.obstacleStroke + 'aa'; ctx.lineWidth = 2
  ctx.beginPath(); ctx.arc(cx, cy, R * 0.62, 0, Math.PI * 2); ctx.stroke()
  const rot = frame * 0.05
  ctx.strokeStyle = theme.obstacleStroke; ctx.lineWidth = 1.5
  for (let i = 0; i < 6; i++) {
    const a = rot + (i / 6) * Math.PI * 2
    const a2 = a + 0.18
    ctx.beginPath()
    ctx.moveTo(cx + Math.cos(a) * R * 0.62, cy + Math.sin(a) * R * 0.62)
    ctx.lineTo(cx + Math.cos((a + a2) / 2) * R * 0.88, cy + Math.sin((a + a2) / 2) * R * 0.88)
    ctx.lineTo(cx + Math.cos(a2) * R * 0.62, cy + Math.sin(a2) * R * 0.62)
    ctx.stroke()
  }
  ctx.fillStyle = theme.obstacleStroke
  ctx.globalAlpha = 0.5 + Math.sin(frame * 0.2) * 0.4
  ctx.beginPath(); ctx.arc(cx, cy, R * 0.18, 0, Math.PI * 2); ctx.fill()
  ctx.globalAlpha = 1
}

// 高圧鉄塔（パイロン）：ダブルジャンプ必須の高壁。トラス構造の鉄塔と碍子（がいし）、赤い航空障害灯。
function dPylon(ctx: CanvasRenderingContext2D, o: Obstacle, theme: Theme, frame: number) {
  const cx = o.x + o.w / 2
  ctx.strokeStyle = theme.obstacleStroke; ctx.lineWidth = 2
  
  // 鉄塔の主柱（ハの字）
  ctx.beginPath()
  ctx.moveTo(cx - o.w * 0.15, o.y)
  ctx.lineTo(cx - o.w * 0.45, o.y + o.h)
  ctx.moveTo(cx + o.w * 0.15, o.y)
  ctx.lineTo(cx + o.w * 0.45, o.y + o.h)
  ctx.stroke()
  
  // トラス構造（バツ印と横棒）
  const steps = Math.floor(o.h / 24)
  for (let i = 0; i < steps; i++) {
    const t1 = i / steps
    const t2 = (i + 1) / steps
    const y1 = o.y + o.h * t1
    const y2 = o.y + o.h * t2
    const w1 = o.w * 0.15 + o.w * 0.3 * t1
    const w2 = o.w * 0.15 + o.w * 0.3 * t2
    
    // 横棒
    ctx.beginPath(); ctx.moveTo(cx - w1, y1); ctx.lineTo(cx + w1, y1); ctx.stroke()
    
    // クロス（斜め）
    if (i < steps - 1) {
      ctx.strokeStyle = theme.obstacleStroke + 'aa'; ctx.lineWidth = 1.5
      ctx.beginPath(); ctx.moveTo(cx - w1, y1); ctx.lineTo(cx + w2, y2); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(cx + w1, y1); ctx.lineTo(cx - w2, y2); ctx.stroke()
      ctx.strokeStyle = theme.obstacleStroke; ctx.lineWidth = 2
    }
  }

  // 腕金（横に突き出た部分）と碍子（がいし）
  ctx.fillStyle = theme.obstacleColor
  for (let i = 1; i <= 2; i++) {
    const armY = o.y + o.h * (0.2 * i)
    const armW = o.w * (1 - 0.1 * i)
    ctx.fillRect(cx - armW / 2, armY - 2, armW, 5); ctx.strokeRect(cx - armW / 2, armY - 2, armW, 5)
    
    // 碍子（垂れ下がるパーツ）
    ctx.fillStyle = '#ccddff'
    ctx.beginPath(); ctx.arc(cx - armW / 2 + 4, armY + 6, 3, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
    ctx.beginPath(); ctx.arc(cx + armW / 2 - 4, armY + 6, 3, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
    ctx.fillStyle = theme.obstacleColor
  }
  
  // 頂部の航空障害灯（赤く点滅）
  const pulse = Math.sin(frame * 0.1) * 0.5 + 0.5
  ctx.fillStyle = `rgba(255, 50, 50, ${0.5 + pulse * 0.5})`
  ctx.shadowColor = '#ff2222'; ctx.shadowBlur = 8 * pulse
  ctx.beginPath(); ctx.arc(cx, o.y - 4, 4, 0, Math.PI * 2); ctx.fill()
  ctx.shadowBlur = 0
}

// ── 電子情報工学科の追加障害物 ───────────────────────────────────────────────

// ウイルス：踏める敵。トゲ付きの球体＋怒り目。サイバー色。
function dVirus(ctx: CanvasRenderingContext2D, o: Obstacle, theme: Theme, frame: number) {
  const cx = o.x + o.w / 2, cy = o.y + o.h / 2
  const r = Math.min(o.w, o.h) / 2 - 4
  // トゲ
  ctx.strokeStyle = theme.obstacleStroke; ctx.lineWidth = 2
  const spikes = 8
  for (let i = 0; i < spikes; i++) {
    const a = (i / spikes) * Math.PI * 2 + frame * 0.02
    ctx.beginPath()
    ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r)
    ctx.lineTo(cx + Math.cos(a) * (r + 5), cy + Math.sin(a) * (r + 5))
    ctx.stroke()
  }
  // 本体
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
  // 目（×まなこ）
  ctx.strokeStyle = '#ff4466'; ctx.lineWidth = 2
  const es = r * 0.22
  for (const ox of [-r * 0.34, r * 0.34]) {
    const ex = cx + ox, ey = cy - r * 0.1
    ctx.beginPath(); ctx.moveTo(ex - es, ey - es); ctx.lineTo(ex + es, ey + es)
    ctx.moveTo(ex + es, ey - es); ctx.lineTo(ex - es, ey + es); ctx.stroke()
  }
  // 口
  ctx.beginPath(); ctx.arc(cx, cy + r * 0.35, r * 0.3, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke()
}

// グリッチ：踏める敵。RGBずれと走査線で点滅する四角。
function dGlitch(ctx: CanvasRenderingContext2D, o: Obstacle, theme: Theme, frame: number) {
  const shift = Math.sin(frame * 0.5) * 3
  // RGBずれ（赤シアンのゴースト）
  ctx.globalAlpha = 0.5
  ctx.fillStyle = '#ff2266'
  ctx.fillRect(o.x - shift, o.y, o.w, o.h)
  ctx.fillStyle = '#22ffee'
  ctx.fillRect(o.x + shift, o.y, o.w, o.h)
  ctx.globalAlpha = 1
  // 本体
  ctx.fillStyle = theme.obstacleColor
  rrect(ctx, o.x, o.y, o.w, o.h, 2); ctx.fill(); ctx.stroke()
  // 走査線
  ctx.strokeStyle = theme.obstacleStroke + '88'; ctx.lineWidth = 1
  for (let sy = o.y + 3; sy < o.y + o.h - 2; sy += 5) {
    ctx.beginPath(); ctx.moveTo(o.x + 2, sy); ctx.lineTo(o.x + o.w - 2, sy); ctx.stroke()
  }
  // ランダムにずれるブロック
  if (Math.floor(frame * 0.2) % 3 === 0) {
    ctx.fillStyle = theme.obstacleStroke
    ctx.fillRect(o.x + 4, o.y + o.h * 0.4, o.w * 0.5, 4)
  }
}

// ファイアウォール：踏めない壁。赤いレンガ＋揺らめく炎。ジャンプで越える。
function dFirewall(ctx: CanvasRenderingContext2D, o: Obstacle, _theme: Theme, frame: number) {
  // レンガ壁
  ctx.fillStyle = '#aa2200'; ctx.strokeStyle = '#ff5522'; ctx.lineWidth = 2
  rrect(ctx, o.x, o.y, o.w, o.h, 2); ctx.fill(); ctx.stroke()
  ctx.strokeStyle = '#ff552288'; ctx.lineWidth = 1
  const brickH = 9
  for (let i = 0, by = o.y + brickH; by < o.y + o.h; by += brickH, i++) {
    ctx.beginPath(); ctx.moveTo(o.x, by); ctx.lineTo(o.x + o.w, by); ctx.stroke()
    const offset = i % 2 === 0 ? o.w / 2 : o.w / 4
    ctx.beginPath(); ctx.moveTo(o.x + offset, by - brickH); ctx.lineTo(o.x + offset, by); ctx.stroke()
  }
  // 上端の炎
  ctx.fillStyle = '#ff7722'
  const flames = Math.max(2, Math.round(o.w / 12))
  for (let i = 0; i < flames; i++) {
    const fx = o.x + (i + 0.5) * (o.w / flames)
    const fh = 8 + Math.abs(Math.sin(frame * 0.3 + i)) * 8
    ctx.beginPath()
    ctx.moveTo(fx - 4, o.y); ctx.quadraticCurveTo(fx, o.y - fh, fx + 4, o.y); ctx.closePath(); ctx.fill()
  }
}

// データブロック：踏めない壁。0/1が縦に流れるソリッドなブロック。
function dDataBlock(ctx: CanvasRenderingContext2D, o: Obstacle, theme: Theme, frame: number) {
  rrect(ctx, o.x, o.y, o.w, o.h, 3); ctx.fill(); ctx.stroke()
  ctx.save()
  ctx.beginPath(); ctx.rect(o.x + 2, o.y + 2, o.w - 4, o.h - 4); ctx.clip()
  ctx.fillStyle = theme.groundLineColor
  ctx.font = '10px monospace'; ctx.textAlign = 'center'
  const cols = Math.max(1, Math.floor(o.w / 12))
  for (let c = 0; c < cols; c++) {
    const colX = o.x + (c + 0.5) * (o.w / cols)
    for (let r = 0; r < Math.ceil(o.h / 12) + 1; r++) {
      const drop = (frame * 0.8 + c * 17 + r * 12) % (o.h + 12)
      ctx.globalAlpha = 0.35 + ((c + r) % 2) * 0.25
      const bit = (Math.floor(frame * 0.1 + c * 3 + r * 7) % 2) === 0 ? '0' : '1'
      ctx.fillText(bit, colX, o.y + drop)
    }
  }
  ctx.globalAlpha = 1
  ctx.restore()
}

// ── 電子情報工学科：踏めない障壁（コードを止めるエラー・概念）────────────────

// 構文エラー：宙に浮く閉じ忘れの「}」＋赤い波線(squiggly)＋unexpected。
function dSyntaxError(ctx: CanvasRenderingContext2D, o: Obstacle, _theme: Theme, frame: number) {
  const cx = o.x + o.w / 2, cy = o.y + o.h / 2
  ctx.fillStyle = '#ffdddd'
  ctx.font = `bold ${Math.floor(o.h * 0.95)}px monospace`
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.shadowColor = '#ff4455'; ctx.shadowBlur = 6
  ctx.fillText('}', cx, cy)
  ctx.shadowBlur = 0
  ctx.strokeStyle = '#ff3344'; ctx.lineWidth = 2
  const wy = o.y + o.h + 4, amp = 3, step = 4
  ctx.beginPath()
  let first = true
  for (let x = o.x - 4; x <= o.x + o.w + 4; x += step) {
    const yy = wy + (Math.round((x - o.x) / step) % 2 === 0 ? -amp : amp)
    if (first) { ctx.moveTo(x, yy); first = false } else ctx.lineTo(x, yy)
  }
  ctx.stroke()
  if (Math.floor(frame * 0.1) % 2 === 0) {
    ctx.fillStyle = '#ff5566'; ctx.font = '8px monospace'
    ctx.fillText('unexpected', cx, o.y - 8)
  }
}

// malloc/free 点滅ゲート：malloc（実体）時は赤い確保メモリの壁、free（消滅）時は点線枠だけ＝すり抜け可。
// solid 判定は engine の衝突判定と共有（mallocSolid）。消えた瞬間に走り抜けるタイミング突破型。
function dMallocFree(ctx: CanvasRenderingContext2D, o: Obstacle, _theme: Theme, frame: number) {
  const cx = o.x + o.w / 2, cy = o.y + o.h / 2
  const solid = mallocSolid(o.phase, frame)
  if (solid) {
    // 実体：確保されたメモリブロック
    ctx.fillStyle = '#3a1414'; ctx.strokeStyle = '#ff5522'; ctx.lineWidth = 2.5
    ctx.shadowColor = '#ff4400'; ctx.shadowBlur = 8
    rrect(ctx, o.x, o.y, o.w, o.h, 3); ctx.fill(); ctx.stroke()
    ctx.shadowBlur = 0
    // メモリのバイト列（確保中の表現）
    ctx.fillStyle = 'rgba(255,90,40,0.45)'
    const cell = 6
    for (let yy = o.y + 6; yy < o.y + o.h - 16; yy += cell + 2) {
      for (let xx = o.x + 5; xx < o.x + o.w - 4; xx += cell + 2) ctx.fillRect(xx, yy, cell, cell)
    }
    ctx.fillStyle = '#ffcc66'; ctx.font = `bold ${Math.min(11, Math.floor(o.w * 0.3))}px monospace`
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'
    ctx.fillText('malloc()', cx, o.y + o.h - 3)
  } else {
    // 解放済み：点線枠だけ（今は通り抜けられる合図）
    ctx.shadowBlur = 0
    ctx.strokeStyle = 'rgba(255,120,80,0.6)'; ctx.lineWidth = 1.5
    ctx.setLineDash([5, 4])
    rrect(ctx, o.x, o.y, o.w, o.h, 3); ctx.stroke()
    ctx.setLineDash([])
    ctx.globalAlpha = 0.7
    ctx.fillStyle = '#ff9977'; ctx.font = `${Math.min(10, Math.floor(o.w * 0.28))}px monospace`
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText('free()', cx, cy)
    ctx.globalAlpha = 1
  }
}

// ブロックチェーンの塔：ダブルジャンプ必須の高壁。ブロックが縦に連なりハッシュ＋チェーンで繋がる。赤系。
function dBlockchain(ctx: CanvasRenderingContext2D, o: Obstacle, _theme: Theme, _frame: number) {
  const n = Math.max(3, Math.floor(o.h / 28))
  const bh = o.h / n
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  for (let i = 0; i < n; i++) {
    const by = o.y + i * bh
    const isGenesis = i === n - 1
    ctx.fillStyle = isGenesis ? '#5a1a1a' : '#3a1414'
    ctx.strokeStyle = '#ff5522'; ctx.lineWidth = 2
    ctx.shadowColor = '#ff4400'; ctx.shadowBlur = 6
    rrect(ctx, o.x, by + 2, o.w, bh - 4, 3); ctx.fill(); ctx.stroke()
    ctx.shadowBlur = 0
    ctx.fillStyle = '#ffaa66'; ctx.font = `${Math.min(9, Math.floor(o.w * 0.24))}px monospace`
    const label = isGenesis ? 'genesis' : '#' + ((i * 2654435761) >>> 0).toString(16).slice(0, 4)
    ctx.fillText(label, o.x + o.w / 2, by + bh / 2)
    if (i < n - 1) {
      // チェーンリンク
      ctx.strokeStyle = '#ffcc66'; ctx.lineWidth = 2
      ctx.beginPath(); ctx.arc(o.x + o.w / 2, by + bh, 3, 0, Math.PI * 2); ctx.stroke()
    }
  }
}

// スタックオーバーフロー：スタックフレームの箱を積み上げ、上ほど崩れそうに揺れる高壁。
function dStackOverflow(ctx: CanvasRenderingContext2D, o: Obstacle, theme: Theme, frame: number) {
  const frames = Math.max(3, Math.floor(o.h / 16))
  const fh = o.h / frames
  ctx.lineWidth = 1.5; ctx.strokeStyle = theme.obstacleStroke
  ctx.font = `${Math.floor(fh * 0.5)}px monospace`
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  for (let i = 0; i < frames; i++) {
    const t = i / frames
    const fy = o.y + o.h - (i + 1) * fh
    const sway = Math.sin(frame * 0.12 + i * 0.5) * (t * t * 11)
    const top = i === frames - 1
    ctx.fillStyle = top ? '#ff5555' : theme.obstacleColor
    rrect(ctx, o.x + sway, fy, o.w, fh - 2, 2); ctx.fill(); ctx.stroke()
    ctx.fillStyle = top ? '#fff' : theme.obstacleStroke
    ctx.fillText('call()', o.x + sway + o.w / 2, fy + fh / 2)
  }
}

// ヌルポインタ参照：nullラベルから伸びた矢印が虚空(×)を指してブラ下がる。
function dNullPointer(ctx: CanvasRenderingContext2D, o: Obstacle, theme: Theme, frame: number) {
  const cx = o.x + o.w / 2
  const sway = Math.sin(frame * 0.13) * 5
  const boxH = o.h * 0.42
  ctx.fillStyle = theme.obstacleColor; ctx.strokeStyle = theme.obstacleStroke; ctx.lineWidth = 2
  rrect(ctx, o.x, o.y, o.w, boxH, 3); ctx.fill(); ctx.stroke()
  ctx.fillStyle = '#ff5566'; ctx.font = `bold ${Math.floor(boxH * 0.5)}px monospace`
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText('null', cx, o.y + boxH / 2)
  ctx.strokeStyle = '#ff5566'; ctx.lineWidth = 2
  const ax = cx + sway, bot = o.y + o.h - 8
  ctx.beginPath(); ctx.moveTo(cx, o.y + boxH); ctx.lineTo(ax, bot); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(ax, bot); ctx.lineTo(ax - 5, bot - 7); ctx.moveTo(ax, bot); ctx.lineTo(ax + 5, bot - 7); ctx.stroke()
  const vy = o.y + o.h - 2, vs = 4
  ctx.strokeStyle = '#888'
  ctx.beginPath(); ctx.moveTo(ax - vs, vy - vs); ctx.lineTo(ax + vs, vy + vs)
  ctx.moveTo(ax + vs, vy - vs); ctx.lineTo(ax - vs, vy + vs); ctx.stroke()
}

// マージコンフリクト：HEAD(緑)とincoming(赤)で割れたブロック。境界の=======がグリッチ。
function dMergeConflict(ctx: CanvasRenderingContext2D, o: Obstacle, theme: Theme, frame: number) {
  const halfH = o.h / 2
  ctx.lineWidth = 1.5; ctx.strokeStyle = theme.obstacleStroke
  ctx.font = `${Math.min(11, Math.floor(o.h * 0.16))}px monospace`
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle'
  ctx.fillStyle = '#1f7a3f'
  ctx.fillRect(o.x, o.y, o.w, halfH); ctx.strokeRect(o.x, o.y, o.w, halfH)
  ctx.fillStyle = '#cfffdf'; ctx.fillText('<<<<<<< HEAD', o.x + 4, o.y + halfH * 0.5)
  ctx.fillStyle = '#9a2a3a'
  ctx.fillRect(o.x, o.y + halfH, o.w, halfH); ctx.strokeRect(o.x, o.y + halfH, o.w, halfH)
  ctx.fillStyle = '#ffd0d8'; ctx.fillText('>>>>>>>', o.x + 4, o.y + halfH * 1.5)
  const gshift = (Math.floor(frame * 0.3) % 2) * 2
  ctx.fillStyle = '#ffff66'; ctx.fillRect(o.x - 2 + gshift, o.y + halfH - 2, o.w + 4, 4)
  ctx.fillStyle = '#000'; ctx.fillText('=======', o.x + 4 + gshift, o.y + halfH)
}

// セグフォ：SIGSEGV＋16進ダンプが崩落し、ブロックが欠ける。
function dSegfault(ctx: CanvasRenderingContext2D, o: Obstacle, _theme: Theme, frame: number) {
  ctx.fillStyle = '#222'; ctx.strokeStyle = '#ff3333'; ctx.lineWidth = 2
  ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 6
  rrect(ctx, o.x, o.y, o.w, o.h, 2); ctx.fill(); ctx.stroke()
  ctx.shadowBlur = 0
  ctx.fillStyle = '#ff4444'; ctx.font = `bold ${Math.min(13, Math.floor(o.w * 0.16))}px monospace`
  ctx.textAlign = 'center'; ctx.textBaseline = 'top'
  ctx.fillText('SIGSEGV', o.x + o.w / 2, o.y + 4)
  const hex = ['0xDEAD', 'BEEF', '0x0000', 'FFFF', 'core']
  ctx.font = '9px monospace'; ctx.textAlign = 'left'
  for (let i = 0; i < hex.length; i++) {
    const fall = (frame * 1.2 + i * 23) % o.h
    ctx.globalAlpha = 0.4 + 0.4 * Math.sin(frame * 0.1 + i)
    ctx.fillStyle = '#ff6666'
    ctx.fillText(hex[i], o.x + 5 + (i % 2) * o.w * 0.45, o.y + 18 + fall * 0.4)
  }
  ctx.globalAlpha = 1
  if (Math.floor(frame * 0.15) % 3 === 0) {
    ctx.fillStyle = '#000'; ctx.fillRect(o.x + o.w * 0.3, o.y + o.h * 0.5, o.w * 0.3, 6)
  }
}

// ファイアウォール：電子情報で最も高い「炎の壁」。ダブルジャンプ必須。
// レンガ調の暗赤の壁＋上端から立ち上る炎。赤系の危険色で「踏めない」を明示。
function dFirewallTall(ctx: CanvasRenderingContext2D, o: Obstacle, _theme: Theme, frame: number) {
  // 壁本体（暗赤レンガ）
  ctx.fillStyle = '#3a1414'; ctx.strokeStyle = '#ff5522'; ctx.lineWidth = 2.5
  ctx.shadowColor = '#ff4400'; ctx.shadowBlur = 8
  rrect(ctx, o.x, o.y, o.w, o.h, 3); ctx.fill(); ctx.stroke()
  ctx.shadowBlur = 0
  // レンガの目地（横線＋互い違いの縦線）
  ctx.strokeStyle = 'rgba(255,90,40,0.30)'; ctx.lineWidth = 1
  const brickH = 13
  let row = 0
  for (let by = o.y + brickH; by < o.y + o.h - 2; by += brickH) {
    ctx.beginPath(); ctx.moveTo(o.x + 1, by); ctx.lineTo(o.x + o.w - 1, by); ctx.stroke()
    const offset = row % 2 === 0 ? o.w / 2 : o.w / 4
    ctx.beginPath(); ctx.moveTo(o.x + offset, by); ctx.lineTo(o.x + offset, by + brickH); ctx.stroke()
    row++
  }
  // 上端から立ち上る炎（揺らめき）
  const flames = Math.max(2, Math.round(o.w / 12))
  for (let i = 0; i < flames; i++) {
    const fx = o.x + (i + 0.5) * (o.w / flames)
    const fh = 12 + Math.abs(Math.sin(frame * 0.3 + i * 1.3)) * 16
    const grad = ctx.createLinearGradient(fx, o.y - fh, fx, o.y)
    grad.addColorStop(0, 'rgba(255,230,80,0)')
    grad.addColorStop(0.4, '#ffcc33')
    grad.addColorStop(1, '#ff4400')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.moveTo(fx - 5, o.y)
    ctx.quadraticCurveTo(fx - 2, o.y - fh * 0.6, fx, o.y - fh)
    ctx.quadraticCurveTo(fx + 2, o.y - fh * 0.6, fx + 5, o.y)
    ctx.closePath(); ctx.fill()
  }
  // FIREWALL（縦書きラベル）
  ctx.fillStyle = '#ffcc66'; ctx.font = `bold ${Math.min(11, Math.floor(o.w * 0.42))}px monospace`
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  const word = 'FIREWALL'
  const cx = o.x + o.w / 2
  const startY = o.y + o.h / 2 - (word.length - 1) * 6
  for (let i = 0; i < word.length; i++) ctx.fillText(word[i], cx, startY + i * 12)
}

export const OBSTACLE_DRAWERS: Record<Obstacle['shape'], ObstacleDrawFn> = {
  gear: dGear,
  bolt: dBolt,
  piston: dPiston,
  circuit: dCircuit,
  coil: dCoil,
  capacitor: dCapacitor,
  bug: dBug,
  monitor: dMonitor,
  chip: dChip,
  bacteria: dBacteria,
  flask: dFlask,
  mushroom: dMushroom,
  crystal: (ctx, o) => dCrystal(ctx, o),
  ingot: dIngot,
  lattice: dLattice,
  stalactite: dStalactite,
  wrench: dWrench,
  spring: dSpring,
  flywheel: dFlywheel,
  robot_arm: dRobotArm,
  hammer: dHammer,
  conveyor: dConveyor,
  resistor: dResistor,
  transistor: dTransistor,
  electron: dElectron,
  tesla: dTesla,
  arc_ring: dArcRing,
  pylon: dPylon,
  virus: dVirus,
  glitch: dGlitch,
  firewall: dFirewallTall,
  data_block: dDataBlock,
  syntax_error: dSyntaxError,
  malloc_free: dMallocFree,
  blockchain: dBlockchain,
  stack_overflow: dStackOverflow,
  null_pointer: dNullPointer,
  merge_conflict: dMergeConflict,
  segfault: dSegfault,
}

export function drawObstacle(ctx: CanvasRenderingContext2D, o: Obstacle, theme: Theme, frame: number) {
  ctx.save()
  ctx.fillStyle = theme.obstacleColor; ctx.strokeStyle = theme.obstacleStroke; ctx.lineWidth = 2
  ctx.shadowColor = theme.obstacleStroke; ctx.shadowBlur = 6
  OBSTACLE_DRAWERS[o.shape](ctx, o, theme, frame)
  ctx.restore()
}
