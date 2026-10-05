import { PLAYER_X } from './constants'
import type { Item } from './engine-types'

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

// h は当たり判定の高さ。材料工学科だけ工程（液滴・薄板など）に応じて変える。
export function playerHitbox(py: number, h = 46): Box {
  return { x: PLAYER_X - 12, y: py - h, w: 24, h }
}

// アイテムの取得判定ボックス（item.x / item.y は Canvas 座標の中心）。null は判定なし（看板）。
export function itemHitbox(it: Item): Box | null {
  switch (it.effect) {
    case 'charge':  return { x: it.x - 11, y: it.y - 15, w: 22, h: 30 }
    case 'shield':  return { x: it.x - 14, y: it.y - 14, w: 28, h: 28 }
    case 'furnace': return { x: it.x - 22, y: it.y - 28, w: 44, h: 56 }
    case 'quench':  return { x: it.x - 42, y: it.y - 14, w: 84, h: 26 }
    default:        return null
  }
}
