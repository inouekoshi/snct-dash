import type { AreaId } from './areas'
import { AREAS } from './areas'
import type { Item } from './engine-types'
import { rrect } from './helpers'
import { SHIELD_COLOR } from './constants'

type Theme = typeof AREAS[AreaId]

// 充電サバイバル型の🔋電池アイテムを描画する。
// item.x/item.y は engine 側で Canvas 座標に更新済み。wobble は上下のふわふわ揺れ。
export function drawBattery(
  ctx: CanvasRenderingContext2D,
  item: Item,
  theme: Theme,
  frame: number,
): void {
  const bob = Math.sin(item.wobble) * 4
  const cx = item.x
  const cy = item.y + bob

  const w = 22, h = 30
  const x = cx - w / 2
  const y = cy - h / 2

  ctx.save()
  ctx.shadowColor = theme.coinColor
  ctx.shadowBlur = 8 + (Math.sin(frame * 0.12) * 0.5 + 0.5) * 8

  // 端子（上の小さな突起）
  ctx.fillStyle = theme.coinColor
  ctx.fillRect(cx - 4, y - 4, 8, 4)

  // 本体
  ctx.fillStyle = theme.obstacleColor
  ctx.strokeStyle = theme.coinColor
  ctx.lineWidth = 2
  rrect(ctx, x, y, w, h, 4)
  ctx.fill()
  ctx.stroke()

  // 稲妻マーク（充電シンボル）
  ctx.shadowBlur = 0
  ctx.fillStyle = theme.coinColor
  ctx.beginPath()
  ctx.moveTo(cx + 3, y + 5)
  ctx.lineTo(cx - 5, y + h * 0.55)
  ctx.lineTo(cx - 0.5, y + h * 0.55)
  ctx.lineTo(cx - 3, y + h - 4)
  ctx.lineTo(cx + 6, y + h * 0.42)
  ctx.lineTo(cx + 1, y + h * 0.42)
  ctx.closePath()
  ctx.fill()

  ctx.restore()
}

// 生物応用化学科：保護バリアのカプセルアイテム。取ると1回だけ被弾を無効化する。
// item.x/item.y は engine 側で Canvas 座標に更新済み。wobble は上下のふわふわ揺れ。
export function drawShieldItem(
  ctx: CanvasRenderingContext2D,
  item: Item,
  frame: number,
): void {
  const bob = Math.sin(item.wobble) * 4
  const cx = item.x
  const cy = item.y + bob
  const r = 13
  const pulse = 0.5 + Math.sin(frame * 0.12) * 0.5

  ctx.save()
  ctx.shadowColor = SHIELD_COLOR
  ctx.shadowBlur = 8 + pulse * 8

  // 外側のバリア膜
  ctx.fillStyle = 'rgba(95,251,241,0.18)'
  ctx.beginPath(); ctx.arc(cx, cy, r + 3, 0, Math.PI * 2); ctx.fill()

  // リング
  ctx.strokeStyle = SHIELD_COLOR
  ctx.lineWidth = 2
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke()

  ctx.shadowBlur = 0

  // 内側コア
  ctx.fillStyle = 'rgba(95,251,241,0.32)'
  ctx.beginPath(); ctx.arc(cx, cy, r - 4, 0, Math.PI * 2); ctx.fill()

  // ハイライト
  ctx.fillStyle = 'rgba(255,255,255,0.8)'
  ctx.beginPath(); ctx.arc(cx - 4, cy - 4, 2.5, 0, Math.PI * 2); ctx.fill()

  // 十字（保護シンボル）
  ctx.strokeStyle = '#eafffd'
  ctx.lineWidth = 2.5
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(cx, cy - 5); ctx.lineTo(cx, cy + 5)
  ctx.moveTo(cx - 5, cy); ctx.lineTo(cx + 5, cy)
  ctx.stroke()

  ctx.restore()
}
