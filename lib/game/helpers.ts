import { PLAYER_X } from './constants'

export interface Box { x: number; y: number; w: number; h: number }

export function rrect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath()
}

export function overlaps(a: Box, b: Box): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}

export function hitCircle(box: Box, cx: number, cy: number, r: number): boolean {
  const nx = Math.max(box.x, Math.min(cx, box.x + box.w))
  const ny = Math.max(box.y, Math.min(cy, box.y + box.h))
  return (nx - cx) ** 2 + (ny - cy) ** 2 < r * r
}

// h は当たり判定の高さ。材料工学科だけ工程（液滴・薄板など）に応じて変える。
export function playerHitbox(py: number, h = 46): Box {
  return { x: PLAYER_X - 12, y: py - h, w: 24, h }
}
