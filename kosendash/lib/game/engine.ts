import { AREAS, AREA_DISTANCE, type AreaId } from './areas'
import { playJump, playCoin, playGameOver, playAreaChange } from './sound'
import type { GameResult } from '@/lib/types'

const GROUND_Y = 220
const GRAVITY = 0.65
const JUMP_VY = -13.5
const CANVAS_W = 800
const CANVAS_H = 280
const PLAYER_X = 110

interface Obstacle {
  x: number
  y: number
  w: number
  h: number
  type: 'low' | 'high'
  shape: 'box' | 'gear' | 'tube' | 'crystal' | 'bug'
}

interface Coin {
  x: number
  y: number
  collected: boolean
  wobble: number
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  color: string
  size: number
}

interface BgDecoration {
  x: number
  y: number
  size: number
  areaId: AreaId
  type: string
  alpha: number
}

type PlayerState = 'running' | 'jumping' | 'sliding' | 'dead'

export class GameEngine {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private raf = 0
  private onGameOver: (r: GameResult) => void

  private playerY = GROUND_Y
  private playerVY = 0
  private playerState: PlayerState = 'running'
  private jumpCount = 0
  private slideTimer = 0
  private legPhase = 0

  private score = 0
  private distance = 0
  private speed = 5
  private currentArea: AreaId = 1
  private areaProgress = 0
  private prevArea: AreaId = 1
  private areaTransitionAlpha = 0

  private obstacles: Obstacle[] = []
  private coins: Coin[] = []
  private particles: Particle[] = []
  private bgDecorations: BgDecoration[] = []

  private nextObstacleIn = 80
  private nextCoinIn = 50
  private frameCount = 0
  private isOver = false
  private deathTimer = 0

  private noMissInArea = true
  private areaEntryScore = 0

  constructor(canvas: HTMLCanvasElement, onGameOver: (r: GameResult) => void) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
    canvas.width = CANVAS_W
    canvas.height = CANVAS_H
    this.onGameOver = onGameOver
    this.initBgDecorations()
  }

  private initBgDecorations() {
    for (let i = 0; i < 12; i++) {
      const area = ((i % 5) + 1) as AreaId
      const theme = AREAS[area]
      this.bgDecorations.push({
        x: Math.random() * CANVAS_W,
        y: 40 + Math.random() * 130,
        size: 8 + Math.random() * 20,
        areaId: area,
        type: theme.decorations[Math.floor(Math.random() * theme.decorations.length)],
        alpha: 0.08 + Math.random() * 0.12,
      })
    }
  }

  jump() {
    if (this.isOver) return
    if (this.playerState === 'sliding') {
      this.playerState = 'running'
      this.slideTimer = 0
      return
    }
    if (this.jumpCount < 2) {
      this.playerVY = JUMP_VY * (this.jumpCount === 1 ? 0.85 : 1)
      this.playerState = 'jumping'
      this.jumpCount++
      playJump()
      this.spawnParticles(PLAYER_X, this.playerY, '#ffffff', 4)
    }
  }

  slide() {
    if (this.isOver) return
    if (this.playerState !== 'jumping') {
      this.playerState = 'sliding'
      this.slideTimer = 55
    }
  }

  start() {
    this.raf = requestAnimationFrame(() => this.loop())
  }

  destroy() {
    cancelAnimationFrame(this.raf)
  }

  private loop() {
    this.update()
    this.render()
    if (!this.isOver || this.deathTimer < 40) {
      this.raf = requestAnimationFrame(() => this.loop())
    }
  }

  private update() {
    this.frameCount++

    if (this.isOver) {
      this.deathTimer++
      this.playerVY += GRAVITY
      this.playerY = Math.min(this.playerY + this.playerVY, GROUND_Y)
      return
    }

    // Speed ramp: every 500m +0.4
    this.speed = Math.min(5 + Math.floor(this.distance / 500) * 0.4, 14)

    // Player physics
    if (this.playerState !== 'sliding') {
      this.playerVY += GRAVITY
      this.playerY += this.playerVY
    }
    if (this.playerY >= GROUND_Y) {
      this.playerY = GROUND_Y
      this.playerVY = 0
      this.jumpCount = 0
      if (this.playerState === 'jumping') this.playerState = 'running'
    }

    if (this.playerState === 'sliding') {
      this.slideTimer--
      if (this.slideTimer <= 0) this.playerState = 'running'
    }

    if (this.playerState === 'running') this.legPhase += 0.25

    // Distance & score
    this.distance += this.speed
    this.score += Math.ceil(this.speed / 8)

    // Area progression
    this.areaProgress += this.speed
    if (this.areaProgress >= AREA_DISTANCE) {
      this.areaProgress = 0
      this.prevArea = this.currentArea
      this.currentArea = ((this.currentArea % 5) + 1) as AreaId
      this.areaTransitionAlpha = 1
      if (this.noMissInArea) {
        this.score += 50
        this.spawnParticles(PLAYER_X, this.playerY - 30, AREAS[this.prevArea].coinColor, 8)
      }
      this.noMissInArea = true
      this.areaEntryScore = this.score
      playAreaChange()
    }
    if (this.areaTransitionAlpha > 0) this.areaTransitionAlpha -= 0.025

    // Spawn obstacles
    this.nextObstacleIn--
    if (this.nextObstacleIn <= 0) {
      this.spawnObstacle()
      const minGap = Math.max(35, 100 - this.speed * 4)
      this.nextObstacleIn = minGap + Math.random() * 60
    }

    // Spawn coins
    this.nextCoinIn--
    if (this.nextCoinIn <= 0) {
      this.spawnCoin()
      this.nextCoinIn = 28 + Math.random() * 35
    }

    // Move obstacles
    this.obstacles = this.obstacles.filter(o => {
      o.x -= this.speed
      return o.x > -80
    })

    // Move coins & wobble
    this.coins = this.coins.filter(c => {
      c.x -= this.speed
      c.wobble += 0.08
      return c.x > -20
    })

    // Move decorations
    for (const d of this.bgDecorations) {
      d.x -= this.speed * 0.2
      if (d.x < -60) {
        d.x = CANVAS_W + 40
        d.y = 40 + Math.random() * 130
        d.areaId = this.currentArea
        const theme = AREAS[this.currentArea]
        d.type = theme.decorations[Math.floor(Math.random() * theme.decorations.length)]
      }
    }

    // Move particles
    this.particles = this.particles.filter(p => {
      p.x += p.vx
      p.y += p.vy
      p.vy += 0.15
      p.life--
      return p.life > 0
    })

    // Collision: obstacles
    const ph = this.getPlayerHitbox()
    for (const o of this.obstacles) {
      if (this.overlaps(ph, { x: o.x + 4, y: o.y + 4, w: o.w - 8, h: o.h - 8 })) {
        this.triggerDeath()
        return
      }
    }

    // Collision: coins
    for (const c of this.coins) {
      if (!c.collected && this.overlapsCircle(ph, c.x, c.y, 10)) {
        c.collected = true
        this.score += 10
        playCoin()
        this.spawnParticles(c.x, c.y, AREAS[this.currentArea].coinColor, 5)
      }
    }
  }

  private getPlayerHitbox() {
    const sliding = this.playerState === 'sliding'
    return sliding
      ? { x: PLAYER_X - 14, y: GROUND_Y - 22, w: 28, h: 22 }
      : { x: PLAYER_X - 12, y: this.playerY - 46, w: 24, h: 46 }
  }

  private overlaps(a: {x:number,y:number,w:number,h:number}, b: {x:number,y:number,w:number,h:number}) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
  }

  private overlapsCircle(box: {x:number,y:number,w:number,h:number}, cx: number, cy: number, r: number) {
    const nearX = Math.max(box.x, Math.min(cx, box.x + box.w))
    const nearY = Math.max(box.y, Math.min(cy, box.y + box.h))
    return (nearX - cx) ** 2 + (nearY - cy) ** 2 < r * r
  }

  private spawnObstacle() {
    const theme = AREAS[this.currentArea]
    // Progressive difficulty: more high obstacles as distance grows
    const highChance = 0.35 + Math.min(this.distance / 8000, 0.25)
    const isHigh = Math.random() < highChance

    const shapes: Obstacle['shape'][] = ['box', 'gear', 'tube', 'crystal', 'bug']
    const shape = shapes[this.currentArea - 1]

    if (isHigh) {
      const h = 55 + Math.random() * 25
      this.obstacles.push({ x: CANVAS_W + 10, y: GROUND_Y - h - 55, w: 35, h, type: 'high', shape })
    } else {
      const h = 38 + Math.random() * 28
      this.obstacles.push({ x: CANVAS_W + 10, y: GROUND_Y - h, w: 30 + Math.random() * 20, h, type: 'low', shape })
    }
  }

  private spawnCoin() {
    const y = GROUND_Y - 55 - Math.random() * 50
    this.coins.push({ x: CANVAS_W + 20, y, collected: false, wobble: Math.random() * Math.PI * 2 })
  }

  private spawnParticles(x: number, y: number, color: string, count: number) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 1 + Math.random() * 3
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        life: 20 + Math.random() * 20,
        maxLife: 40,
        color,
        size: 2 + Math.random() * 3,
      })
    }
  }

  private triggerDeath() {
    this.isOver = true
    this.playerState = 'dead'
    this.playerVY = -8
    this.noMissInArea = false
    playGameOver()
    this.spawnParticles(PLAYER_X, this.playerY - 20, '#ff4444', 12)
    setTimeout(() => {
      this.onGameOver({
        score: this.score,
        distance: Math.floor(this.distance),
        maxArea: this.currentArea,
      })
    }, 900)
  }

  // ─── RENDER ────────────────────────────────────────────────────────────────

  private render() {
    const ctx = this.ctx
    const theme = AREAS[this.currentArea]

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H)
    grad.addColorStop(0, theme.bgTop)
    grad.addColorStop(1, theme.bgBottom)
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

    // Blend previous area during transition
    if (this.areaTransitionAlpha > 0 && this.prevArea !== this.currentArea) {
      const prev = AREAS[this.prevArea]
      const pg = ctx.createLinearGradient(0, 0, 0, CANVAS_H)
      pg.addColorStop(0, prev.bgTop)
      pg.addColorStop(1, prev.bgBottom)
      ctx.globalAlpha = this.areaTransitionAlpha
      ctx.fillStyle = pg
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
      ctx.globalAlpha = 1
    }

    // Background decorations
    for (const d of this.bgDecorations) {
      ctx.globalAlpha = d.alpha
      this.drawDecoration(ctx, d.x, d.y, d.size, d.type, AREAS[d.areaId].obstacleColor)
      ctx.globalAlpha = 1
    }

    // Ground
    ctx.fillStyle = theme.groundColor
    ctx.fillRect(0, GROUND_Y + 4, CANVAS_W, CANVAS_H - GROUND_Y - 4)

    // Ground line (animated dashes)
    ctx.strokeStyle = theme.groundLineColor
    ctx.lineWidth = 2
    ctx.setLineDash([30, 15])
    ctx.lineDashOffset = -(this.frameCount * this.speed * 0.5) % 45
    ctx.beginPath()
    ctx.moveTo(0, GROUND_Y + 4)
    ctx.lineTo(CANVAS_W, GROUND_Y + 4)
    ctx.stroke()
    ctx.setLineDash([])

    // Coins
    for (const c of this.coins) {
      if (!c.collected) this.drawCoin(ctx, c, theme.coinColor)
    }

    // Obstacles
    for (const o of this.obstacles) {
      this.drawObstacle(ctx, o, theme)
    }

    // Particles
    for (const p of this.particles) {
      ctx.globalAlpha = p.life / p.maxLife
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1
    }

    // Player
    this.drawPlayer(ctx, theme.coinColor)

    // HUD
    this.drawHUD(ctx, theme)
  }

  private drawHUD(ctx: CanvasRenderingContext2D, theme: typeof AREAS[AreaId]) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)'
    ctx.fillRect(0, 0, CANVAS_W, 38)

    ctx.font = 'bold 17px monospace'
    ctx.textBaseline = 'middle'

    ctx.fillStyle = '#FFD700'
    ctx.textAlign = 'left'
    ctx.fillText(`SCORE  ${this.score.toLocaleString()}`, 10, 19)

    ctx.fillStyle = theme.groundLineColor
    ctx.textAlign = 'center'
    ctx.fillText(`${theme.emoji} ${theme.name}`, CANVAS_W / 2, 19)

    ctx.fillStyle = '#aaaaaa'
    ctx.textAlign = 'right'
    ctx.fillText(`${Math.floor(this.distance)} m`, CANVAS_W - 10, 19)

    // Area progress bar
    const barW = 120
    const barX = (CANVAS_W - barW) / 2
    ctx.fillStyle = 'rgba(255,255,255,0.1)'
    ctx.fillRect(barX, 30, barW, 4)
    ctx.fillStyle = theme.groundLineColor
    ctx.fillRect(barX, 30, barW * (this.areaProgress / AREA_DISTANCE), 4)

    // Area transition flash
    if (this.areaTransitionAlpha > 0) {
      ctx.globalAlpha = this.areaTransitionAlpha * 0.3
      ctx.fillStyle = theme.groundLineColor
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
      ctx.globalAlpha = 1

      ctx.globalAlpha = this.areaTransitionAlpha
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 24px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(`${theme.emoji} ${theme.name}`, CANVAS_W / 2, CANVAS_H / 2)
      ctx.globalAlpha = 1
    }
  }

  private drawPlayer(ctx: CanvasRenderingContext2D, accentColor: string) {
    const x = PLAYER_X
    const y = this.playerY
    const sliding = this.playerState === 'sliding'
    const dead = this.playerState === 'dead'

    ctx.save()
    if (dead) {
      ctx.translate(x, y - 23)
      ctx.rotate(Math.min(this.deathTimer * 0.08, Math.PI / 2))
      ctx.translate(-x, -(y - 23))
    }

    if (sliding) {
      // Crouched body
      ctx.fillStyle = '#4488ff'
      this.roundRect(ctx, x - 18, GROUND_Y - 22, 36, 22, 4)
      ctx.fill()
      ctx.strokeStyle = '#88bbff'
      ctx.lineWidth = 2
      this.roundRect(ctx, x - 18, GROUND_Y - 22, 36, 22, 4)
      ctx.stroke()
      // Eyes
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(x + 4, GROUND_Y - 18, 8, 8)
      ctx.fillStyle = '#001133'
      ctx.fillRect(x + 6, GROUND_Y - 16, 4, 4)
    } else {
      const baseY = y

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.3)'
      ctx.beginPath()
      ctx.ellipse(x, GROUND_Y + 3, 14, 4, 0, 0, Math.PI * 2)
      ctx.fill()

      // Legs (animated)
      const lp = this.playerState === 'jumping' ? 0 : this.legPhase
      ctx.strokeStyle = '#2255aa'
      ctx.lineWidth = 5
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(x - 4, baseY - 12)
      ctx.lineTo(x - 6 + Math.sin(lp) * 9, baseY + 2)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(x + 4, baseY - 12)
      ctx.lineTo(x + 6 - Math.sin(lp) * 9, baseY + 2)
      ctx.stroke()

      // Body
      ctx.fillStyle = '#3366dd'
      this.roundRect(ctx, x - 13, baseY - 40, 26, 28, 5)
      ctx.fill()
      ctx.strokeStyle = '#6699ff'
      ctx.lineWidth = 2
      this.roundRect(ctx, x - 13, baseY - 40, 26, 28, 5)
      ctx.stroke()

      // Chest accent
      ctx.fillStyle = accentColor
      ctx.globalAlpha = 0.6
      this.roundRect(ctx, x - 6, baseY - 35, 12, 8, 3)
      ctx.fill()
      ctx.globalAlpha = 1

      // Arms
      ctx.strokeStyle = '#3366dd'
      ctx.lineWidth = 4
      ctx.lineCap = 'round'
      if (this.playerState === 'jumping') {
        ctx.beginPath(); ctx.moveTo(x - 13, baseY - 33); ctx.lineTo(x - 22, baseY - 20); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(x + 13, baseY - 33); ctx.lineTo(x + 22, baseY - 20); ctx.stroke()
      } else {
        const ap = this.legPhase
        ctx.beginPath(); ctx.moveTo(x - 13, baseY - 33); ctx.lineTo(x - 20, baseY - 33 + Math.sin(ap) * 7); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(x + 13, baseY - 33); ctx.lineTo(x + 20, baseY - 33 - Math.sin(ap) * 7); ctx.stroke()
      }

      // Head
      ctx.fillStyle = '#4488ff'
      ctx.beginPath()
      ctx.arc(x, baseY - 50, 12, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#88bbff'
      ctx.lineWidth = 2
      ctx.stroke()

      // Eyes
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(x - 8, baseY - 56, 6, 7)
      ctx.fillRect(x + 2, baseY - 56, 6, 7)
      ctx.fillStyle = '#001133'
      ctx.fillRect(x - 6, baseY - 54, 3, 4)
      ctx.fillRect(x + 4, baseY - 54, 3, 4)
    }

    ctx.restore()
  }

  private drawObstacle(ctx: CanvasRenderingContext2D, o: Obstacle, theme: typeof AREAS[AreaId]) {
    ctx.fillStyle = theme.obstacleColor
    ctx.strokeStyle = theme.obstacleStroke
    ctx.lineWidth = 2

    switch (o.shape) {
      case 'gear': {
        // Draw gear-like box with notches
        ctx.fillRect(o.x, o.y, o.w, o.h)
        ctx.strokeRect(o.x, o.y, o.w, o.h)
        // Teeth on top
        const toothW = 6, toothH = 5
        for (let tx = o.x + 3; tx < o.x + o.w - 3; tx += toothW * 2) {
          ctx.fillRect(tx, o.y - toothH, toothW, toothH)
        }
        // Circle detail
        ctx.beginPath()
        ctx.arc(o.x + o.w / 2, o.y + o.h / 2, o.w / 4, 0, Math.PI * 2)
        ctx.strokeStyle = theme.obstacleStroke
        ctx.stroke()
        break
      }
      case 'tube': {
        // Test tube / column shape
        this.roundRect(ctx, o.x, o.y, o.w, o.h, 8)
        ctx.fill()
        this.roundRect(ctx, o.x, o.y, o.w, o.h, 8)
        ctx.stroke()
        // Liquid inside
        ctx.fillStyle = theme.obstacleStroke
        ctx.globalAlpha = 0.3
        this.roundRect(ctx, o.x + 4, o.y + o.h * 0.5, o.w - 8, o.h * 0.45, 4)
        ctx.fill()
        ctx.globalAlpha = 1
        break
      }
      case 'crystal': {
        // Crystal / diamond shape
        const cx = o.x + o.w / 2
        const tip = o.y
        ctx.beginPath()
        ctx.moveTo(cx, tip)
        ctx.lineTo(o.x + o.w, o.y + o.h * 0.4)
        ctx.lineTo(o.x + o.w * 0.8, o.y + o.h)
        ctx.lineTo(o.x + o.w * 0.2, o.y + o.h)
        ctx.lineTo(o.x, o.y + o.h * 0.4)
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
        break
      }
      case 'bug': {
        // Bug / box with "antenna"
        ctx.fillRect(o.x, o.y, o.w, o.h)
        ctx.strokeRect(o.x, o.y, o.w, o.h)
        // Antenna
        ctx.beginPath()
        ctx.moveTo(o.x + o.w * 0.35, o.y)
        ctx.lineTo(o.x + o.w * 0.35, o.y - 10)
        ctx.moveTo(o.x + o.w * 0.65, o.y)
        ctx.lineTo(o.x + o.w * 0.65, o.y - 10)
        ctx.stroke()
        // Error cross
        ctx.strokeStyle = '#ff4444'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(o.x + 6, o.y + 6)
        ctx.lineTo(o.x + o.w - 6, o.y + o.h - 6)
        ctx.moveTo(o.x + o.w - 6, o.y + 6)
        ctx.lineTo(o.x + 6, o.y + o.h - 6)
        ctx.stroke()
        break
      }
      default: {
        // box
        this.roundRect(ctx, o.x, o.y, o.w, o.h, 3)
        ctx.fill()
        this.roundRect(ctx, o.x, o.y, o.w, o.h, 3)
        ctx.stroke()
      }
    }

    // Glow on obstacle stroke
    ctx.shadowColor = theme.obstacleStroke
    ctx.shadowBlur = 6
    ctx.strokeRect(o.x, o.y, o.w, o.h)
    ctx.shadowBlur = 0
  }

  private drawCoin(ctx: CanvasRenderingContext2D, coin: Coin, color: string) {
    const cy = coin.y + Math.sin(coin.wobble) * 3
    ctx.fillStyle = color
    ctx.shadowColor = color
    ctx.shadowBlur = 8
    ctx.beginPath()
    ctx.arc(coin.x, cy, 8, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0
    ctx.strokeStyle = '#ffffff66'
    ctx.lineWidth = 1.5
    ctx.stroke()
    // Shine
    ctx.fillStyle = '#ffffff44'
    ctx.beginPath()
    ctx.arc(coin.x - 2, cy - 2, 3, 0, Math.PI * 2)
    ctx.fill()
  }

  private drawDecoration(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, type: string, color: string) {
    ctx.strokeStyle = color
    ctx.fillStyle = color
    ctx.lineWidth = 1.5

    switch (type) {
      case 'gear':
        ctx.beginPath()
        ctx.arc(x, y, size / 2, 0, Math.PI * 2)
        ctx.stroke()
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2
          ctx.beginPath()
          ctx.moveTo(x + Math.cos(a) * size * 0.5, y + Math.sin(a) * size * 0.5)
          ctx.lineTo(x + Math.cos(a) * size * 0.75, y + Math.sin(a) * size * 0.75)
          ctx.stroke()
        }
        break
      case 'spark':
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2
          ctx.beginPath()
          ctx.moveTo(x, y)
          ctx.lineTo(x + Math.cos(a) * size, y + Math.sin(a) * size)
          ctx.stroke()
        }
        break
      case 'bit':
        ctx.font = `${size * 0.7}px monospace`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(Math.random() > 0.5 ? '1' : '0', x, y)
        break
      case 'dna':
        for (let i = 0; i < 3; i++) {
          const offset = (i / 3) * size
          ctx.beginPath()
          ctx.arc(x - size * 0.3 + Math.sin(i) * size * 0.3, y - size + offset, 3, 0, Math.PI * 2)
          ctx.fill()
        }
        break
      case 'crystal':
        ctx.beginPath()
        ctx.moveTo(x, y - size)
        ctx.lineTo(x + size * 0.5, y)
        ctx.lineTo(x, y + size * 0.5)
        ctx.lineTo(x - size * 0.5, y)
        ctx.closePath()
        ctx.stroke()
        break
      default:
        ctx.beginPath()
        ctx.arc(x, y, size / 3, 0, Math.PI * 2)
        ctx.stroke()
    }
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + w - r, y)
    ctx.quadraticCurveTo(x + w, y, x + w, y + r)
    ctx.lineTo(x + w, y + h - r)
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
    ctx.lineTo(x + r, y + h)
    ctx.quadraticCurveTo(x, y + h, x, y + h - r)
    ctx.lineTo(x, y + r)
    ctx.quadraticCurveTo(x, y, x + r, y)
    ctx.closePath()
  }
}
