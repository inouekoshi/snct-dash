// 材料工学科（製品ができるまでラン）専用の描画。
// 見た目は分子模型（ボール&スティック）と、学科サイトの世界観「材料の宇宙」
// （電子顕微鏡で見た金属表面＝星、結晶方位マップ＝オーロラ）を下敷きにしている。
import type { AreaId } from './areas'
import { AREAS } from './areas'
import type { Item, Obstacle } from './engine-types'
import { rrect } from './helpers'
import {
  CANVAS_W, CANVAS_H, DEFAULT_GROUND_Y, PLAYER_X,
  MAT_FLEX_COLOR, MAT_HARD_COLOR, MAT_PHASE_ORDER, matBoundaries, matPhase,
  type MatPhase,
} from './constants'

type Theme = typeof AREAS[AreaId]
export type MatState = 'normal' | 'flex' | 'hard'

const PHASE_LABEL: Record<MatPhase, string> = { melt: '溶解', roll: '圧延', heat: '熱処理', inspect: '検査' }
const PHASE_CUTIN: Record<MatPhase, [string, string]> = {
  melt:    ['溶解！', 'とけた → ぽよんと弾む'],
  roll:    ['圧延！', 'うすくなった → 低い所を通れる'],
  heat:    ['熱処理！', '看板と同じ色を通れ'],
  inspect: ['検査！', '顕微鏡でチェック…'],
}

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

// ── 背景：「材料の宇宙」。進むほど倍率が上がる（星 → オーロラ → 原子格子 → 顕微鏡）──────────
export function bgMat(ctx: CanvasRenderingContext2D, theme: Theme, bgX: number, frame: number, stageProgress: number) {
  const phase = matPhase(stageProgress)

  // 星（電子顕微鏡で見た金属表面）：全区間で奥に流れる
  for (let i = 0; i < 60; i++) {
    const sx = ((hash(i) * CANVAS_W * 2 + bgX * (0.05 + hash(i + 7) * 0.08)) % (CANVAS_W * 2) + CANVAS_W * 2) % (CANVAS_W * 2) - CANVAS_W * 0.5
    const sy = 46 + hash(i + 3) * (DEFAULT_GROUND_Y - 60)
    ctx.globalAlpha = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(frame * 0.05 + i))
    ctx.fillStyle = i % 5 === 0 ? '#b8ff6a' : '#d9c8ff'
    ctx.fillRect(sx, sy, i % 5 === 0 ? 3 : 2, i % 5 === 0 ? 3 : 2)
  }
  ctx.globalAlpha = 1

  // オーロラ（結晶方位マップ）：圧延以降で現れる
  if (phase !== 'melt') {
    const colors = ['#ff4fd8', '#4fd1ff', '#7dff6a', '#ffd84f']
    for (let b = 0; b < 4; b++) {
      ctx.globalAlpha = phase === 'roll' ? 0.10 : 0.06
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

  // 原子格子（ボール&スティック）：熱処理以降。整列した結晶。
  if (phase === 'heat' || phase === 'inspect') {
    const s = 56, ox = ((bgX * 0.3) % s + s) % s
    ctx.globalAlpha = phase === 'inspect' ? 0.28 : 0.14
    for (let x = ox - s; x < CANVAS_W + s; x += s) {
      for (let y = 60; y < DEFAULT_GROUND_Y - 10; y += s) {
        bond(ctx, x, y, x + s, y, theme.groundLineColor, 2)
        bond(ctx, x, y, x, y + s, theme.groundLineColor, 2)
        bond(ctx, x, y, x + s / 2, y + s / 2, theme.groundLineColor, 1)
        atom(ctx, x, y, 5, theme.coinColor)
        atom(ctx, x + s / 2, y + s / 2, 4, '#e0a0ff')
      }
    }
    ctx.globalAlpha = 1
  }

  // 検査（顕微鏡）：視野の円の外を暗くする
  if (phase === 'inspect') {
    const g = ctx.createRadialGradient(CANVAS_W / 2, CANVAS_H / 2, 90, CANVAS_W / 2, CANVAS_H / 2, CANVAS_W * 0.55)
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.75)')
    ctx.fillStyle = g; ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
    ctx.strokeStyle = 'rgba(200,170,255,0.35)'; ctx.lineWidth = 2
    ctx.beginPath(); ctx.arc(CANVAS_W / 2, CANVAS_H / 2, 150, 0, Math.PI * 2); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(CANVAS_W / 2 - 160, CANVAS_H / 2); ctx.lineTo(CANVAS_W / 2 + 160, CANVAS_H / 2); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(CANVAS_W / 2, CANVAS_H / 2 - 160); ctx.lineTo(CANVAS_W / 2, CANVAS_H / 2 + 160); ctx.stroke()
  }
}

// ── 地面：原子の並びが工程で変わる（溶解＝ランダム → 圧延＝伸びた格子 → 熱処理＝整列）────────
export function drawMatGround(ctx: CanvasRenderingContext2D, theme: Theme, stageProgress: number) {
  const gy = DEFAULT_GROUND_Y
  ctx.fillStyle = theme.groundColor
  ctx.fillRect(0, gy + 3, CANVAS_W, CANVAS_H - gy - 3)

  const rows = [gy + 6, gy + 26, gy + 46]
  const startI = Math.floor((stageProgress - PLAYER_X - 60) / 40)
  const endI = Math.ceil((stageProgress - PLAYER_X + CANVAS_W + 60) / 40)
  for (let i = startI; i <= endI; i++) {
    const wx = i * 40
    const ph = matPhase(wx)
    for (let r = 0; r < rows.length; r++) {
      let x = PLAYER_X + (wx - stageProgress)
      let y = rows[r]
      let nx = x + 40, ny = y
      if (ph === 'melt') {
        // 液体：原子がばらばら
        x += (hash(i * 3 + r) - 0.5) * 18; y += (hash(i * 5 + r) - 0.5) * 10
        nx += (hash((i + 1) * 3 + r) - 0.5) * 18; ny += (hash((i + 1) * 5 + r) - 0.5) * 10
      } else if (ph === 'roll') {
        // 圧延：横に引き伸ばされ、縦が詰まった格子
        y = gy + 6 + r * 13; ny = y
      } else if (r % 2 === 1) {
        // 熱処理以降：互い違いに整列した結晶格子
        x += 20; nx += 20
      }
      if (r === 0) bond(ctx, x, y, nx, ny, theme.groundLineColor, 3)
      else bond(ctx, x, y, nx, ny, theme.groundLineColor + '88', 2)
      atom(ctx, x, y, r === 0 ? 6 : 4.5, r === 0 ? theme.coinColor : '#b07ad8')
    }
  }

  // 工程ゲート（区間の入口）：ボール&スティックのアーチ＋工程名
  for (const b of matBoundaries()) {
    const x = PLAYER_X + (b.x - stageProgress)
    if (x < -80 || x > CANVAS_W + 80) continue
    const top = gy - 150
    ctx.save()
    ctx.shadowColor = theme.groundLineColor; ctx.shadowBlur = 10
    bond(ctx, x - 40, gy, x - 40, top, theme.groundLineColor, 4)
    bond(ctx, x + 40, gy, x + 40, top, theme.groundLineColor, 4)
    bond(ctx, x - 40, top, x + 40, top, theme.groundLineColor, 4)
    for (let k = 0; k <= 4; k++) {
      atom(ctx, x - 40, gy - k * 37.5, 6, theme.coinColor)
      atom(ctx, x + 40, gy - k * 37.5, 6, theme.coinColor)
    }
    ctx.restore()
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(PHASE_LABEL[b.phase], x, top - 14)
  }
}

// ── プレイヤー：工程ごとに形が変わる（液滴 → 薄板 → 金属片）────────────────────────────
export interface MatPlayerState {
  py: number
  pvy: number
  phase: MatPhase
  state: MatState
  invincible: number
  bendTimer: number
  frame: number
}

function drawEyes(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = '#fff'
  ctx.beginPath(); ctx.arc(x - 5, y, 3.5, 0, Math.PI * 2); ctx.arc(x + 5, y, 3.5, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#1a0033'
  ctx.beginPath(); ctx.arc(x - 4, y, 1.8, 0, Math.PI * 2); ctx.arc(x + 6, y, 1.8, 0, Math.PI * 2); ctx.fill()
}

export function drawMatPlayer(ctx: CanvasRenderingContext2D, p: MatPlayerState) {
  const x = PLAYER_X, y = p.py
  const blink = p.invincible > 0 && Math.floor(p.invincible / 4) % 2 === 1
  ctx.save()
  if (blink) ctx.globalAlpha = 0.35

  // 影
  ctx.fillStyle = 'rgba(0,0,0,0.25)'
  ctx.beginPath(); ctx.ellipse(x, DEFAULT_GROUND_Y + 3, 14, 4, 0, 0, Math.PI * 2); ctx.fill()

  if (p.phase === 'melt') {
    // 液滴：落下・上昇で縦に伸び、着地でつぶれる
    const stretch = Math.max(-0.25, Math.min(0.3, -p.pvy * 0.03))
    const rx = 16 * (1 - stretch * 0.6), ry = 16 * (1 + stretch)
    const cy = y - ry
    const g = ctx.createRadialGradient(x - 5, cy - 5, 2, x, cy, ry + 4)
    g.addColorStop(0, '#fff3c0'); g.addColorStop(0.4, '#ffb030'); g.addColorStop(1, '#ff4a10')
    ctx.shadowColor = '#ff7a20'; ctx.shadowBlur = 16
    ctx.fillStyle = g
    ctx.beginPath(); ctx.ellipse(x, cy, rx, ry, 0, 0, Math.PI * 2); ctx.fill()
    ctx.shadowBlur = 0
    drawEyes(ctx, x + 2, cy - 2)
  } else if (p.phase === 'roll') {
    // 薄板：銀色のぺたんこな板
    const w = 46, h = 20
    const g = ctx.createLinearGradient(0, y - h, 0, y)
    g.addColorStop(0, '#f4f7fb'); g.addColorStop(0.5, '#a9b4c2'); g.addColorStop(1, '#6d7888')
    ctx.fillStyle = g
    rrect(ctx, x - w / 2, y - h, w, h, 4); ctx.fill()
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5
    rrect(ctx, x - w / 2, y - h, w, h, 4); ctx.stroke()
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1
    for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.moveTo(x - w / 2 + 6, y - h + 5 + i * 5); ctx.lineTo(x + w / 2 - 6, y - h + 5 + i * 5); ctx.stroke()
    }
    drawEyes(ctx, x + 10, y - h / 2)
  } else {
    // 金属片：状態で色と内部組織が変わる（通常＝灰／しなる＝橙・丸い結晶粒／かたい＝青銀・針状組織）
    const w = 28, h = 40
    const bend = p.bendTimer > 0 ? Math.sin((p.bendTimer / 18) * Math.PI) * 0.5 : 0
    ctx.translate(x, y); ctx.transform(1, 0, -bend, 1 - bend * 0.4, 0, 0); ctx.translate(-x, -y)
    const base = p.state === 'flex' ? MAT_FLEX_COLOR : p.state === 'hard' ? MAT_HARD_COLOR : '#9aa4b0'
    ctx.shadowColor = base; ctx.shadowBlur = p.state === 'normal' ? 0 : 12
    ctx.fillStyle = base
    if (p.state === 'hard') {
      ctx.beginPath()
      ctx.moveTo(x - w / 2, y); ctx.lineTo(x - w / 2, y - h + 8); ctx.lineTo(x - w / 2 + 8, y - h)
      ctx.lineTo(x + w / 2, y - h); ctx.lineTo(x + w / 2, y - 8); ctx.lineTo(x + w / 2 - 8, y)
      ctx.closePath(); ctx.fill()
    } else {
      rrect(ctx, x - w / 2, y - h, w, h, p.state === 'flex' ? 12 : 5); ctx.fill()
    }
    ctx.shadowBlur = 0
    ctx.save()
    ctx.beginPath(); rrect(ctx, x - w / 2, y - h, w, h, 5); ctx.clip()
    if (p.state === 'flex') {
      ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 1
      for (const [cx, cy, r] of [[-6, -30, 6], [5, -22, 7], [-4, -11, 5], [7, -8, 4]]) {
        ctx.beginPath(); ctx.arc(x + cx, y + cy, r, 0, Math.PI * 2); ctx.stroke()
      }
    } else if (p.state === 'hard') {
      ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1
      for (let i = 0; i < 6; i++) {
        ctx.beginPath(); ctx.moveTo(x - 14 + i * 6, y - 4); ctx.lineTo(x - 6 + i * 6, y - 36); ctx.stroke()
      }
    }
    ctx.restore()
    drawEyes(ctx, x + 3, y - 28)

    // 頭上アイコン
    if (p.state !== 'normal') {
      const label = p.state === 'flex' ? '🔥しなる' : '💧かたい'
      ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      const tw = ctx.measureText(label).width + 12
      ctx.fillStyle = 'rgba(0,0,0,0.6)'
      rrect(ctx, x - tw / 2, y - h - 30, tw, 20, 10); ctx.fill()
      ctx.fillStyle = base
      ctx.fillText(label, x, y - h - 20)
    }
  }
  ctx.restore()
  ctx.globalAlpha = 1
}

// ── 熱処理のゲート・看板 ─────────────────────────────────────────────────────────────
export function drawMatItem(ctx: CanvasRenderingContext2D, it: Item, frame: number) {
  const x = it.x, y = it.y
  ctx.save()
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  if (it.effect === 'sign_flex' || it.effect === 'sign_hard') {
    // 看板：「同じ色を通れ」。色と絵で次の課題を予告する
    const flex = it.effect === 'sign_flex'
    const c = flex ? MAT_FLEX_COLOR : MAT_HARD_COLOR
    ctx.fillStyle = '#5a4a3a'; ctx.fillRect(x - 3, y, 6, DEFAULT_GROUND_Y - y)
    ctx.fillStyle = 'rgba(10,0,25,0.88)'; ctx.strokeStyle = c; ctx.lineWidth = 3
    rrect(ctx, x - 46, y - 58, 92, 58, 8); ctx.fill(); ctx.stroke()
    // 上段：ゲートの記号 ＋ 次の課題の絵
    ctx.font = '18px sans-serif'
    ctx.fillText(flex ? '🔥' : '💧', x - 20, y - 38)
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 14px sans-serif'
    ctx.fillText('→', x + 1, y - 38)
    if (flex) {
      ctx.strokeStyle = '#ffd34d'; ctx.lineWidth = 4; ctx.lineCap = 'round'
      ctx.beginPath(); ctx.moveTo(x + 13, y - 28); ctx.quadraticCurveTo(x + 21, y - 58, x + 29, y - 28); ctx.stroke()
    } else {
      ctx.fillStyle = '#c04ad8'
      ctx.beginPath(); ctx.moveTo(x + 21, y - 52); ctx.lineTo(x + 30, y - 38); ctx.lineTo(x + 21, y - 24); ctx.lineTo(x + 12, y - 38); ctx.closePath(); ctx.fill()
    }
    // 下段：ルール
    ctx.font = 'bold 12px sans-serif'; ctx.fillStyle = c
    ctx.fillText(flex ? 'ぶつかってOK' : 'くだける', x, y - 12)
  } else if (it.effect === 'furnace') {
    // 🔥炉ゲート：炎の輪。ジャンプで通過すると焼なまし（しなる）
    const flick = Math.sin(frame * 0.3) * 3
    ctx.shadowColor = MAT_FLEX_COLOR; ctx.shadowBlur = 18
    ctx.strokeStyle = MAT_FLEX_COLOR; ctx.lineWidth = 6
    ctx.beginPath(); ctx.ellipse(x, y, 22, 28 + flick, 0, 0, Math.PI * 2); ctx.stroke()
    ctx.strokeStyle = '#ffd34d'; ctx.lineWidth = 2
    ctx.beginPath(); ctx.ellipse(x, y, 15, 21 + flick, 0, 0, Math.PI * 2); ctx.stroke()
    ctx.shadowBlur = 0
    ctx.font = '20px sans-serif'; ctx.fillText('🔥', x, y - 40)
  } else if (it.effect === 'quench') {
    // 💧水槽：地上。走って通過すると焼入れ（かたい）
    const w = 84
    ctx.fillStyle = 'rgba(80,190,255,0.35)'; ctx.strokeStyle = MAT_HARD_COLOR; ctx.lineWidth = 2
    rrect(ctx, x - w / 2, y - 12, w, 22, 4); ctx.fill(); ctx.stroke()
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1.5
    ctx.beginPath()
    for (let i = 0; i <= w; i += 6) {
      const wy = y - 10 + Math.sin(frame * 0.2 + i * 0.3) * 2
      if (i === 0) ctx.moveTo(x - w / 2 + i, wy); else ctx.lineTo(x - w / 2 + i, wy)
    }
    ctx.stroke()
    ctx.font = '18px sans-serif'; ctx.fillText('💧', x, y - 30)
  }
  ctx.restore()
}

// ── 材料工学科の障害物 ─────────────────────────────────────────────────────────────
// 金色のU字の板バネ：「しなる」状態なら当たってよい。bend で曲がる。
export function dLeafSpring(ctx: CanvasRenderingContext2D, o: Obstacle, _theme: Theme, frame: number) {
  const sway = Math.sin(frame * 0.12) * 3
  const bend = o.bend ?? 0
  const cx = o.x + o.w / 2
  ctx.shadowColor = '#ffd34d'; ctx.shadowBlur = 10
  ctx.strokeStyle = '#ffd34d'; ctx.lineWidth = 7; ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(o.x + 4, o.y + o.h)
  ctx.quadraticCurveTo(cx + sway - bend * 26, o.y - o.h * 0.2, o.x + o.w - 4, o.y + o.h)
  ctx.stroke()
  ctx.shadowBlur = 0
  ctx.strokeStyle = '#fff6c0'; ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(o.x + 6, o.y + o.h - 4)
  ctx.quadraticCurveTo(cx + sway - bend * 26, o.y, o.x + o.w - 6, o.y + o.h - 4)
  ctx.stroke()
  if (!o.spent) {
    ctx.fillStyle = '#4dff7a'; ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText('◎', cx, o.y - 14 + Math.sin(frame * 0.15) * 2)
  }
}

// トゲのある赤紫の結晶壁：「かたい」状態なら砕ける。二段ジャンプでも越えられる高さ。
export function dBrittleCrystal(ctx: CanvasRenderingContext2D, o: Obstacle, _theme: Theme, frame: number) {
  const { x, y, w, h } = o
  ctx.shadowColor = '#e04aff'; ctx.shadowBlur = 8
  ctx.fillStyle = '#7a1f8f'; ctx.strokeStyle = '#ff7aff'; ctx.lineWidth = 2
  const n = 4, segH = h / n
  for (let i = 0; i < n; i++) {
    const sy = y + i * segH
    ctx.beginPath()
    ctx.moveTo(x + w / 2, sy)
    ctx.lineTo(x + w + 6, sy + segH * 0.5)
    ctx.lineTo(x + w / 2, sy + segH)
    ctx.lineTo(x - 6, sy + segH * 0.5)
    ctx.closePath(); ctx.fill(); ctx.stroke()
  }
  ctx.shadowBlur = 0
  // ひび（もろさの表現）
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(x + 8, y + 10); ctx.lineTo(x + 18, y + 40); ctx.lineTo(x + 10, y + 70); ctx.lineTo(x + 22, y + 110); ctx.stroke()
  if (!o.spent) {
    ctx.fillStyle = '#ff5a5a'; ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText('✕', x + w / 2, y - 12 + Math.sin(frame * 0.15) * 2)
  }
}

// 圧延ローラー：上ロール（当たり判定あり）と、地面に埋まった下ロール（飾り）
export function dRoller(ctx: CanvasRenderingContext2D, o: Obstacle, _theme: Theme, frame: number) {
  const { x, y, w, h } = o
  const cx = x + w / 2, r = w / 2
  const rot = frame * 0.15
  ctx.shadowBlur = 0
  // 支柱
  ctx.fillStyle = '#3a3f4a'
  ctx.fillRect(cx - 3, 42, 6, Math.max(0, y + h / 2 - 42))
  // 上ロール
  const g = ctx.createLinearGradient(x, 0, x + w, 0)
  g.addColorStop(0, '#5d6573'); g.addColorStop(0.5, '#e6ebf2'); g.addColorStop(1, '#5d6573')
  ctx.fillStyle = g; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2
  rrect(ctx, x, y, w, h, r); ctx.fill(); ctx.stroke()
  ctx.strokeStyle = 'rgba(40,40,60,0.5)'; ctx.lineWidth = 2
  for (let i = 0; i < 3; i++) {
    const ly = y + r + ((i * (h - 2 * r) / 3 + rot * 6) % Math.max(1, h - 2 * r))
    ctx.beginPath(); ctx.moveTo(x + 4, ly); ctx.lineTo(x + w - 4, ly); ctx.stroke()
  }
  // 下ロール（地面の中・飾り）
  ctx.fillStyle = g
  ctx.beginPath(); ctx.arc(cx, DEFAULT_GROUND_Y + r + 4, r, Math.PI, Math.PI * 2); ctx.fill()
}

// ── HUD：工程の進み具合とカットイン ─────────────────────────────────────────────────
export function drawMatHud(ctx: CanvasRenderingContext2D, theme: Theme, phase: MatPhase, slow: boolean) {
  const gx = 110, gy = 21
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = 'bold 11px sans-serif'
  const idx = MAT_PHASE_ORDER.indexOf(phase)
  MAT_PHASE_ORDER.forEach((ph, i) => {
    const x = gx + i * 46
    const on = i === idx, done = i < idx
    ctx.fillStyle = on ? theme.groundLineColor : done ? theme.groundLineColor + '55' : 'rgba(255,255,255,0.1)'
    rrect(ctx, x - 20, gy - 8, 40, 16, 8); ctx.fill()
    ctx.fillStyle = on ? '#14002a' : '#cccccc'
    ctx.fillText(PHASE_LABEL[ph], x, gy)
    if (i < MAT_PHASE_ORDER.length - 1) {
      ctx.fillStyle = '#777'; ctx.fillText('›', x + 23, gy)
    }
  })
  if (slow) {
    ctx.fillStyle = '#ff9a9a'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center'
    ctx.fillText('結晶を迂回… スロー', PLAYER_X, 58)
  }
}

export function drawMatCutin(ctx: CanvasRenderingContext2D, theme: Theme, phase: MatPhase, timer: number, total: number) {
  const t = 1 - timer / total
  const alpha = t < 0.15 ? t / 0.15 : t > 0.8 ? (1 - t) / 0.2 : 1
  ctx.save()
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha))
  ctx.fillStyle = 'rgba(10,0,30,0.7)'
  ctx.fillRect(0, CANVAS_H / 2 - 38, CANVAS_W, 70)
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillStyle = theme.groundLineColor; ctx.shadowColor = theme.groundLineColor; ctx.shadowBlur = 12
  ctx.font = 'bold 30px sans-serif'
  ctx.fillText(PHASE_CUTIN[phase][0], CANVAS_W / 2, CANVAS_H / 2 - 14)
  ctx.shadowBlur = 0
  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 15px sans-serif'
  ctx.fillText(PHASE_CUTIN[phase][1], CANVAS_W / 2, CANVAS_H / 2 + 17)
  ctx.restore()
}
