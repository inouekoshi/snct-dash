// 材料工学科（鍛えてカン！）専用の描画。
// 見た目は学科サイトの世界観「材料の宇宙」（電子顕微鏡で見た金属表面＝星、結晶方位マップ＝オーロラ）を
// 背景に残し、そこへ炉・赤熱した塊・ハンマーを足している。
// 塊の粒々は「結晶粒」の絵（粗い粒の塊 → 細かい粒の板）。叩くと粒が細かくなる、とは文章では言い切らない。
import type { AreaId } from './areas'
import { AREAS } from './areas'
import type { Obstacle } from './engine-types'
import { rrect } from './helpers'
import {
  CANVAS_W, CANVAS_H, DEFAULT_GROUND_Y, PLAYER_X,
  FORGE_RING_OFFSET, FORGE_RING_R, FORGE_SPAWN_DIST, FORGE_SWING_FRAMES,
} from './constants'

type Theme = typeof AREAS[AreaId]
export type ForgeJudge = 'perfect' | 'good' | 'early' | 'late'

const RING_X = PLAYER_X + FORGE_RING_OFFSET
const RING_Y = DEFAULT_GROUND_Y - 20

// 原子1個（分子模型の球）。ハイライト付き。
function atom(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  ctx.fillStyle = color
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.45)'
  ctx.beginPath(); ctx.arc(x - r * 0.35, y - r * 0.35, r * 0.35, 0, Math.PI * 2); ctx.fill()
}

function bond(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, color: string, w = 3) {
  ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round'
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke()
}

// 疑似乱数（座標から決まる。毎フレーム同じ配置にするため）
function hash(n: number): number {
  const s = Math.sin(n * 127.1) * 43758.5453
  return s - Math.floor(s)
}

// ── 背景：「材料の宇宙」の星とオーロラ ──────────────────────────────────────────
export function bgMat(ctx: CanvasRenderingContext2D, bgX: number, frame: number) {
  // 星（電子顕微鏡で見た金属表面）：奥に流れる
  for (let i = 0; i < 60; i++) {
    const sx = ((hash(i) * CANVAS_W * 2 + bgX * (0.05 + hash(i + 7) * 0.08)) % (CANVAS_W * 2) + CANVAS_W * 2) % (CANVAS_W * 2) - CANVAS_W * 0.5
    const sy = 46 + hash(i + 3) * (DEFAULT_GROUND_Y - 60)
    ctx.globalAlpha = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(frame * 0.05 + i))
    ctx.fillStyle = i % 5 === 0 ? '#b8ff6a' : '#d9c8ff'
    ctx.fillRect(sx, sy, i % 5 === 0 ? 3 : 2, i % 5 === 0 ? 3 : 2)
  }
  ctx.globalAlpha = 1

  // オーロラ（結晶方位マップ）：うっすらと
  const colors = ['#ff4fd8', '#4fd1ff', '#7dff6a', '#ffd84f']
  for (let b = 0; b < 4; b++) {
    ctx.globalAlpha = 0.07
    ctx.strokeStyle = colors[b]; ctx.lineWidth = 14
    ctx.beginPath()
    for (let x = 0; x <= CANVAS_W; x += 20) {
      const y = 70 + b * 26 + Math.sin((x - bgX * 0.15) * 0.012 + b * 1.7 + frame * 0.01) * 14
      if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
    }
    ctx.stroke()
  }
  ctx.globalAlpha = 1
}

// ── 地面：整列した結晶格子（ボール＆スティック）。上の線は炉の熱でほんのり赤い ───────────
export function drawMatGround(ctx: CanvasRenderingContext2D, theme: Theme, stageProgress: number) {
  const gy = DEFAULT_GROUND_Y
  ctx.fillStyle = theme.groundColor
  ctx.fillRect(0, gy + 3, CANVAS_W, CANVAS_H - gy - 3)

  const rows = [gy + 6, gy + 26, gy + 46]
  const startI = Math.floor((stageProgress - PLAYER_X - 60) / 40)
  const endI = Math.ceil((stageProgress - PLAYER_X + CANVAS_W + 60) / 40)
  for (let i = startI; i <= endI; i++) {
    for (let r = 0; r < rows.length; r++) {
      // 互い違いに整列した格子
      const x = PLAYER_X + (i * 40 - stageProgress) + (r % 2 === 1 ? 20 : 0)
      const y = rows[r]
      if (r === 0) bond(ctx, x, y, x + 40, y, theme.groundLineColor, 3)
      else bond(ctx, x, y, x + 40, y, theme.groundLineColor + '88', 2)
      atom(ctx, x, y, r === 0 ? 6 : 4.5, r === 0 ? theme.coinColor : '#b07ad8')
    }
  }
}

// ── 塊（hot_ingot）：赤く光る四角い金属塊。表面に大きな粒々の模様 ─────────────────────────
// 叩いた塊（struck）は薄い板になって後ろへ飛ぶ。o.phase は叩いてからの経過フレーム。
export function dHotIngot(ctx: CanvasRenderingContext2D, o: Obstacle, _theme: Theme, frame: number) {
  if (o.struck) { drawPlate(ctx, o); return }
  const { x, y, w, h } = o
  const flick = 0.5 + 0.5 * Math.sin(frame * 0.2 + o.stageX * 0.01)
  const g = ctx.createLinearGradient(0, y, 0, y + h)
  g.addColorStop(0, '#ffb060'); g.addColorStop(0.5, '#ff5a2a'); g.addColorStop(1, '#a8160e')
  ctx.shadowColor = '#ff5a2a'; ctx.shadowBlur = 10 + 8 * flick
  ctx.fillStyle = g
  rrect(ctx, x, y, w, h, 5); ctx.fill()
  ctx.shadowBlur = 0
  ctx.strokeStyle = '#ffd9a0'; ctx.lineWidth = 2
  rrect(ctx, x, y, w, h, 5); ctx.stroke()
  // 粗い粒（結晶粒）の境界線：大きめの不規則な区画
  ctx.save()
  rrect(ctx, x, y, w, h, 5); ctx.clip()
  ctx.strokeStyle = 'rgba(80,0,0,0.55)'; ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(x + w * 0.35, y); ctx.lineTo(x + w * 0.28, y + h * 0.45); ctx.lineTo(x + w * 0.5, y + h * 0.7); ctx.lineTo(x + w * 0.45, y + h)
  ctx.moveTo(x + w * 0.28, y + h * 0.45); ctx.lineTo(x, y + h * 0.35)
  ctx.moveTo(x + w * 0.5, y + h * 0.7); ctx.lineTo(x + w * 0.78, y + h * 0.55); ctx.lineTo(x + w * 0.7, y)
  ctx.moveTo(x + w * 0.78, y + h * 0.55); ctx.lineTo(x + w, y + h * 0.65)
  ctx.stroke()
  ctx.restore()
}

// 叩いた後の板：薄く、粒の模様が細かい
function drawPlate(ctx: CanvasRenderingContext2D, o: Obstacle) {
  const age = o.phase
  const w = o.w + 6, h = 10
  const lift = Math.min(age, 18) * 1.4
  const x = o.x - 3, y = o.y + o.h - h - lift
  ctx.save()
  ctx.globalAlpha = Math.max(0, 1 - Math.max(0, age - 24) / 24)
  const cool = Math.min(1, age / 40) // 時間とともに赤熱から冷めていく
  const g = ctx.createLinearGradient(0, y, 0, y + h)
  g.addColorStop(0, cool < 0.5 ? '#fff0c0' : '#e9eef6')
  g.addColorStop(1, cool < 0.5 ? '#ff9a3a' : '#9aa6b6')
  ctx.shadowColor = '#ffd27a'; ctx.shadowBlur = 12 * (1 - cool)
  ctx.fillStyle = g
  rrect(ctx, x, y, w, h, 3); ctx.fill()
  ctx.shadowBlur = 0
  // 細かい粒
  ctx.strokeStyle = 'rgba(90,40,10,0.5)'; ctx.lineWidth = 1
  ctx.beginPath()
  for (let gx = x + 3; gx < x + w - 2; gx += 5) {
    ctx.moveTo(gx, y + 1); ctx.lineTo(gx + 2, y + h / 2); ctx.lineTo(gx - 1, y + h - 1)
  }
  ctx.stroke()
  ctx.restore()
}

// ── 判定の輪と、予告の輪 ───────────────────────────────────────────────────────────────
// 予告の輪は塊の中心のまわりに描き、塊が輪に近づくほど縮む（距離で縮めるので、速度が変わってもずれない）。
export function drawForgeRings(
  ctx: CanvasRenderingContext2D, obstacles: readonly Obstacle[], holding: boolean,
  arrival: number, frame: number,
) {
  ctx.save()
  // 予告の輪
  ctx.lineWidth = 2
  for (const o of obstacles) {
    if (o.struck || o.shape !== 'hot_ingot') continue
    const cx = o.x + o.w / 2, cy = o.y + o.h / 2
    const dist = cx - RING_X
    if (dist < -10 || cx > CANVAS_W + 80) continue
    const r = FORGE_RING_R * (1 + 2 * Math.min(1, Math.max(0, dist) / FORGE_SPAWN_DIST))
    ctx.globalAlpha = 0.75
    ctx.strokeStyle = '#ffe2b0'
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke()
  }
  // 判定の輪：塊が近いほど濃く。チュートリアルの待ち中は点滅
  const near = Number.isFinite(arrival) ? Math.max(0, 1 - arrival / 12) : 0
  const blink = holding ? 0.5 + 0.5 * Math.sin(frame * 0.5) : 0
  ctx.globalAlpha = Math.min(1, 0.45 + 0.4 * near + 0.4 * blink)
  ctx.strokeStyle = '#ffffff'
  ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 6 + 10 * near + 10 * blink
  ctx.lineWidth = 4
  ctx.beginPath(); ctx.arc(RING_X, RING_Y, FORGE_RING_R, 0, Math.PI * 2); ctx.stroke()
  ctx.shadowBlur = 0
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(RING_X - 8, RING_Y); ctx.lineTo(RING_X + 8, RING_Y)
  ctx.moveTo(RING_X, RING_Y - 8); ctx.lineTo(RING_X, RING_Y + 8)
  ctx.stroke()
  ctx.restore()
}

// ── ハンマー：長い柄を担いでいて、振ると柄の先が輪に届く ────────────────────────────────────
export interface ForgeHammerState {
  py: number
  swingTimer: number
  frame: number
}

export function drawForgeHammer(ctx: CanvasRenderingContext2D, s: ForgeHammerState) {
  const px = PLAYER_X + 6, pyv = s.py - 30
  const L = Math.hypot(RING_X - px, RING_Y - pyv)
  const hit = Math.atan2(RING_Y - pyv, RING_X - px)         // 輪にぴったり届く角度
  const rest = -115 * Math.PI / 180                          // 肩に担いでいる角度
  const u = s.swingTimer / FORGE_SWING_FRAMES                // 1 → 0
  let ang = rest + Math.sin(s.frame * 0.2) * 0.04
  if (s.swingTimer > 0) {
    if (u > 0.4) {
      const q = (1 - u) / 0.6
      ang = rest + (hit - rest) * q * q
      // 振りの軌跡
      ctx.save()
      ctx.globalAlpha = 0.3 * q
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 6; ctx.lineCap = 'round'
      ctx.beginPath(); ctx.arc(px, pyv, L, rest, ang); ctx.stroke()
      ctx.restore()
    } else {
      const q = u / 0.4
      ang = hit + (rest - hit) * (1 - q) * 0.5
    }
  }
  ctx.save()
  ctx.translate(px, pyv)
  ctx.rotate(ang)
  ctx.fillStyle = '#8a5a2b'
  ctx.fillRect(0, -2.5, L, 5)
  ctx.fillStyle = '#5c3a18'
  ctx.fillRect(0, -2.5, 28, 5)
  const hg = ctx.createLinearGradient(0, -17, 0, 17)
  hg.addColorStop(0, '#e6ebf2'); hg.addColorStop(0.5, '#a0abba'); hg.addColorStop(1, '#5d6573')
  ctx.fillStyle = hg
  rrect(ctx, L - 12, -17, 24, 34, 4); ctx.fill()
  ctx.shadowBlur = 0
  ctx.strokeStyle = '#3a3f4a'; ctx.lineWidth = 2
  rrect(ctx, L - 12, -17, 24, 34, 4); ctx.stroke()
  ctx.restore()
}

// ── HUD：判定の文字・連続回数・チュートリアル ──────────────────────────────────────────
export interface ForgeHudState {
  combo: number
  judge: ForgeJudge | null
  judgeTimer: number
  frame: number
  hint: boolean
  holding: boolean
}

const JUDGE_TEXT: Record<ForgeJudge, { text: string; size: number; color: string }> = {
  perfect: { text: 'カン！', size: 44, color: '#ffe04a' },
  good:    { text: 'コン', size: 20, color: '#ffffff' },
  early:   { text: 'はやい！', size: 24, color: '#7fd4ff' },
  late:    { text: 'おそい！', size: 28, color: '#ff6a6a' },
}

export function drawForgeHud(ctx: CanvasRenderingContext2D, v: ForgeHudState) {
  ctx.save()
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'

  // 連続回数（親指で隠れない上部の中央）
  if (v.combo >= 2) {
    ctx.font = 'bold 34px sans-serif'
    ctx.fillStyle = '#ffe04a'; ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.lineWidth = 5
    ctx.strokeText(`${v.combo}`, CANVAS_W / 2, 62); ctx.fillText(`${v.combo}`, CANVAS_W / 2, 62)
    ctx.font = 'bold 12px sans-serif'; ctx.fillStyle = '#ffffff'
    ctx.fillText('れんぞく', CANVAS_W / 2, 86)
  }

  // チュートリアル：最初の数個のあいだ「叩くんだ」と伝える
  if (v.hint) {
    const pulse = 1 + 0.06 * Math.sin(v.frame * 0.2)
    ctx.save()
    ctx.translate(CANVAS_W / 2, 132); ctx.scale(pulse, pulse)
    ctx.font = 'bold 24px sans-serif'
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = 'rgba(0,0,0,0.65)'; ctx.lineWidth = 5
    const msg = '🔨 タップでたたけ！'
    ctx.strokeText(msg, 0, 0); ctx.fillText(msg, 0, 0)
    if (v.holding) {
      ctx.font = 'bold 14px sans-serif'; ctx.fillStyle = '#ffe04a'
      ctx.fillText('輪に重なったら！', 0, 26)
    }
    ctx.restore()
  }

  // 判定の文字（輪の上。左下・右下は親指で隠れるので避ける）
  if (v.judge) {
    const j = JUDGE_TEXT[v.judge]
    const total = v.judge === 'perfect' ? 36 : v.judge === 'late' ? 50 : v.judge === 'early' ? 30 : 26
    const age = 1 - v.judgeTimer / total
    ctx.globalAlpha = Math.min(1, v.judgeTimer / 10)
    const pop = v.judge === 'perfect' ? 1 + 0.35 * Math.max(0, 1 - age * 5) : 1
    ctx.font = `bold ${Math.round(j.size * pop)}px sans-serif`
    ctx.fillStyle = j.color; ctx.strokeStyle = 'rgba(0,0,0,0.65)'; ctx.lineWidth = 5
    const y = RING_Y - 70 - age * 16
    ctx.strokeText(j.text, RING_X, y); ctx.fillText(j.text, RING_X, y)
  }
  ctx.restore()
}

// 区間の切り替わりのカットイン
export function drawMatCutin(ctx: CanvasRenderingContext2D, theme: Theme, title: string, sub: string, timer: number, total: number) {
  const t = 1 - timer / total
  const alpha = t < 0.15 ? t / 0.15 : t > 0.8 ? (1 - t) / 0.2 : 1
  ctx.save()
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha))
  ctx.fillStyle = 'rgba(10,0,30,0.7)'
  ctx.fillRect(0, CANVAS_H / 2 - 38, CANVAS_W, 70)
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillStyle = theme.groundLineColor; ctx.shadowColor = theme.groundLineColor; ctx.shadowBlur = 12
  ctx.font = 'bold 30px sans-serif'
  ctx.fillText(title, CANVAS_W / 2, CANVAS_H / 2 - 14)
  ctx.shadowBlur = 0
  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 15px sans-serif'
  ctx.fillText(sub, CANVAS_W / 2, CANVAS_H / 2 + 17)
  ctx.restore()
}

// ゴールの演出：最大連続回数
export function drawForgeResult(ctx: CanvasRenderingContext2D, theme: Theme, maxCombo: number) {
  ctx.save()
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillStyle = 'rgba(10,0,30,0.7)'
  rrect(ctx, CANVAS_W / 2 - 150, 78, 300, 80, 14); ctx.fill()
  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 15px sans-serif'
  ctx.fillText('さいだい れんぞく', CANVAS_W / 2, 104)
  ctx.fillStyle = theme.groundLineColor; ctx.font = 'bold 36px sans-serif'
  ctx.fillText(`${maxCombo}`, CANVAS_W / 2, 136)
  ctx.restore()
}
