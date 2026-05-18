import { AREAS, type AreaId } from './areas'
import { playJump, playCoin, playGameOver, playAreaChange, playHurt, playShieldGet } from './sound'
import type { GameResult } from '@/lib/types'
import { GROUND_Y, CANVAS_W, CANVAS_H, PLAYER_X, GRAVITY, JUMP_VY, AREA_DURATION, AREA_SPEEDS, SPAWN_GAPS, LAP_SPEED_SCALE, LAP_SPAWN_SCALE, MIN_SPAWN_SCALE, MAX_SPEED_SCALE, COYOTE_FRAMES, JUMP_BUFFER_FRAMES, HIT_STOP_FRAMES } from './constants'
import type { PlayerState, Obstacle, Coin, ShieldDrop, Particle } from './engine-types'
import { overlaps, hitCircle, playerHitbox } from './helpers'
import { drawObstacle } from './obstacle-drawers'
import { drawBg, drawGround, type BgContext } from './background-renderers'
import { drawPlayer } from './player-renderer'
import { drawHUD, drawTransition, renderPauseOverlay, drawCoin, drawShieldDrop } from './hud-renderer'
import { spawnObstacle, spawnCeilingObstacle, spawnCoin } from './spawner'

// ── Engine ────────────────────────────────────────────────────────────────────
export class GameEngine {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private raf = 0
  private onGameOver: (r: GameResult) => void

  // Player
  private py = GROUND_Y
  private pvy = 0
  private pState: PlayerState = 'running'
  private jumpCount = 0
  private legPhase = 0
  private shield = true
  private invincible = 0

  // A2: Coyote time + jump buffer
  private coyoteTime = 0
  private jumpBuffer = 0

  // A3: Hit stop + screen shake
  private hitStopTimer = 0
  private shakeTimer = 0
  private shakeIntensity = 0

  // A5: Score multiplier
  private multiplier = 1
  private multiplierJustUp = false

  // A3: Coin combo pitch
  private coinCombo = 0
  private coinComboTimer = 0

  // Game
  private score = 0
  private distance = 0
  private speed = AREA_SPEEDS[1]
  private area: AreaId = 1
  private maxArea: AreaId = 1
  private areaTimer = 0
  private prevArea: AreaId = 1
  private transAlpha = 0
  private noMiss = true
  private frame = 0
  private isOver = false
  private lap = 0
  private isPaused = false
  private deathTimer = 0
  private bgX = 0

  // Objects
  private obstacles: Obstacle[] = []
  private coins: Coin[] = []
  private shieldDrops: ShieldDrop[] = []
  private particles: Particle[] = []

  // Timers
  private nextObs = 120
  private nextCoin = 60
  private nextShield = 1000 + Math.random() * 600
  private nextCeilingObs = 300

  // Speed burst
  private burstTimer = 0
  private burstCooldown = 900

  constructor(canvas: HTMLCanvasElement, onGameOver: (r: GameResult) => void) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
    canvas.width = CANVAS_W
    canvas.height = CANVAS_H
    this.onGameOver = onGameOver
  }

  jump() {
    if (this.isOver || this.isPaused) return
    // Coyote time: treat as first jump if recently grounded
    if (this.jumpCount === 0 || (this.coyoteTime > 0 && this.jumpCount === 1)) {
      if (this.coyoteTime > 0 && this.jumpCount === 1) this.jumpCount = 0
      this.performJump()
    } else if (this.jumpCount === 1) {
      this.performJump()
    } else {
      // Buffer the input for after landing
      this.jumpBuffer = JUMP_BUFFER_FRAMES
    }
  }

  private performJump() {
    this.pvy = this.jumpCount === 1 ? JUMP_VY * 0.82 : JUMP_VY
    this.pState = 'jumping'
    this.jumpCount++
    this.coyoteTime = 0
    playJump()
    this.burst(PLAYER_X, this.py, '#ffffff', 4)
  }

  pause() {
    if (this.isOver || this.isPaused) return
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

  // ── Main Loop ────────────────────────────────────────────────────────────────
  private loop() {
    this.update()
    this.render()
    if (!this.isOver || this.deathTimer < 60) this.raf = requestAnimationFrame(() => this.loop())
  }

  private update() {
    this.frame++
    if (this.isOver) {
      this.deathTimer++
      this.pvy += GRAVITY
      this.py = Math.min(this.py + this.pvy, GROUND_Y)
      return
    }

    // A3: Hit stop — freeze physics briefly after shield hit
    if (this.hitStopTimer > 0) { this.hitStopTimer--; return }

    // Burst phase
    if (this.burstTimer > 0) {
      this.burstTimer--
    } else if (--this.burstCooldown <= 0) {
      this.burstTimer = 150
      this.burstCooldown = 600 + Math.random() * 300
      // A3: Screen shake on RUSH activation
      this.shakeTimer = 20
      this.shakeIntensity = 4
      this.burst(PLAYER_X + 60, GROUND_Y - 60, '#ffee00', 10)
    }
    if (this.shakeTimer > 0) this.shakeTimer--

    const lapScale = Math.min(1 + this.lap * LAP_SPEED_SCALE, MAX_SPEED_SCALE)
    const burstScale = this.burstTimer > 0 ? 1.8 : 1.0
    this.speed = AREA_SPEEDS[this.area] * lapScale * burstScale

    // Player physics
    this.pvy += GRAVITY; this.py += this.pvy
    if (this.py >= GROUND_Y) {
      this.py = GROUND_Y; this.pvy = 0; this.jumpCount = 0
      if (this.pState === 'jumping') this.pState = 'running'
      // A2: Coyote time reset on landing + consume buffered jump
      this.coyoteTime = COYOTE_FRAMES
      if (this.jumpBuffer > 0) { this.jumpBuffer = 0; this.performJump() }
    } else {
      // A2: Tick down coyote time and jump buffer while airborne
      if (this.coyoteTime > 0) this.coyoteTime--
      if (this.jumpBuffer > 0) this.jumpBuffer--
    }
    if (this.pState === 'running') this.legPhase += 0.25
    if (this.invincible > 0) this.invincible--

    // A3: Coin combo decay
    if (this.coinComboTimer > 0) { this.coinComboTimer-- } else { this.coinCombo = 0 }

    this.distance += this.speed
    // A5: Apply score multiplier to distance score
    this.score += Math.ceil(this.speed / 8) * this.multiplier
    this.bgX -= this.speed * 0.25

    // Area progression (time-based: 40 seconds per area)
    if (++this.areaTimer >= AREA_DURATION) this.nextArea()

    // Spawn — ground and ceiling obstacles enforce a minimum separation to prevent
    // unbeatable "jump into ceiling / run into wall" combinations.
    const CEIL_GROUND_GAP = 90 // ~1.5s at 60fps; enough to clear one obstacle before the next
    if (--this.nextObs <= 0) {
      spawnObstacle(this.area, this.obstacles)
      const [mn, r] = SPAWN_GAPS[this.area]
      const spawnScale = Math.max(MIN_SPAWN_SCALE, 1 - this.lap * LAP_SPAWN_SCALE)
      this.nextObs = (mn + Math.random() * r) * spawnScale
      // Keep ceiling obstacles away so the player can safely jump over ground ones
      this.nextCeilingObs = Math.max(this.nextCeilingObs, CEIL_GROUND_GAP)
    }
    if (--this.nextCoin <= 0) { spawnCoin(this.coins); this.nextCoin = 30 + Math.random() * 35 }
    if (--this.nextShield <= 0) { this.shieldDrops.push({ x: CANVAS_W + 20, y: GROUND_Y - 75, wobble: 0 }); this.nextShield = 1100 + Math.random() * 700 }
    if (this.area >= 2 && --this.nextCeilingObs <= 0) {
      spawnCeilingObstacle(this.obstacles)
      const spawnScale = Math.max(MIN_SPAWN_SCALE, 1 - this.lap * LAP_SPAWN_SCALE)
      const base = Math.max(100, 260 - this.area * 25)
      this.nextCeilingObs = (base + Math.random() * 100) * spawnScale
      // Keep ground obstacles away so the player can safely pass under ceiling ones
      this.nextObs = Math.max(this.nextObs, CEIL_GROUND_GAP)
    }

    // Move
    const spd = this.speed
    this.obstacles  = this.obstacles.filter(o  => { o.x -= spd; if (o.moving) o.y = o.baseY - Math.abs(Math.sin(o.phase += 0.045)) * o.amplitude; return o.x > -100 })
    this.coins      = this.coins.filter(c      => { c.x -= spd; c.wobble += 0.08; return c.x > -20 })
    this.shieldDrops = this.shieldDrops.filter(s => { s.x -= spd; s.wobble += 0.05; return s.x > -20 })
    this.particles  = this.particles.filter(p  => { p.x += p.vx; p.y += p.vy; p.vy += 0.15; return --p.life > 0 })

    // Collisions
    const ph = playerHitbox(this.py)
    if (this.invincible === 0) {
      for (const o of this.obstacles) {
        if (overlaps(ph, { x: o.x + 4, y: o.y + 4, w: o.w - 8, h: o.h - 8 })) { this.hit(); return }
      }
    }
    for (const c of this.coins) {
      if (!c.collected && hitCircle(ph, c.x, c.y, 10)) {
        c.collected = true
        // A5: coin score also scaled by multiplier; A3: rising pitch on combo
        this.score += 10 * this.multiplier
        playCoin(this.coinCombo)
        this.coinCombo = Math.min(this.coinCombo + 1, 8)
        this.coinComboTimer = 90
        this.burst(c.x, c.y, AREAS[this.area].coinColor, 4)
      }
    }
    for (let i = this.shieldDrops.length - 1; i >= 0; i--) {
      const s = this.shieldDrops[i]
      if (hitCircle(ph, s.x, s.y, 14)) {
        this.shieldDrops.splice(i, 1)
        if (!this.shield) { this.shield = true; this.burst(s.x, s.y, '#00ffff', 10); playShieldGet() }
        else { this.score += 50; this.burst(s.x, s.y, '#ffff00', 6) }
        break
      }
    }
  }

  private nextArea() {
    this.areaTimer = 0
    this.prevArea = this.area
    if (this.area === 5) this.lap++
    this.area = ((this.area % 5) + 1) as AreaId
    if (this.area > this.maxArea) this.maxArea = this.area
    this.transAlpha = 1
    if (this.noMiss) {
      // A5: multiplier up on no-miss clear
      const prevMult = this.multiplier
      this.multiplier = Math.min(this.multiplier + 1, 3)
      this.multiplierJustUp = this.multiplier > prevMult
      this.score += 100 * this.multiplier
      this.burst(PLAYER_X, this.py - 30, AREAS[this.prevArea].coinColor, 12)
    } else {
      this.multiplierJustUp = false
    }
    this.noMiss = true
    this.obstacles = this.obstacles.filter(o => o.x < PLAYER_X - 20)
    playAreaChange()
  }

  private hit() {
    if (this.shield) {
      this.shield = false; this.invincible = 120; this.noMiss = false
      // A3: Hit stop + A5: multiplier reset on damage
      this.hitStopTimer = HIT_STOP_FRAMES
      this.multiplier = 1; this.multiplierJustUp = false
      playHurt(); this.burst(PLAYER_X, this.py - 20, '#ff8800', 10)
    } else {
      this.isOver = true; this.pState = 'dead'; this.pvy = -8
      playGameOver(); this.burst(PLAYER_X, this.py - 20, '#ff3333', 14)
      setTimeout(() => this.onGameOver({ score: this.score, distance: Math.floor(this.distance), maxArea: this.maxArea, lap: this.lap }), 1000)
    }
  }

  private burst(x: number, y: number, color: string, n: number) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = 1.5 + Math.random() * 3.5
      this.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 2, life: 20 + Math.random() * 20, maxLife: 40, color, size: 2 + Math.random() * 3 })
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  private render() {
    const ctx = this.ctx
    const theme = AREAS[this.area]
    const bg: BgContext = { frame: this.frame, bgX: this.bgX, speed: this.speed }

    // A3: Screen shake
    ctx.save()
    if (this.shakeTimer > 0) {
      const s = this.shakeIntensity * (this.shakeTimer / 20)
      ctx.translate((Math.random() - 0.5) * s * 2, (Math.random() - 0.5) * s)
    }

    drawBg(ctx, this.area, theme, bg)
    drawGround(ctx, theme, bg)

    for (const s of this.shieldDrops) drawShieldDrop(ctx, s, this.frame)
    for (const c of this.coins) if (!c.collected) drawCoin(ctx, c, theme.coinColor)
    for (const o of this.obstacles) drawObstacle(ctx, o, theme, this.frame)

    for (const p of this.particles) {
      ctx.globalAlpha = p.life / p.maxLife
      ctx.fillStyle = p.color
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill()
    }
    ctx.globalAlpha = 1

    // Burst speed lines
    if (this.burstTimer > 0) {
      ctx.save()
      for (let i = 0; i < 10; i++) {
        const ly = 50 + Math.random() * (GROUND_Y - 60)
        const lx = Math.random() * CANVAS_W
        const lw = 30 + Math.random() * 90
        ctx.globalAlpha = 0.08 + Math.random() * 0.1
        ctx.strokeStyle = '#ffee44'; ctx.lineWidth = 1.5
        ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx - lw, ly); ctx.stroke()
      }
      ctx.globalAlpha = 1
      ctx.restore()
    }

    drawPlayer(ctx, theme.coinColor, {
      py: this.py, pState: this.pState, pvy: this.pvy,
      invincible: this.invincible, legPhase: this.legPhase,
      shield: this.shield, deathTimer: this.deathTimer, frame: this.frame
    })

    drawHUD(ctx, theme, {
      score: this.score, distance: this.distance, shield: this.shield,
      lap: this.lap, burstTimer: this.burstTimer,
      areaTimer: this.areaTimer, invincible: this.invincible,
      multiplier: this.multiplier,
    })

    if (this.transAlpha > 0) {
      drawTransition(ctx, theme, this.transAlpha, this.lap, this.multiplier, this.multiplierJustUp)
      this.transAlpha -= 0.016
    } else {
      this.multiplierJustUp = false
    }

    ctx.restore()
  }
}
