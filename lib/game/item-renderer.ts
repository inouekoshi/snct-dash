import type { AreaId } from './areas'
import { AREAS } from './areas'
import type { Item } from './engine-types'
import { rrect } from './helpers'

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
