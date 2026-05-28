import type { AreaId } from './areas'
import { AREAS } from './areas'
import { playJump, playKnockback, playClear } from './sound'
import type { GameClearResult } from '@/lib/types'
import {
  DEFAULT_GROUND_Y, CANVAS_W, CANVAS_H, PLAYER_X, GRAVITY, JUMP_VY,
  STAGE_LENGTH, SPEED_START, SPEED_END,
  KNOCKBACK_AMOUNT, HOLE_KNOCKBACK, KNOCKBACK_INVINCIBLE,
  SPAWN_GAPS, COYOTE_FRAMES, JUMP_BUFFER_FRAMES, HIT_STOP_FRAMES,
  STEP_FOLLOW_SPEED, MISS_OVERLAY_FRAMES, REVIVAL_FRAMES,
} from './constants'
import type { PlayerState, Obstacle, TerrainSegment, Item, Particle } from './engine-types'
import { overlaps, playerHitbox } from './helpers'
import { drawObstacle } from './obstacle-drawers'
import { drawBg, drawGround, type BgContext } from './background-renderers'
import { drawPlayer } from './player-renderer'
import { drawGoal } from './goal-renderer'
import { drawHUD, renderPauseOverlay, renderMissOverlay, renderRevivalHint } from './hud-renderer'
import { spawnObstacle, spawnCeilingObstacle } from './spawner'
import { buildStage } from './terrain'

export class GameEngine {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private raf = 0
  private departmentId: number
  private onClear: (result: GameClearResult) => void

  // Player
  private py = DEFAULT_GROUND_Y
  private pvy = 0
  private pState: PlayerState = 'running'
  private jumpCount = 0
  private legPhase = 0
  private invincible = 0
  private coyoteTime = 0
  private jumpBuffer = 0
  private hitStopTimer = 0
  private missOverlayTimer = 0
  private revivalTimer = 0
  private missProgressLost = 0
  private isFallingIntoHole = false

  // Stage progress & timing
  private stageProgress = 0
  private elapsedMs = 0
  private isCleared = false
  private isPaused = false
  private frame = 0

  // Terrain
  private terrain: TerrainSegment[]
  private currentGroundY = DEFAULT_GROUND_Y
  private targetGroundY = DEFAULT_GROUND_Y

  // Objects
  private obstacles: Obstacle[] = []
  private items: Item[] = []
  private particles: Particle[] = []

  // Item effects
  private itemEffect: 'time_stop' | 'invincible' | null = null
  private itemEffectTimer = 0

  // Spawn timers
  private nextObs = 120
  private nextCeilingObs = 300

  // Background scroll
  private bgX = 0

  constructor(
    canvas: HTMLCanvasElement,
    departmentId: number,
    onClear: (result: GameClearResult) => void,
  ) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
    canvas.width = CANVAS_W
    canvas.height = CANVAS_H
    this.departmentId = departmentId
    this.onClear = onClear
    this.terrain = buildStage(departmentId)
  }

  // ── 公開インターフェース ───────────────────────────────────────────────────

  jump() {
    if (this.isCleared || this.isPaused || this.missOverlayTimer > 0) return
    if (this.jumpCount === 0 || (this.coyoteTime > 0 && this.jumpCount === 1)) {
      if (this.coyoteTime > 0 && this.jumpCount === 1) this.jumpCount = 0
      this.performJump()
    } else if (this.jumpCount === 1) {
      this.performJump()
    } else {
      this.jumpBuffer = JUMP_BUFFER_FRAMES
    }
  }

  pause() {
    if (this.isCleared || this.isPaused) return
    this.isPaused = true
    cancelAnimationFrame(this.raf)
    renderPauseOverlay(this.ctx)
  }

  resume() {
    if (!this.isPaused) return
    this.isPaused = false
    this.raf = requestAnimationFrame(() => this.loop())
  }

  togglePause() {
    if (this.isPaused) this.resume()
    else this.pause()
  }

  start() { this.raf = requestAnimationFrame(() => this.loop()) }
  destroy() { cancelAnimationFrame(this.raf) }

  // ── メインループ ──────────────────────────────────────────────────────────

  private loop() {
    this.update()
    this.render()
    if (!this.isCleared) this.raf = requestAnimationFrame(() => this.loop())
  }

  private update() {
    this.frame++

    // ヒットストップ中はタイマー以外を止める
    if (this.hitStopTimer > 0) { this.hitStopTimer--; return }

    // MISS オーバーレイ中は物理を止める（frame は進みアニメ継続）
    if (this.missOverlayTimer > 0) { this.missOverlayTimer--; return }

    // タイマー加算（time_stopアイテム中は止まる）
    if (this.itemEffect !== 'time_stop') {
      this.elapsedMs += 1000 / 60
    }

    // 復活スロー：revivalTimer 中は最低速度に固定
    if (this.revivalTimer > 0) this.revivalTimer--
    const speed = this.effectiveSpeed
    // 穴落下中・段差壁ブロック中はスクロールを停止
    if (!this.isFallingIntoHole && !this.isBlockedByStep()) {
      this.stageProgress += speed
      this.bgX -= speed * 0.25
    }

    // 地形判定
    this.targetGroundY = this.getGroundY()

    // プレイヤー物理
    this.pvy += GRAVITY
    this.py += this.pvy

    if (this.targetGroundY !== Infinity && this.py >= this.targetGroundY) {
      // 着地
      this.py = this.targetGroundY
      this.pvy = 0
      this.jumpCount = 0
      if (this.pState === 'jumping' || this.pState === 'falling') this.pState = 'running'
      this.coyoteTime = COYOTE_FRAMES
      if (this.jumpBuffer > 0) { this.jumpBuffer = 0; this.performJump() }
    } else {
      if (this.coyoteTime > 0) this.coyoteTime--
      if (this.jumpBuffer > 0) this.jumpBuffer--
    }

    // 穴落下判定（2段階）
    // ①: 地面レベルを超えたらフラグセット（スクロール停止、プレイヤーのみ落下継続）
    if (this.targetGroundY === Infinity && this.py > DEFAULT_GROUND_Y + 5 && !this.isFallingIntoHole) {
      this.isFallingIntoHole = true
    }
    // ②: 画面外まで落ちたら MISS 処理
    if (this.isFallingIntoHole && this.py > CANVAS_H + 20) {
      this.isFallingIntoHole = false
      this.knockback(HOLE_KNOCKBACK)
      this.py = this.currentGroundY
      this.pvy = -4
      this.pState = 'jumping'
      this.jumpCount = 1
    }

    // 段差追随
    if (this.targetGroundY !== Infinity) {
      const diff = this.targetGroundY - this.currentGroundY
      this.currentGroundY += Math.sign(diff) * Math.min(Math.abs(diff), STEP_FOLLOW_SPEED)
    }

    if (this.pState === 'running') this.legPhase += 0.25
    if (this.invincible > 0) this.invincible--

    // アイテム効果タイマー
    if (this.itemEffectTimer > 0) {
      this.itemEffectTimer--
      if (this.itemEffectTimer === 0) this.itemEffect = null
    }

    // ゴール直前スパーク
    if (!this.isCleared && STAGE_LENGTH - this.stageProgress <= 60 && this.frame % 4 === 0) {
      const goalTheme = AREAS[this.departmentId as AreaId]
      this.burst(this.toCanvasX(STAGE_LENGTH), 30, goalTheme.groundLineColor, 3)
    }

    // クリア判定
    if (this.stageProgress >= STAGE_LENGTH && !this.isCleared) {
      this.isCleared = true
      this.burst(PLAYER_X, DEFAULT_GROUND_Y - 100, AREAS[this.departmentId as AreaId].groundLineColor, 20)
      cancelAnimationFrame(this.raf)
      this.render() // 最後のフレームを描画
      playClear()
      setTimeout(() => this.onClear({ timeMs: Math.round(this.elapsedMs), departmentId: this.departmentId }), 800)
      return
    }

    // 障害物スポーン
    const CEIL_GROUND_GAP = 90
    if (--this.nextObs <= 0) {
      const nextStageX = this.stageProgress + CANVAS_W
      if (this.hasGroundAt(nextStageX) && this.hasGroundAt(nextStageX + 65) && this.hasGroundAt(nextStageX + 130)) {
        spawnObstacle(this.departmentId, nextStageX, this.obstacles, this.getGroundHeightAt(nextStageX))
      }
      const [mn, r] = SPAWN_GAPS[this.departmentId] ?? SPAWN_GAPS[1]
      this.nextObs = mn + Math.random() * r
      this.nextCeilingObs = Math.max(this.nextCeilingObs, CEIL_GROUND_GAP)
    }
    if (this.departmentId >= 2 && --this.nextCeilingObs <= 0) {
      const nextStageX = this.stageProgress + CANVAS_W
      spawnCeilingObstacle(nextStageX, this.obstacles)
      const base = Math.max(100, 260 - this.departmentId * 25)
      this.nextCeilingObs = base + Math.random() * 100
      this.nextObs = Math.max(this.nextObs, CEIL_GROUND_GAP)
    }

    // オブジェクトのCanvas座標を更新・画面外を除去
    for (const o of this.obstacles) {
      o.x = this.toCanvasX(o.stageX)
      if (o.moving) o.y = o.baseY - Math.abs(Math.sin(o.phase += 0.045)) * o.amplitude
    }
    this.obstacles = this.obstacles.filter(o => o.x > -150)

    for (const it of this.items) it.x = this.toCanvasX(it.stageX)
    this.items = this.items.filter(it => it.x > -20)

    this.particles = this.particles.filter(p => {
      p.x += p.vx; p.y += p.vy; p.vy += 0.15
      return --p.life > 0
    })

    // 衝突判定
    const ph = playerHitbox(this.py)
    if (this.invincible === 0) {
      for (const o of this.obstacles) {
        if (overlaps(ph, { x: o.x + 4, y: o.y + 4, w: o.w - 8, h: o.h - 8 })) {
          this.knockback(KNOCKBACK_AMOUNT)
          return
        }
      }
    }
  }

  // ── 内部メソッド ──────────────────────────────────────────────────────────

  private get currentSpeed(): number {
    const t = Math.min(this.stageProgress / STAGE_LENGTH, 1)
    return SPEED_START + (SPEED_END - SPEED_START) * t
  }

  private get effectiveSpeed(): number {
    return this.revivalTimer > 0 ? SPEED_START : this.currentSpeed
  }

  // stageProgress基準のCanvas X座標変換
  private toCanvasX(stageX: number): number {
    return PLAYER_X + (stageX - this.stageProgress)
  }

  // プレイヤー直下の地面Y（穴ならInfinity）
  private getGroundY(): number {
    for (const seg of this.terrain) {
      const segEnd = seg.stageX + seg.width
      if (seg.stageX <= this.stageProgress && this.stageProgress < segEnd) {
        return seg.type === 'hole' ? Infinity : seg.groundY
      }
    }
    return DEFAULT_GROUND_Y
  }

  private hasGroundAt(stageX: number): boolean {
    for (const seg of this.terrain) {
      if (stageX >= seg.stageX && stageX < seg.stageX + seg.width) {
        return seg.type !== 'hole'
      }
    }
    return true
  }

  private getGroundHeightAt(stageX: number): number {
    for (const seg of this.terrain) {
      if (stageX >= seg.stageX && stageX < seg.stageX + seg.width) {
        return seg.type === 'hole' ? DEFAULT_GROUND_Y : seg.groundY
      }
    }
    return DEFAULT_GROUND_Y
  }

  private isBlockedByStep(): boolean {
    const speed = this.effectiveSpeed
    for (let i = 1; i < this.terrain.length; i++) {
      const prev = this.terrain[i - 1]
      const curr = this.terrain[i]
      if (prev.type !== 'ground' || curr.type !== 'ground') continue
      const stepHeight = prev.groundY - curr.groundY  // 正なら上り段差
      if (stepHeight < 20) continue
      const dist = curr.stageX - this.stageProgress
      if (dist >= 0 && dist <= speed + 3) {
        if (this.py > curr.groundY + 5) return true
      }
    }
    return false
  }

  private knockback(amount: number) {
    this.stageProgress    = Math.max(0, this.stageProgress - amount)
    this.missProgressLost = amount
    this.invincible       = KNOCKBACK_INVINCIBLE
    this.hitStopTimer     = HIT_STOP_FRAMES
    this.missOverlayTimer = MISS_OVERLAY_FRAMES
    this.revivalTimer     = REVIVAL_FRAMES
    playKnockback()
    this.burst(PLAYER_X, this.py - 20, '#ff8800', 10)
  }

  private performJump() {
    this.pvy = this.jumpCount === 1 ? JUMP_VY * 0.82 : JUMP_VY
    this.pState = 'jumping'
    this.jumpCount++
    this.coyoteTime = 0
    playJump()
    this.burst(PLAYER_X, this.py, '#ffffff', 4)
  }

  private burst(x: number, y: number, color: string, n: number) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = 1.5 + Math.random() * 3.5
      this.particles.push({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 2,
        life: 20 + Math.random() * 20, maxLife: 40, color, size: 2 + Math.random() * 3,
      })
    }
  }

  // ── 描画 ─────────────────────────────────────────────────────────────────

  private render() {
    const ctx = this.ctx
    const theme = AREAS[this.departmentId as AreaId]
    const bg: BgContext = { frame: this.frame, bgX: this.bgX, speed: this.missOverlayTimer > 0 ? 0 : this.effectiveSpeed }

    ctx.save()

    drawBg(ctx, this.departmentId as AreaId, theme, bg)
    drawGround(ctx, theme, bg, this.terrain, this.stageProgress)
    drawGoal(ctx, this.departmentId as AreaId, theme, this.stageProgress, this.frame)

    for (const o of this.obstacles) drawObstacle(ctx, o, theme, this.frame)

    for (const p of this.particles) {
      ctx.globalAlpha = p.life / p.maxLife
      ctx.fillStyle = p.color
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill()
    }
    ctx.globalAlpha = 1

    drawPlayer(ctx, theme.coinColor, {
      py: this.py, pState: this.pState, pvy: this.pvy,
      invincible: this.invincible, legPhase: this.legPhase,
      shield: false, deathTimer: 0, frame: this.frame,
    })

    drawHUD(ctx, theme, {
      elapsedMs: this.elapsedMs,
      stageProgress: this.stageProgress,
      invincible: this.invincible,
      departmentId: this.departmentId,
    })

    if (this.missOverlayTimer > 0) {
      renderMissOverlay(ctx, theme, this.missProgressLost, this.missOverlayTimer, MISS_OVERLAY_FRAMES)
    }
    if (this.revivalTimer > 0) {
      renderRevivalHint(ctx, theme, this.revivalTimer, REVIVAL_FRAMES)
    }

    ctx.restore()
  }
}
