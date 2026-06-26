import type { AreaId } from './areas'
import { AREAS, bioZone } from './areas'
import type { TerrainSegment } from './engine-types'
import { CANVAS_W, CANVAS_H, DEFAULT_GROUND_Y, PLAYER_X } from './constants'

type Theme = typeof AREAS[AreaId]

export interface BgContext {
  frame: number
  bgX: number
  speed: number
  debug?: boolean  // 電子情報：デバッグモード中はコード雨を強化
  stageProgress?: number
  isBio?: boolean
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

  // 歯車3層（奥行き感）
  const GEAR_LAYERS = [
    { spacing: 260, radii: [28, 42, 60], yBases: [60, 120, 80] },
  ]
  for (const layer of GEAR_LAYERS) {
    for (let gx = (bg.bgX * 0.12 % layer.spacing) - layer.spacing; gx < CANVAS_W + layer.spacing; gx += layer.spacing) {
      for (let i = 0; i < 3; i++) {
        const r = layer.radii[i], gy = layer.yBases[i]
        const rot = bg.frame * (0.003 + i * 0.002) * (i % 2 ? -1 : 1)
        const alpha = 0.04 + i * 0.02
        ctx.globalAlpha = alpha
        ctx.beginPath(); ctx.arc(gx + i * 90, gy, r, 0, Math.PI * 2); ctx.stroke()
        const teeth = 8 + i * 4
        for (let t = 0; t < teeth; t++) {
          const a = rot + t / teeth * Math.PI * 2
          ctx.beginPath()
          ctx.moveTo(gx + i * 90 + Math.cos(a) * r, gy + Math.sin(a) * r)
          ctx.lineTo(gx + i * 90 + Math.cos(a) * (r + 7 + i * 2), gy + Math.sin(a) * (r + 7 + i * 2))
          ctx.stroke()
        }
      }
    }
  }

  // ベルトライン（水平に流れる）
  ctx.strokeStyle = theme.groundLineColor; ctx.lineWidth = 1.5
  for (const by of [80, 140, 175]) {
    const ox = (bg.bgX * 0.3) % 60
    ctx.globalAlpha = 0.04
    ctx.beginPath(); ctx.moveTo(0, by); ctx.lineTo(CANVAS_W, by); ctx.stroke()
    ctx.globalAlpha = 0.06
    for (let bx = -ox; bx < CANVAS_W; bx += 60) {
      ctx.beginPath(); ctx.moveTo(bx, by - 4); ctx.lineTo(bx + 30, by - 4); ctx.stroke()
    }
  }

  // 熱気グラデーション（画面下部）
  const heatAlpha = 0.03 + Math.sin(bg.frame * 0.04) * 0.01
  const hg = ctx.createLinearGradient(0, DEFAULT_GROUND_Y - 40, 0, DEFAULT_GROUND_Y)
  hg.addColorStop(0, 'transparent')
  hg.addColorStop(1, '#ff6600')
  ctx.globalAlpha = heatAlpha; ctx.fillStyle = hg
  ctx.fillRect(0, DEFAULT_GROUND_Y - 40, CANVAS_W, 40)

  ctx.globalAlpha = 1
}

function bgElec(ctx: CanvasRenderingContext2D, theme: Theme, bg: BgContext) {
  ctx.strokeStyle = theme.groundLineColor; ctx.lineWidth = 1
  const gs = 32, ox = bg.bgX % gs
  ctx.globalAlpha = 0.08
  for (let x = ox; x < CANVAS_W; x += gs) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, DEFAULT_GROUND_Y); ctx.stroke() }
  for (let y = 30; y < DEFAULT_GROUND_Y; y += gs) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_W, y); ctx.stroke() }
  ctx.fillStyle = theme.groundLineColor
  ctx.globalAlpha = 0.18
  for (let x = ox; x < CANVAS_W; x += gs) {
    for (let y = 30; y < DEFAULT_GROUND_Y; y += gs) {
      if (Math.abs(Math.sin(x * 0.31 + y * 0.67)) > 0.84) { ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI * 2); ctx.fill() }
    }
  }
  ctx.globalAlpha = 1
}

function bgCode(ctx: CanvasRenderingContext2D, theme: Theme, bg: BgContext) {
  // デバッグモード中はコード雨を高密度・高速化し、サイバー色ティントを重ねる
  const debug = bg.debug
  const colGap = debug ? 14 : 22
  const fall = debug ? 1.6 : 0.5
  const span = debug ? 60 : 80
  const baseAlpha = debug ? 0.34 : 0.18

  if (debug) {
    ctx.fillStyle = '#00ffcc'
    ctx.globalAlpha = 0.06 + Math.sin(bg.frame * 0.2) * 0.03
    ctx.fillRect(0, 0, CANVAS_W, DEFAULT_GROUND_Y)
    ctx.globalAlpha = 1
  }

  ctx.fillStyle = debug ? '#5effd6' : theme.groundLineColor
  ctx.font = '10px monospace'; ctx.textAlign = 'center'
  for (let col = 0; col < CANVAS_W; col += colGap) {
    const drop = ((bg.frame * fall + col * 3.7) % span)
    ctx.globalAlpha = Math.max(0, baseAlpha - drop * 0.003)
    const bit = Math.floor(Math.sin(col * 13.7 + drop) * 100) % 2 === 0 ? '1' : '0'
    ctx.fillText(bit, col, drop + 10)
    ctx.globalAlpha = Math.max(0, baseAlpha * 0.55 - drop * 0.002)
    ctx.fillText(bit === '1' ? '0' : '1', col, drop + 24)
  }
  ctx.globalAlpha = 1
}

function bgBio(ctx: CanvasRenderingContext2D, theme: Theme, bg: BgContext) {
  const p = bg.stageProgress || 0
  const zone = bioZone(p)
  
  // Background tint based on zone
  const isChem = zone === 'chem'
  const tintColor = isChem ? 'rgba(0, 150, 200, 0.1)' : 'rgba(200, 100, 0, 0.1)'
  ctx.fillStyle = tintColor
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

  // Floating dust/bubbles
  ctx.strokeStyle = theme.groundLineColor; ctx.lineWidth = 1.5
  for (let i = 0; i < 15; i++) {
    const bx = ((bg.frame * 0.4 + i * 137) % (CANVAS_W + 60)) - 30
    const by = CANVAS_H - ((bg.frame * (0.8 + i * 0.1) + i * 47) % (CANVAS_H + 60)) // Ascending bubbles
    const br = 4 + (i % 3) * 4
    ctx.globalAlpha = 0.15
    ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.stroke()
    ctx.fillStyle = theme.groundLineColor; ctx.globalAlpha = 0.08
    ctx.beginPath(); ctx.arc(bx - br * 0.3, by - br * 0.3, br * 0.25, 0, Math.PI * 2); ctx.fill()
  }

  // Light rays
  ctx.globalAlpha = 0.05
  ctx.fillStyle = '#ffffff'
  for (let i = 0; i < 3; i++) {
    const lx = (bg.frame * -0.5 + i * 300) % (CANVAS_W * 2) - CANVAS_W / 2
    ctx.beginPath()
    ctx.moveTo(lx, 0)
    ctx.lineTo(lx + 150, 0)
    ctx.lineTo(lx + 50, CANVAS_H)
    ctx.lineTo(lx - 50, CANVAS_H)
    ctx.fill()
  }

  // Top/bottom walls (Tank edges)
  ctx.globalAlpha = 1
  ctx.strokeStyle = theme.groundLineColor; ctx.lineWidth = 4
  ctx.shadowColor = theme.groundLineColor; ctx.shadowBlur = 8
  ctx.setLineDash([20, 10])
  ctx.lineDashOffset = -(bg.frame * bg.speed * 0.4) % 30
  
  ctx.beginPath()
  ctx.moveTo(0, 4); ctx.lineTo(CANVAS_W, 4) // Top edge
  ctx.moveTo(0, CANVAS_H - 4); ctx.lineTo(CANVAS_W, CANVAS_H - 4) // Bottom edge
  ctx.stroke()
  
  ctx.setLineDash([]); ctx.shadowBlur = 0
}

function bgMat(ctx: CanvasRenderingContext2D, theme: Theme, bg: BgContext) {
  ctx.strokeStyle = theme.groundLineColor; ctx.lineWidth = 1
  const s = 40, ox = bg.bgX % (s * 2)
  ctx.globalAlpha = 0.07
  for (let x = ox; x < CANVAS_W + s; x += s) {
    for (let y = 20; y < DEFAULT_GROUND_Y; y += s) {
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x + s, y + s * 0.5)
      ctx.lineTo(x, y + s)
      ctx.lineTo(x - s, y + s * 0.5)
      ctx.closePath(); ctx.stroke()
    }
  }
  const lv = ctx.createLinearGradient(0, DEFAULT_GROUND_Y - 20, 0, DEFAULT_GROUND_Y)
  lv.addColorStop(0, 'transparent'); lv.addColorStop(1, theme.groundLineColor + '44')
  ctx.globalAlpha = 0.6; ctx.fillStyle = lv; ctx.fillRect(0, DEFAULT_GROUND_Y - 20, CANVAS_W, 20)
  ctx.globalAlpha = 1
}

// 地形セグメントに基づいて地面を描画する（穴の部分は描画しない）
export function drawGround(
  ctx: CanvasRenderingContext2D,
  theme: Theme,
  bg: BgContext,
  terrain: TerrainSegment[],
  stageProgress: number,
) {
  for (const seg of terrain) {
    if (seg.type === 'hole') continue
    const canvasX = PLAYER_X + (seg.stageX - stageProgress)
    const groundY = seg.groundY

    // 地面の塗り
    ctx.fillStyle = theme.groundColor
    ctx.fillRect(canvasX, groundY + 3, seg.width, CANVAS_H - groundY - 3)

    // 地面ライン（ダッシュ）
    ctx.strokeStyle = theme.groundLineColor; ctx.lineWidth = 2
    ctx.shadowColor = theme.groundLineColor; ctx.shadowBlur = 5
    ctx.setLineDash([28, 14])
    ctx.lineDashOffset = -(bg.frame * bg.speed * 0.4) % 42
    ctx.beginPath()
    ctx.moveTo(canvasX, groundY + 3)
    ctx.lineTo(canvasX + seg.width, groundY + 3)
    ctx.stroke()
    ctx.setLineDash([]); ctx.shadowBlur = 0
  }
}
