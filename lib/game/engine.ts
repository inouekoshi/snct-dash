import { AREAS, type AreaId } from './areas'
import { playJump, playCoin, playGameOver, playAreaChange, playHurt, playShieldGet } from './sound'
import type { GameResult } from '@/lib/types'
import { GROUND_Y, CANVAS_W, CANVAS_H, PLAYER_X, GRAVITY, JUMP_VY, AREA_DURATION, AREA_SPEEDS, SPAWN_GAPS } from './constants'
import type { PlayerState, Obstacle, Coin, ShieldDrop, Particle } from './engine-types'

// ── Engine ────────────────────────────────────────────────────────────────────
export class GameEngine {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private raf = 0
  private onGameOver: (r: GameResult) => void

  // Player
  private py = GROUND_Y       // y position (bottom of player)
  private pvy = 0             // vertical velocity
  private pState: PlayerState = 'running'
  private jumpCount = 0
  private slideTimer = 0
  private legPhase = 0
  private shield = true       // 2-hit protection
  private invincible = 0      // frames of invincibility after hit

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
  private deathTimer = 0
  private bgX = 0             // parallax scroll offset

  // Objects
  private obstacles: Obstacle[] = []
  private coins: Coin[] = []
  private shieldDrops: ShieldDrop[] = []
  private particles: Particle[] = []

  // Timers
  private nextObs = 120
  private nextCoin = 60
  private nextShield = 1000 + Math.random() * 600

  constructor(canvas: HTMLCanvasElement, onGameOver: (r: GameResult) => void) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
    canvas.width = CANVAS_W
    canvas.height = CANVAS_H
    this.onGameOver = onGameOver
  }

  jump() {
    if (this.isOver) return
    if (this.pState === 'sliding') { this.pState = 'running'; this.slideTimer = 0; return }
    if (this.jumpCount < 2) {
      this.pvy = this.jumpCount === 1 ? JUMP_VY * 0.82 : JUMP_VY
      this.pState = 'jumping'
      this.jumpCount++
      playJump()
      this.burst(PLAYER_X, this.py, '#ffffff', 4)
    }
  }

  slide() {
    if (this.isOver || this.pState === 'jumping') return
    this.pState = 'sliding'; this.slideTimer = 55
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

    this.speed = AREA_SPEEDS[this.area]

    // Player physics
    if (this.pState !== 'sliding') { this.pvy += GRAVITY; this.py += this.pvy }
    if (this.py >= GROUND_Y) {
      this.py = GROUND_Y; this.pvy = 0; this.jumpCount = 0
      if (this.pState === 'jumping') this.pState = 'running'
    }
    if (this.pState === 'sliding' && --this.slideTimer <= 0) this.pState = 'running'
    if (this.pState === 'running') this.legPhase += 0.25
    if (this.invincible > 0) this.invincible--

    this.distance += this.speed
    this.score += Math.ceil(this.speed / 8)
    this.bgX -= this.speed * 0.25

    // Area progression (time-based: 40 seconds per area)
    if (++this.areaTimer >= AREA_DURATION) this.nextArea()

    // Spawn
    if (--this.nextObs <= 0)  { this.spawnObstacle(); const [mn, r] = SPAWN_GAPS[this.area]; this.nextObs = mn + Math.random() * r }
    if (--this.nextCoin <= 0) { this.spawnCoin(); this.nextCoin = 30 + Math.random() * 35 }
    if (--this.nextShield <= 0) { this.shieldDrops.push({ x: CANVAS_W + 20, y: GROUND_Y - 75, wobble: 0 }); this.nextShield = 1100 + Math.random() * 700 }

    // Move
    const spd = this.speed
    this.obstacles  = this.obstacles.filter(o  => { o.x -= spd; if (o.moving) o.y = o.baseY - Math.abs(Math.sin(o.phase += 0.045)) * o.amplitude; return o.x > -100 })
    this.coins      = this.coins.filter(c      => { c.x -= spd; c.wobble += 0.08; return c.x > -20 })
    this.shieldDrops = this.shieldDrops.filter(s => { s.x -= spd; s.wobble += 0.05; return s.x > -20 })
    this.particles  = this.particles.filter(p  => { p.x += p.vx; p.y += p.vy; p.vy += 0.15; return --p.life > 0 })

    // Collisions
    const ph = this.hitbox()
    if (this.invincible === 0) {
      for (const o of this.obstacles) {
        if (this.overlaps(ph, { x: o.x + 4, y: o.y + 4, w: o.w - 8, h: o.h - 8 })) { this.hit(); return }
      }
    }
    for (const c of this.coins) {
      if (!c.collected && this.hitCircle(ph, c.x, c.y, 10)) { c.collected = true; this.score += 10; playCoin(); this.burst(c.x, c.y, AREAS[this.area].coinColor, 4) }
    }
    for (let i = this.shieldDrops.length - 1; i >= 0; i--) {
      const s = this.shieldDrops[i]
      if (this.hitCircle(ph, s.x, s.y, 14)) {
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
    this.area = ((this.area % 5) + 1) as AreaId
    if (this.area > this.maxArea) this.maxArea = this.area
    this.transAlpha = 1
    if (this.noMiss) { this.score += 100; this.burst(PLAYER_X, this.py - 30, AREAS[this.prevArea].coinColor, 12) }
    this.noMiss = true
    this.obstacles = this.obstacles.filter(o => o.x < PLAYER_X - 20)
    playAreaChange()
  }

  private hit() {
    if (this.shield) {
      this.shield = false; this.invincible = 120; this.noMiss = false
      playHurt(); this.burst(PLAYER_X, this.py - 20, '#ff8800', 10)
    } else {
      this.isOver = true; this.pState = 'dead'; this.pvy = -8
      playGameOver(); this.burst(PLAYER_X, this.py - 20, '#ff3333', 14)
      setTimeout(() => this.onGameOver({ score: this.score, distance: Math.floor(this.distance), maxArea: this.maxArea }), 1000)
    }
  }

  // ── Spawn helpers ─────────────────────────────────────────────────────────────
  private mk(o: Pick<Obstacle,'x'|'y'|'w'|'h'|'type'|'shape'> & Partial<Pick<Obstacle,'moving'|'phase'|'baseY'|'amplitude'>>) {
    this.obstacles.push({ moving: false, phase: 0, baseY: o.y, amplitude: 0, ...o })
  }

  private spawnObstacle() {
    const a = this.area
    if (a === 1) this.spawnA1()
    else if (a === 2) this.spawnA2()
    else if (a === 3) this.spawnA3()
    else if (a === 4) this.spawnA4()
    else this.spawnA5()
  }

  // Area 1 機械工学科: simple gears, 80% low / 20% high beam
  private spawnA1() {
    if (Math.random() < 0.2) {
      this.mk({ x: CANVAS_W+10, y: GROUND_Y-90, w: 32, h: 75, type: 'high', shape: 'beam' })
    } else {
      const h = 34 + Math.random() * 22
      this.mk({ x: CANVAS_W+10, y: GROUND_Y-h, w: 28+Math.random()*14, h, type: 'low', shape: 'gear' })
    }
  }

  // Area 2 電気電子工学科: more highs, low+high combos
  private spawnA2() {
    const r = Math.random()
    if (r < 0.38) {
      this.mk({ x: CANVAS_W+10, y: GROUND_Y-118, w: 26, h: 88, type: 'high', shape: 'beam' })
    } else if (r < 0.60) {
      // low then high combo (jump then immediately slide)
      this.mk({ x: CANVAS_W+10, y: GROUND_Y-44, w: 28, h: 44, type: 'low', shape: 'circuit' })
      this.mk({ x: CANVAS_W+90, y: GROUND_Y-112, w: 26, h: 80, type: 'high', shape: 'beam' })
    } else {
      const h = 38 + Math.random() * 22
      this.mk({ x: CANVAS_W+10, y: GROUND_Y-h, w: 30+Math.random()*12, h, type: 'low', shape: 'circuit' })
    }
  }

  // Area 3 電子情報工学科: hopping bug enemies, server racks
  private spawnA3() {
    const r = Math.random()
    if (r < 0.42) {
      // Bug that hops up and down (player must jump when low, slide when high)
      const baseY = GROUND_Y - 32
      this.mk({ x: CANVAS_W+10, y: baseY, w: 30, h: 30, type: 'low', shape: 'bug', moving: true, phase: Math.random()*Math.PI*2, baseY, amplitude: 52 })
    } else if (r < 0.68) {
      this.mk({ x: CANVAS_W+10, y: GROUND_Y-120, w: 28, h: 88, type: 'high', shape: 'server' })
    } else {
      const h = 38 + Math.random() * 22
      this.mk({ x: CANVAS_W+10, y: GROUND_Y-h, w: 32, h, type: 'low', shape: 'bug' })
    }
  }

  // Area 4 生物応用化学科: wide bacteria blobs, clusters, test tubes
  private spawnA4() {
    const r = Math.random()
    if (r < 0.25) {
      this.mk({ x: CANVAS_W+10, y: GROUND_Y-120, w: 26, h: 90, type: 'high', shape: 'tube' })
    } else if (r < 0.48) {
      // Bacteria cluster 2-3
      const n = Math.random() < 0.5 ? 2 : 3
      for (let i = 0; i < n; i++) {
        const h = 35 + Math.random() * 18
        this.mk({ x: CANVAS_W+10+i*42, y: GROUND_Y-h, w: 24+Math.random()*10, h, type: 'low', shape: 'bacteria' })
      }
    } else if (r < 0.72) {
      // Wide blob
      const h = 48 + Math.random() * 24
      this.mk({ x: CANVAS_W+10, y: GROUND_Y-h, w: 50+Math.random()*16, h, type: 'low', shape: 'bacteria' })
    } else {
      // Combo blob + tube
      this.mk({ x: CANVAS_W+10, y: GROUND_Y-46, w: 32, h: 46, type: 'low', shape: 'bacteria' })
      this.mk({ x: CANVAS_W+92, y: GROUND_Y-115, w: 25, h: 85, type: 'high', shape: 'tube' })
    }
  }

  // Area 5 材料工学科: crystal spikes, stalactites, dense combos
  private spawnA5() {
    const r = Math.random()
    if (r < 0.22) {
      const h = 55 + Math.random() * 32
      this.mk({ x: CANVAS_W+10, y: GROUND_Y-h, w: 26+Math.random()*10, h, type: 'low', shape: 'crystal' })
    } else if (r < 0.42) {
      this.mk({ x: CANVAS_W+10, y: GROUND_Y-130, w: 24, h: 100, type: 'high', shape: 'crystal' })
    } else if (r < 0.60) {
      const h1 = 50+Math.random()*22, h2 = 42+Math.random()*22
      this.mk({ x: CANVAS_W+10, y: GROUND_Y-h1, w: 24, h: h1, type: 'low', shape: 'crystal' })
      this.mk({ x: CANVAS_W+58, y: GROUND_Y-h2, w: 22, h: h2, type: 'low', shape: 'crystal' })
    } else if (r < 0.78) {
      this.mk({ x: CANVAS_W+10, y: GROUND_Y-52, w: 26, h: 52, type: 'low', shape: 'crystal' })
      this.mk({ x: CANVAS_W+82, y: GROUND_Y-125, w: 24, h: 95, type: 'high', shape: 'crystal' })
    } else {
      for (let i = 0; i < 3; i++) {
        const h = 40 + Math.random() * 28 * (i+1)/3
        this.mk({ x: CANVAS_W+10+i*36, y: GROUND_Y-h, w: 20, h, type: 'low', shape: 'crystal' })
      }
    }
  }

  private spawnCoin() {
    this.coins.push({ x: CANVAS_W+20, y: GROUND_Y-55-Math.random()*50, collected: false, wobble: Math.random()*Math.PI*2 })
  }

  private burst(x: number, y: number, color: string, n: number) {
    for (let i = 0; i < n; i++) {
      const a = Math.random()*Math.PI*2, s = 1.5+Math.random()*3.5
      this.particles.push({ x, y, vx: Math.cos(a)*s, vy: Math.sin(a)*s-2, life: 20+Math.random()*20, maxLife: 40, color, size: 2+Math.random()*3 })
    }
  }

  // ── Collision ─────────────────────────────────────────────────────────────────
  private hitbox() {
    return this.pState === 'sliding'
      ? { x: PLAYER_X-14, y: GROUND_Y-22, w: 28, h: 22 }
      : { x: PLAYER_X-12, y: this.py-46,  w: 24, h: 46 }
  }

  private overlaps(a: {x:number;y:number;w:number;h:number}, b: {x:number;y:number;w:number;h:number}) {
    return a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y
  }

  private hitCircle(box: {x:number;y:number;w:number;h:number}, cx: number, cy: number, r: number) {
    const nx = Math.max(box.x, Math.min(cx, box.x+box.w))
    const ny = Math.max(box.y, Math.min(cy, box.y+box.h))
    return (nx-cx)**2 + (ny-cy)**2 < r*r
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  private render() {
    const ctx = this.ctx
    const theme = AREAS[this.area]

    this.drawBg(ctx, theme)
    this.drawGround(ctx, theme)

    for (const s of this.shieldDrops) this.drawShieldDrop(ctx, s)
    for (const c of this.coins) if (!c.collected) this.drawCoin(ctx, c, theme.coinColor)
    for (const o of this.obstacles) this.drawObstacle(ctx, o, theme)

    for (const p of this.particles) {
      ctx.globalAlpha = p.life / p.maxLife
      ctx.fillStyle = p.color
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill()
    }
    ctx.globalAlpha = 1

    this.drawPlayer(ctx, theme.coinColor)
    this.drawHUD(ctx, theme)

    if (this.transAlpha > 0) {
      this.drawTransition(ctx, theme)
      this.transAlpha -= 0.02
    }
  }

  // ── Background per area ────────────────────────────────────────────────────────
  private drawBg(ctx: CanvasRenderingContext2D, theme: typeof AREAS[AreaId]) {
    const g = ctx.createLinearGradient(0, 0, 0, CANVAS_H)
    g.addColorStop(0, theme.bgTop); g.addColorStop(1, theme.bgBottom)
    ctx.fillStyle = g; ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

    ctx.save()
    switch (this.area) {
      case 1: this.bgMech(ctx, theme); break
      case 2: this.bgElec(ctx, theme); break
      case 3: this.bgCode(ctx, theme); break
      case 4: this.bgBio(ctx, theme);  break
      case 5: this.bgMat(ctx, theme);  break
    }
    ctx.restore()
  }

  private bgMech(ctx: CanvasRenderingContext2D, theme: typeof AREAS[AreaId]) {
    ctx.strokeStyle = theme.groundLineColor; ctx.lineWidth = 2
    for (let gx = (this.bgX * 0.15 % 220) - 220; gx < CANVAS_W + 220; gx += 220) {
      for (let i = 0; i < 2; i++) {
        const gy = 70 + i * 115, r = 40 + i * 15
        const rot = this.frame * 0.004 * (i % 2 ? -1 : 1)
        ctx.globalAlpha = 0.07
        ctx.beginPath(); ctx.arc(gx + i*100, gy, r, 0, Math.PI*2); ctx.stroke()
        for (let t = 0; t < 12; t++) {
          const a = rot + t/12*Math.PI*2
          ctx.beginPath()
          ctx.moveTo(gx+i*100+Math.cos(a)*r, gy+Math.sin(a)*r)
          ctx.lineTo(gx+i*100+Math.cos(a)*(r+9), gy+Math.sin(a)*(r+9))
          ctx.stroke()
        }
      }
    }
    ctx.globalAlpha = 1
  }

  private bgElec(ctx: CanvasRenderingContext2D, theme: typeof AREAS[AreaId]) {
    ctx.strokeStyle = theme.groundLineColor; ctx.lineWidth = 1
    const gs = 32, ox = this.bgX % gs
    ctx.globalAlpha = 0.08
    for (let x = ox; x < CANVAS_W; x += gs) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,GROUND_Y); ctx.stroke() }
    for (let y = 30; y < GROUND_Y; y += gs) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(CANVAS_W,y); ctx.stroke() }
    ctx.fillStyle = theme.groundLineColor
    ctx.globalAlpha = 0.18
    for (let x = ox; x < CANVAS_W; x += gs) {
      for (let y = 30; y < GROUND_Y; y += gs) {
        if (Math.abs(Math.sin(x*0.31 + y*0.67)) > 0.84) { ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI*2); ctx.fill() }
      }
    }
    ctx.globalAlpha = 1
  }

  private bgCode(ctx: CanvasRenderingContext2D, theme: typeof AREAS[AreaId]) {
    ctx.fillStyle = theme.groundLineColor
    ctx.font = '10px monospace'; ctx.textAlign = 'center'
    for (let col = 0; col < CANVAS_W; col += 22) {
      const drop = ((this.frame * 0.5 + col * 3.7) % 80)
      ctx.globalAlpha = Math.max(0, 0.18 - drop * 0.003)
      const bit = Math.floor(Math.sin(col * 13.7 + drop) * 100) % 2 === 0 ? '1' : '0'
      ctx.fillText(bit, col, drop + 10)
      ctx.globalAlpha = Math.max(0, 0.10 - drop * 0.002)
      ctx.fillText(bit === '1' ? '0' : '1', col, drop + 24)
    }
    ctx.globalAlpha = 1
  }

  private bgBio(ctx: CanvasRenderingContext2D, theme: typeof AREAS[AreaId]) {
    ctx.strokeStyle = theme.groundLineColor; ctx.lineWidth = 1.5
    for (let i = 0; i < 8; i++) {
      const bx = ((this.frame * 0.4 + i*137) % (CANVAS_W+60)) - 30
      const by = GROUND_Y - 25 - ((this.frame * 0.8 + i*47) % (GROUND_Y - 60))
      const br = 8 + (i % 3) * 7
      ctx.globalAlpha = 0.09
      ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI*2); ctx.stroke()
      ctx.fillStyle = theme.groundLineColor; ctx.globalAlpha = 0.04
      ctx.beginPath(); ctx.arc(bx - br*0.3, by - br*0.3, br*0.25, 0, Math.PI*2); ctx.fill()
    }
    ctx.globalAlpha = 1
  }

  private bgMat(ctx: CanvasRenderingContext2D, theme: typeof AREAS[AreaId]) {
    ctx.strokeStyle = theme.groundLineColor; ctx.lineWidth = 1
    const s = 40, ox = this.bgX % (s*2)
    ctx.globalAlpha = 0.07
    for (let x = ox; x < CANVAS_W+s; x += s) {
      for (let y = 20; y < GROUND_Y; y += s) {
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(x+s, y+s*0.5)
        ctx.lineTo(x, y+s)
        ctx.lineTo(x-s, y+s*0.5)
        ctx.closePath(); ctx.stroke()
      }
    }
    const lv = ctx.createLinearGradient(0, GROUND_Y-20, 0, GROUND_Y)
    lv.addColorStop(0, 'transparent'); lv.addColorStop(1, theme.groundLineColor+'44')
    ctx.globalAlpha = 0.6; ctx.fillStyle = lv; ctx.fillRect(0, GROUND_Y-20, CANVAS_W, 20)
    ctx.globalAlpha = 1
  }

  private drawGround(ctx: CanvasRenderingContext2D, theme: typeof AREAS[AreaId]) {
    ctx.fillStyle = theme.groundColor
    ctx.fillRect(0, GROUND_Y+3, CANVAS_W, CANVAS_H-GROUND_Y-3)
    ctx.strokeStyle = theme.groundLineColor; ctx.lineWidth = 2
    ctx.shadowColor = theme.groundLineColor; ctx.shadowBlur = 5
    ctx.setLineDash([28, 14])
    ctx.lineDashOffset = -(this.frame * this.speed * 0.4) % 42
    ctx.beginPath(); ctx.moveTo(0, GROUND_Y+3); ctx.lineTo(CANVAS_W, GROUND_Y+3); ctx.stroke()
    ctx.setLineDash([]); ctx.shadowBlur = 0
  }

  private drawHUD(ctx: CanvasRenderingContext2D, theme: typeof AREAS[AreaId]) {
    ctx.fillStyle = 'rgba(0,0,0,0.62)'; ctx.fillRect(0, 0, CANVAS_W, 42)

    ctx.font = 'bold 16px monospace'; ctx.textBaseline = 'middle'
    ctx.fillStyle = '#FFD700'; ctx.textAlign = 'left'
    ctx.fillText(`SCORE  ${this.score.toLocaleString()}`, 10, 18)

    ctx.fillStyle = theme.groundLineColor; ctx.textAlign = 'center'
    ctx.fillText(`${theme.emoji} ${theme.name}`, CANVAS_W/2, 14)

    ctx.fillStyle = '#aaaaaa'; ctx.textAlign = 'right'
    ctx.fillText(`${Math.floor(this.distance)} m`, CANVAS_W-10, 18)

    // Shield icon
    ctx.textAlign = 'left'; ctx.font = '14px sans-serif'
    ctx.fillText(this.shield ? '🛡' : '💔', CANVAS_W-42, 33)

    // Area progress bar
    const bw = 140, bx = (CANVAS_W-bw)/2, by = 30
    ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fillRect(bx, by, bw, 5)
    ctx.fillStyle = theme.groundLineColor
    ctx.shadowColor = theme.groundLineColor; ctx.shadowBlur = 4
    ctx.fillRect(bx, by, bw * (this.areaTimer / AREA_DURATION), 5)
    ctx.shadowBlur = 0

    // Invincibility flash overlay
    if (this.invincible > 0 && Math.floor(this.invincible/6) % 2 === 0) {
      ctx.globalAlpha = 0.22; ctx.fillStyle = '#ff8800'; ctx.fillRect(0, 0, CANVAS_W, CANVAS_H); ctx.globalAlpha = 1
    }
  }

  private drawTransition(ctx: CanvasRenderingContext2D, theme: typeof AREAS[AreaId]) {
    ctx.globalAlpha = this.transAlpha * 0.28; ctx.fillStyle = theme.groundLineColor; ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
    ctx.globalAlpha = Math.min(this.transAlpha * 2, 1)
    ctx.fillStyle = '#fff'; ctx.font = 'bold 26px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(`${theme.emoji}  ${theme.name}`, CANVAS_W/2, CANVAS_H/2)
    ctx.globalAlpha = 1
  }

  // ── Player ────────────────────────────────────────────────────────────────────
  private drawPlayer(ctx: CanvasRenderingContext2D, accent: string) {
    const x = PLAYER_X, y = this.py
    const sliding = this.pState === 'sliding'
    const blink = this.invincible > 0 && Math.floor(this.invincible/4) % 2 === 1

    if (blink) ctx.globalAlpha = 0.35

    ctx.save()
    if (this.pState === 'dead' && this.deathTimer > 0) {
      ctx.translate(x, y-23); ctx.rotate(Math.min(this.deathTimer*0.08, Math.PI*0.55)); ctx.translate(-x, -(y-23))
    }

    if (sliding) {
      ctx.fillStyle = '#3366dd'
      this.rrect(ctx, x-20, GROUND_Y-22, 40, 22, 5); ctx.fill()
      ctx.strokeStyle = '#6699ff'; ctx.lineWidth = 2
      this.rrect(ctx, x-20, GROUND_Y-22, 40, 22, 5); ctx.stroke()
      ctx.fillStyle = '#88aaff33'; this.rrect(ctx, x+2, GROUND_Y-19, 14, 10, 3); ctx.fill()
    } else {
      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.22)'
      ctx.beginPath(); ctx.ellipse(x, GROUND_Y+3, 13, 4, 0, 0, Math.PI*2); ctx.fill()

      // Legs
      const lp = this.pState === 'jumping' ? 0 : this.legPhase
      ctx.strokeStyle = '#2255bb'; ctx.lineWidth = 5; ctx.lineCap = 'round'
      ctx.beginPath(); ctx.moveTo(x-5,y-12); ctx.lineTo(x-7+Math.sin(lp)*10, y+2); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(x+5,y-12); ctx.lineTo(x+7-Math.sin(lp)*10, y+2); ctx.stroke()

      // Body
      ctx.fillStyle = '#3366dd'
      this.rrect(ctx, x-13, y-40, 26, 28, 5); ctx.fill()
      ctx.strokeStyle = '#6699ff'; ctx.lineWidth = 2
      this.rrect(ctx, x-13, y-40, 26, 28, 5); ctx.stroke()

      // Chest patch
      ctx.fillStyle = accent; ctx.globalAlpha = blink ? 0.25 : 0.65
      this.rrect(ctx, x-6, y-36, 12, 8, 3); ctx.fill()
      ctx.globalAlpha = blink ? 0.35 : 1

      // Arms
      ctx.strokeStyle = '#3366dd'; ctx.lineWidth = 4; ctx.lineCap = 'round'
      const ap = this.legPhase
      ctx.beginPath(); ctx.moveTo(x-13,y-33); ctx.lineTo(x-21, y-33+Math.sin(ap)*7); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(x+13,y-33); ctx.lineTo(x+21, y-33-Math.sin(ap)*7); ctx.stroke()

      // Head
      ctx.fillStyle = '#4488ff'
      ctx.beginPath(); ctx.arc(x, y-50, 12, 0, Math.PI*2); ctx.fill()
      ctx.strokeStyle = '#88bbff'; ctx.lineWidth = 2; ctx.stroke()

      // Eyes
      ctx.fillStyle = '#fff'; ctx.fillRect(x-9, y-57, 6, 8); ctx.fillRect(x+3, y-57, 6, 8)
      ctx.fillStyle = '#001133'; ctx.fillRect(x-7, y-55, 3, 5); ctx.fillRect(x+5, y-55, 3, 5)

      // Shield aura
      if (this.shield) {
        ctx.strokeStyle = '#00ffff'; ctx.lineWidth = 1.5
        ctx.globalAlpha = 0.35 + Math.sin(this.frame*0.1)*0.1
        ctx.beginPath(); ctx.ellipse(x, y-25, 20, 33, 0, 0, Math.PI*2); ctx.stroke()
        ctx.globalAlpha = blink ? 0.35 : 1
      }
    }

    ctx.restore()
    ctx.globalAlpha = 1
  }

  // ── Obstacle drawers ──────────────────────────────────────────────────────────
  private drawObstacle(ctx: CanvasRenderingContext2D, o: Obstacle, theme: typeof AREAS[AreaId]) {
    ctx.save()
    ctx.fillStyle = theme.obstacleColor; ctx.strokeStyle = theme.obstacleStroke; ctx.lineWidth = 2
    ctx.shadowColor = theme.obstacleStroke; ctx.shadowBlur = 6

    if      (o.shape === 'gear')     this.dGear(ctx, o, theme)
    else if (o.shape === 'beam')     this.dBeam(ctx, o, theme)
    else if (o.shape === 'circuit')  this.dCircuit(ctx, o, theme)
    else if (o.shape === 'bug')      this.dBug(ctx, o)
    else if (o.shape === 'server')   this.dServer(ctx, o, theme)
    else if (o.shape === 'bacteria') this.dBacteria(ctx, o, theme)
    else if (o.shape === 'tube')     this.dTube(ctx, o, theme)
    else if (o.shape === 'crystal')  this.dCrystal(ctx, o)

    ctx.restore()
  }

  private dGear(ctx: CanvasRenderingContext2D, o: Obstacle, theme: typeof AREAS[AreaId]) {
    this.rrect(ctx, o.x, o.y, o.w, o.h, 3); ctx.fill()
    this.rrect(ctx, o.x, o.y, o.w, o.h, 3); ctx.stroke()
    for (let tx = o.x+3; tx < o.x+o.w-3; tx += 10) { ctx.fillRect(tx, o.y-6, 5, 6) }
    ctx.beginPath(); ctx.arc(o.x+o.w/2, o.y+o.h/2, o.w/4, 0, Math.PI*2); ctx.strokeStyle = theme.obstacleStroke; ctx.stroke()
  }

  private dBeam(ctx: CanvasRenderingContext2D, o: Obstacle, theme: typeof AREAS[AreaId]) {
    ctx.fillRect(o.x, 0, o.w, o.y+o.h); ctx.strokeRect(o.x, 0, o.w, o.y+o.h)
    ctx.strokeStyle = theme.obstacleStroke+'55'; ctx.lineWidth = 1.5
    for (let sy = 5; sy < o.y+o.h; sy += 12) { ctx.beginPath(); ctx.moveTo(o.x,sy); ctx.lineTo(o.x+o.w,sy); ctx.stroke() }
    const bx = o.x+o.w/2, by = o.y+o.h+4
    ctx.strokeStyle = theme.obstacleStroke; ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(bx+4,by); ctx.lineTo(bx-2,by+7); ctx.lineTo(bx+3,by+7); ctx.lineTo(bx-4,by+14); ctx.stroke()
  }

  private dCircuit(ctx: CanvasRenderingContext2D, o: Obstacle, theme: typeof AREAS[AreaId]) {
    this.rrect(ctx, o.x, o.y, o.w, o.h, 3); ctx.fill()
    this.rrect(ctx, o.x, o.y, o.w, o.h, 3); ctx.stroke()
    ctx.strokeStyle = theme.obstacleStroke+'66'; ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(o.x+4, o.y+o.h*0.3); ctx.lineTo(o.x+o.w*0.5, o.y+o.h*0.3)
    ctx.lineTo(o.x+o.w*0.5, o.y+o.h*0.7); ctx.lineTo(o.x+o.w-4, o.y+o.h*0.7)
    ctx.stroke()
    ctx.fillStyle = theme.obstacleStroke; ctx.globalAlpha = 0.8
    ;[[o.x+4, o.y+o.h*0.3],[o.x+o.w-4, o.y+o.h*0.7]].forEach(([nx,ny]) => { ctx.beginPath(); ctx.arc(nx,ny,3,0,Math.PI*2); ctx.fill() })
    ctx.globalAlpha = 1
  }

  private dBug(ctx: CanvasRenderingContext2D, o: Obstacle) {
    ctx.beginPath(); ctx.ellipse(o.x+o.w/2, o.y+o.h/2, o.w/2, o.h/2, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke()
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(o.x+o.w*0.35, o.y); ctx.lineTo(o.x+o.w*0.25, o.y-10)
    ctx.moveTo(o.x+o.w*0.65, o.y); ctx.lineTo(o.x+o.w*0.75, o.y-10); ctx.stroke()
    ctx.strokeStyle = '#ff4444'; ctx.lineWidth = 2
    const ex = o.x+o.w*0.35, ey = o.y+o.h*0.38, es = 5
    ctx.beginPath(); ctx.moveTo(ex-es,ey-es); ctx.lineTo(ex+es,ey+es); ctx.moveTo(ex+es,ey-es); ctx.lineTo(ex-es,ey+es); ctx.stroke()
    const ex2 = o.x+o.w*0.65
    ctx.beginPath(); ctx.moveTo(ex2-es,ey-es); ctx.lineTo(ex2+es,ey+es); ctx.moveTo(ex2+es,ey-es); ctx.lineTo(ex2-es,ey+es); ctx.stroke()
  }

  private dServer(ctx: CanvasRenderingContext2D, o: Obstacle, theme: typeof AREAS[AreaId]) {
    ctx.fillRect(o.x, 0, o.w, o.y+o.h); ctx.strokeRect(o.x, 0, o.w, o.y+o.h)
    ctx.strokeStyle = theme.obstacleStroke+'44'; ctx.lineWidth = 1
    for (let sy = 8; sy < o.y+o.h; sy += 16) {
      ctx.strokeRect(o.x+2, sy, o.w-4, 12)
      ctx.fillStyle = Math.floor(this.frame/15)%2 ? '#00ff00' : '#005500'
      ctx.beginPath(); ctx.arc(o.x+6, sy+6, 2, 0, Math.PI*2); ctx.fill()
      ctx.fillStyle = theme.obstacleColor
    }
    ctx.strokeStyle = theme.obstacleStroke; ctx.lineWidth = 2; ctx.strokeRect(o.x, 0, o.w, o.y+o.h)
  }

  private dBacteria(ctx: CanvasRenderingContext2D, o: Obstacle, theme: typeof AREAS[AreaId]) {
    const cx = o.x+o.w/2, cy = o.y+o.h/2, rx = o.w/2, ry = o.h/2
    const wb = Math.sin(this.frame*0.08)*2.5
    ctx.beginPath(); ctx.ellipse(cx, cy, rx+wb*0.5, ry-wb*0.5, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke()
    ctx.strokeStyle = theme.obstacleStroke+'88'; ctx.lineWidth = 1.5
    for (let i = 0; i < 4; i++) {
      const a = i/4*Math.PI*2 + this.frame*0.03
      ctx.beginPath(); ctx.moveTo(cx+Math.cos(a)*rx, cy+Math.sin(a)*ry); ctx.lineTo(cx+Math.cos(a)*(rx+10), cy+Math.sin(a)*(ry+10)); ctx.stroke()
    }
  }

  private dTube(ctx: CanvasRenderingContext2D, o: Obstacle, theme: typeof AREAS[AreaId]) {
    ctx.fillRect(o.x, 0, o.w, o.y+o.h*0.7)
    ctx.beginPath(); ctx.rect(o.x, o.y+o.h*0.5, o.w, o.h*0.4); ctx.arc(o.x+o.w/2, o.y+o.h, o.w/2, 0, Math.PI); ctx.fill()
    ctx.strokeStyle = theme.obstacleStroke; ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(o.x,0); ctx.lineTo(o.x,o.y+o.h); ctx.arc(o.x+o.w/2,o.y+o.h,o.w/2,Math.PI,0); ctx.lineTo(o.x+o.w,0); ctx.stroke()
    ctx.fillStyle = theme.groundLineColor+'55'
    ctx.fillRect(o.x+3, o.y+o.h*0.28, o.w-6, o.h*0.55)
    ctx.fillStyle = theme.groundLineColor+'33'
    for (let i=0;i<3;i++) { const by=o.y+o.h*0.5+Math.sin(this.frame*0.08+i)*9; ctx.beginPath(); ctx.arc(o.x+5+i*(o.w-10)/3, by, 3, 0, Math.PI*2); ctx.fill() }
  }

  private dCrystal(ctx: CanvasRenderingContext2D, o: Obstacle) {
    const cx = o.x+o.w/2
    ctx.beginPath()
    if (o.type === 'high') {
      ctx.fillRect(o.x, 0, o.w, o.y+8)
      ctx.moveTo(o.x, o.y); ctx.lineTo(o.x+o.w, o.y); ctx.lineTo(cx+o.w*0.14, o.y+o.h); ctx.lineTo(cx, o.y+o.h+10); ctx.lineTo(cx-o.w*0.14, o.y+o.h); ctx.closePath()
    } else {
      ctx.moveTo(cx, o.y); ctx.lineTo(cx+o.w*0.18, o.y+o.h*0.38); ctx.lineTo(o.x+o.w, o.y+o.h); ctx.lineTo(o.x, o.y+o.h); ctx.lineTo(cx-o.w*0.18, o.y+o.h*0.38); ctx.closePath()
    }
    ctx.fill(); ctx.stroke()
    ctx.lineWidth = 1; ctx.globalAlpha = 0.5
    ctx.beginPath(); ctx.moveTo(cx, o.y); ctx.lineTo(cx+o.w*0.08, o.y+o.h*0.55); ctx.stroke()
    ctx.globalAlpha = 1
  }

  private drawCoin(ctx: CanvasRenderingContext2D, c: Coin, color: string) {
    const cy = c.y + Math.sin(c.wobble)*4
    ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 10
    ctx.beginPath(); ctx.arc(c.x, cy, 9, 0, Math.PI*2); ctx.fill()
    ctx.shadowBlur = 0; ctx.strokeStyle = '#ffffff66'; ctx.lineWidth = 1.5; ctx.stroke()
    ctx.fillStyle = '#ffffff33'; ctx.beginPath(); ctx.arc(c.x-3, cy-3, 3.5, 0, Math.PI*2); ctx.fill()
  }

  private drawShieldDrop(ctx: CanvasRenderingContext2D, s: ShieldDrop) {
    const x = s.x, y = s.y + Math.sin(s.wobble)*5
    ctx.shadowColor = '#00ffff'; ctx.shadowBlur = 12 + Math.sin(this.frame*0.1)*4
    ctx.strokeStyle = '#00ffff'; ctx.fillStyle = '#00ffff22'; ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(x, y-13); ctx.lineTo(x+11, y-6); ctx.lineTo(x+11, y+4); ctx.lineTo(x, y+13); ctx.lineTo(x-11, y+4); ctx.lineTo(x-11, y-6); ctx.closePath()
    ctx.fill(); ctx.stroke()
    ctx.strokeStyle = '#00ffff'; ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.moveTo(x,y-7); ctx.lineTo(x,y+7); ctx.moveTo(x-5,y); ctx.lineTo(x+5,y); ctx.stroke()
    ctx.shadowBlur = 0
  }

  private rrect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath()
    ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r)
    ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h)
    ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r)
    ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath()
  }
}
