import type { AreaId } from './areas'
import { AREAS, bioZone } from './areas'
import { playJump, playKnockback, playClear } from './sound'
import type { GameClearResult } from '@/lib/types'
import {
  DEFAULT_GROUND_Y, CANVAS_W, CANVAS_H, PLAYER_X, GRAVITY, JUMP_VY,
  STAGE_LENGTH, SPEED_START, SPEED_END,
  KNOCKBACK_AMOUNT, HOLE_KNOCKBACK, KNOCKBACK_INVINCIBLE,
  SPAWN_GAPS, COYOTE_FRAMES, JUMP_BUFFER_FRAMES, HIT_STOP_FRAMES,
  STEP_FOLLOW_SPEED, MISS_OVERLAY_FRAMES, REVIVAL_FRAMES,
  CHARGE_MAX, CHARGE_DRAIN, CHARGE_HIT_COST, CHARGE_REVIVE,
  BATTERY_REFILL, BATTERY_GAP,
  COMBO_NEEDED, DEBUG_FRAMES, DEBUG_SPEED_MULT,
  STOMP_BOUNCE, STOMP_MARGIN, mallocSolid,
  SWIM_THRUST, SWIM_DRAG, SWIM_MAX_VY, BIO_WALL_KNOCKBACK, BIO_SPEED_START, BIO_SPEED_END,
  SHIELD_GAP, SHIELD_COLOR,
  FORGE_CUTIN_FRAMES, FORGE_TUTORIAL_SLOW, FORGE_ZONE_CUTIN,
  FORGE_TUTORIAL_HITS, FORGE_COMBO_BONUS_MS,
} from './constants'
import type { PlayerState, Obstacle, TerrainSegment, Item, Particle } from './engine-types'
import { overlaps, playerHitbox, itemHitbox, type Box } from './helpers'
import { drawObstacle } from './obstacle-drawers'
import { drawBattery, drawShieldItem } from './item-renderer'
import { drawBg, drawGround, type BgContext } from './background-renderers'
import { drawPlayer } from './player-renderer'
import { drawGoal } from './goal-renderer'
import { drawHUD, renderPauseOverlay, renderMissOverlay, renderRevivalHint } from './hud-renderer'
import { Spawner } from './spawner'
import { Rng } from './rng'
import {
  drawMatGround, drawMatCutin, drawForgeHammer, drawForgeRings, drawForgeHud, drawForgeResult,
} from './mat-renderers'
import {
  buildStage, getGroundYAt, hasGroundAt, getGroundHeightAt, isFlatAt, isBlockedByStep,
} from './terrain'
import { ForgeSystem } from './forge-system'

// 1ステップ = 1/60秒。描画は requestAnimationFrame ごとだが、ゲームの更新は常にこの刻みで行う
// （120Hz の端末で2倍速になったり、重い端末でスローになったりしないようにする）。
export const STEP_MS = 1000 / 60
const MAX_STEPS_PER_FRAME = 5   // 重い端末で処理落ちしたときに追いつく上限（それ以上は捨てる）
// 描画が重い端末の自動軽量化：フレーム間隔の移動平均がこれを超えた状態が続いたら、光彩（shadowBlur）を切る
const SLOW_FRAME_MS = 22        // 約45fps
const SLOW_FRAMES_TO_DEGRADE = 90
const CLEAR_CALLBACK_DELAY_MS = 800

export interface GameEngineOptions {
  /** 乱数シード（テスト・ボット用。省略時はランダム） */
  seed?: number
  /** true なら効果音とパーティクルを出さない（テスト・ボットの先読み用） */
  silent?: boolean
}

export class GameEngine {
  private canvas: HTMLCanvasElement | null
  private ctx: CanvasRenderingContext2D | null
  private raf = 0
  private lastFrameTime = 0
  private accumulator = 0
  private clearTimer: ReturnType<typeof setTimeout> | null = null
  private departmentId: number
  private onClear: (result: GameClearResult) => void
  private rng: Rng
  private spawner: Spawner
  private silent: boolean
  private beforeStep: (() => void) | null = null
  private avgFrameMs = STEP_MS
  private slowFrames = 0
  private lowQuality = false

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
  private missCount = 0

  // Terrain
  private terrain: TerrainSegment[]
  private currentGroundY = DEFAULT_GROUND_Y
  private targetGroundY = DEFAULT_GROUND_Y

  // Objects
  private obstacles: Obstacle[] = []
  private items: Item[] = []
  private particles: Particle[] = []

  // Spawn timers
  private nextObs = 120
  private nextCeilingObs = 300
  private nextBattery = 90
  private nextBug = 60

  // 充電サバイバル（電気電子工学科 = departmentId 2 のみ稼働）
  private isElec = false
  private charge = CHARGE_MAX

  // デバッグ踏みつけ（電子情報工学科 = departmentId 3 のみ稼働）
  private isCode = false
  private combo = 0
  private debugMode = 0

  // 液体スイム（生物応用化学科 = departmentId 4 のみ稼働）
  private isBio = false
  private thrustHeld = false
  private bioShield = false      // バリア保持中か（1回だけ被弾を無効化）
  private nextShield = 150       // 次のバリアアイテム出現までのframe

  // 鍛えてカン！（材料工学科 = departmentId 5 のみ稼働）
  private isMat = false
  private forge = new ForgeSystem()

  // Background scroll
  private bgX = 0

  /**
   * @param canvas 描画先。null ならロジックだけ動かす（テスト・ボット用）
   */
  constructor(
    canvas: HTMLCanvasElement | null,
    departmentId: number,
    onClear: (result: GameClearResult) => void,
    options: GameEngineOptions = {},
  ) {
    this.canvas = canvas
    this.ctx = canvas?.getContext('2d') ?? null
    if (canvas) {
      canvas.width = CANVAS_W
      canvas.height = CANVAS_H
    }
    this.rng = new Rng(options.seed)
    this.spawner = new Spawner(() => this.rng.next())
    this.silent = options.silent ?? false
    this.departmentId = departmentId
    this.isElec = departmentId === 2
    this.isCode = departmentId === 3
    this.isBio = departmentId === 4
    this.isMat = departmentId === 5
    if (this.isBio) {
      this.py = CANVAS_H / 2
    }
    this.onClear = onClear
    this.terrain = buildStage(departmentId, () => this.rng.next())
  }

  // ── 公開インターフェース ───────────────────────────────────────────────────

  setThrust(active: boolean) {
    // 「離す」(false)は常に反映する。ミス演出/ヒットストップ中に keyup を無視すると
    // thrustHeld が true のまま残り、押していないのに浮上し続けるバグになる。
    // 浮上開始(true)のみポーズ/ミス/クリア中を無視する。
    if (active && (this.isCleared || this.isPaused || this.missOverlayTimer > 0 || this.hitStopTimer > 0)) return
    this.thrustHeld = active
  }

  jump() {
    if (this.isCleared || this.isPaused || this.missOverlayTimer > 0) return
    if (this.isMat) {
      this.forge.strike(this.obstacles, this.effectiveSpeed, this.hitStopTimer > 0, {
        onHitStop: frames => { this.hitStopTimer = frames },
        burst: (x, y, color, count) => this.burst(x, y, color, count),
        playHitSound: () => this.sfx(playJump),
      })
      return
    }
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
    this.thrustHeld = false
    cancelAnimationFrame(this.raf)
    if (this.ctx) renderPauseOverlay(this.ctx)
  }

  resume() {
    if (!this.isPaused) return
    this.isPaused = false
    this.requestFrame()
  }

  togglePause() {
    if (this.isPaused) this.resume()
    else this.pause()
  }

  get paused(): boolean { return this.isPaused }

  start() { this.requestFrame() }

  destroy() {
    cancelAnimationFrame(this.raf)
    if (this.clearTimer) clearTimeout(this.clearTimer)
  }

  // ── テスト・ボット用の読み取り口 ─────────────────────────────────────────────

  /** 毎ステップの直前に呼ぶ関数（E2E テストで自動操縦をつなぐ用） */
  setBeforeStep(fn: (() => void) | null) {
    this.beforeStep = fn
  }

  /** 1ステップ（1/60秒）だけ進める。描画はしない */
  step() {
    if (!this.isCleared) this.update()
  }

  /** 状態を丸ごと複製する（描画・コールバックなし）。ボットの先読みに使う */
  clone(): GameEngine {
    const c = Object.create(GameEngine.prototype) as GameEngine
    Object.assign(c, this)
    c.canvas = null
    c.ctx = null
    c.raf = 0
    c.clearTimer = null
    c.beforeStep = null
    c.silent = true
    c.onClear = () => {}
    c.rng = this.rng.clone()
    c.spawner = this.spawner.clone(() => c.rng.next())
    c.forge = this.forge.clone()
    c.obstacles = this.obstacles.map(o => ({ ...o }))
    c.items = this.items.map(it => ({ ...it }))
    c.particles = []
    return c
  }

  get snapshot() {
    return {
      departmentId: this.departmentId,
      stageProgress: this.stageProgress,
      elapsedMs: this.elapsedMs,
      cleared: this.isCleared,
      missCount: this.missCount,
      py: this.py,
      pvy: this.pvy,
      jumpCount: this.jumpCount,
      inMiss: this.missOverlayTimer > 0 || this.hitStopTimer > 0,
      invincible: this.invincible,
      obstacles: this.obstacles as readonly Obstacle[],
      items: this.items as readonly Item[],
      charge: this.charge,
      debugMode: this.debugMode,
      forgeCombo: this.forge.combo,
      forgeMaxCombo: this.forge.maxCombo,
      thrustHeld: this.thrustHeld,
      frame: this.frame,
    }
  }

  // ── メインループ ──────────────────────────────────────────────────────────

  private requestFrame() {
    this.lastFrameTime = 0
    this.accumulator = 0
    this.raf = requestAnimationFrame(this.loop)
  }

  // 固定タイムステップ：経過時間ぶんだけ STEP_MS 刻みで update し、描画は1回。
  // 端数は accumulator に持ち越す（四捨五入相当にして 60Hz 端末でのカクつきを防ぐ）。
  private loop = (now: number) => {
    if (this.lastFrameTime === 0) this.lastFrameTime = now - STEP_MS
    const dt = now - this.lastFrameTime
    this.accumulator += Math.min(dt, STEP_MS * MAX_STEPS_PER_FRAME)
    this.lastFrameTime = now
    this.watchFrameRate(dt)
    let steps = 0
    while (this.accumulator >= STEP_MS / 2 && steps < MAX_STEPS_PER_FRAME && !this.isCleared) {
      this.beforeStep?.()
      this.update()
      this.accumulator -= STEP_MS
      steps++
    }
    this.render()
    if (this.isCleared) {
      this.finish()
      return
    }
    if (!this.isPaused) this.raf = requestAnimationFrame(this.loop)
  }

  // 描画が重い端末では光彩（shadowBlur）を無効にする。いちばん GPU 負荷が高く、無くても遊びに影響しない。
  // 各描画関数を書き換えずに済むよう、コンテキストの shadowBlur への代入を無視させる。
  private watchFrameRate(dt: number) {
    if (this.lowQuality || !this.ctx || dt > 250) return // 250ms 超はタブ復帰などなので数えない
    this.avgFrameMs += (dt - this.avgFrameMs) * 0.1
    this.slowFrames = this.avgFrameMs > SLOW_FRAME_MS ? this.slowFrames + 1 : 0
    if (this.slowFrames >= SLOW_FRAMES_TO_DEGRADE) {
      this.lowQuality = true
      Object.defineProperty(this.ctx, 'shadowBlur', { configurable: true, get: () => 0, set: () => {} })
    }
  }

  get isLowQuality(): boolean { return this.lowQuality }

  private finish() {
    if (!this.silent) playClear()
    const rawTimeMs = Math.round(this.elapsedMs)
    let timeMs = rawTimeMs
    let bonusMs: number | undefined
    let maxCombo: number | undefined

    if (this.isMat) {
      maxCombo = this.forge.maxCombo
      bonusMs = maxCombo * FORGE_COMBO_BONUS_MS
      timeMs = Math.max(1, rawTimeMs - bonusMs)
    }

    const result: GameClearResult = {
      timeMs,
      departmentId: this.departmentId,
      misses: this.missCount,
      ...(this.isMat ? { rawTimeMs, bonusMs, maxCombo } : {}),
    }
    this.clearTimer = setTimeout(() => this.onClear(result), CLEAR_CALLBACK_DELAY_MS)
  }

  // ── 1フレーム更新 ─────────────────────────────────────────────────────────

  private update() {
    this.frame++

    // 材料工学科の演出タイマー（ヒットストップ中も動かして見た目を止めない）
    this.forge.tickVisualTimers()

    // ヒットストップ中はタイマー以外を止める
    if (this.hitStopTimer > 0) { this.hitStopTimer--; return }

    // MISS オーバーレイ中は物理を止める（frame は進みアニメ継続）
    if (this.missOverlayTimer > 0) { this.missOverlayTimer--; return }

    // タイマー加算（ゲーム内時間。ポーズ・処理落ちで捨てたフレームは数えない）
    this.elapsedMs += STEP_MS

    // 復活スロー：revivalTimer 中は最低速度に固定
    if (this.revivalTimer > 0) this.revivalTimer--
    this.forge.tickStep(this.obstacles, this.forgeBaseSpeed, this.isMat)

    const speed = this.effectiveSpeed
    // 穴落下中・段差壁ブロック中はスクロールを停止
    if (!this.isFallingIntoHole && !isBlockedByStep(this.terrain, this.stageProgress, speed, this.py)) {
      this.stageProgress += speed
      this.bgX -= speed * 0.25
    }

    // 地形判定とプレイヤー物理
    if (this.isBio) {
      this.updateBio()
    } else {
      this.updateGroundPhysics()
    }

    if (this.pState === 'running') this.legPhase += 0.25
    if (this.invincible > 0) this.invincible--

    // 充電ドレイン（電気電子工学科）：常に減少し、0でミス
    if (this.isElec) {
      this.charge -= CHARGE_DRAIN
      if (this.charge <= 0) {
        this.charge = CHARGE_REVIVE
        this.knockback(KNOCKBACK_AMOUNT)
        return
      }
    }

    // デバッグ踏みつけ（電子情報工学科）：デバッグモード残り時間
    if (this.isCode && this.debugMode > 0) {
      this.debugMode--
    }

    if (this.isMat) {
      this.forge.updateZone(this.stageProgress, () => {
        this.burst(PLAYER_X, this.py - 20, AREAS[5].groundLineColor, 14)
      })
    }

    // ゴール直前スパーク
    if (!this.isCleared && STAGE_LENGTH - this.stageProgress <= 60 && this.frame % 4 === 0) {
      const goalTheme = AREAS[this.departmentId as AreaId]
      this.burst(this.toCanvasX(STAGE_LENGTH), 30, goalTheme.groundLineColor, 3)
    }

    // クリア判定（コールバックはメインループの finish() で呼ぶ）
    if (this.stageProgress >= STAGE_LENGTH && !this.isCleared) {
      this.isCleared = true
      this.burst(PLAYER_X, DEFAULT_GROUND_Y - 100, AREAS[this.departmentId as AreaId].groundLineColor, 20)
      return
    }

    this.spawnEntities()
    this.moveAndPruneEntities()
    this.checkCollisions()
  }

  // ── 物理・スポーン・衝突判定の内部メソッド ──────────────────────────────────

  private updateGroundPhysics() {
    this.targetGroundY = getGroundYAt(this.terrain, this.stageProgress)

    this.pvy += GRAVITY
    this.py += this.pvy

    if (this.targetGroundY !== Infinity && this.py >= this.targetGroundY) {
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

    if (this.targetGroundY === Infinity && this.py > DEFAULT_GROUND_Y + 30 && !this.isFallingIntoHole) {
      this.isFallingIntoHole = true
    }
    if (this.isFallingIntoHole && this.py > CANVAS_H + 60) {
      this.isFallingIntoHole = false
      this.knockback(HOLE_KNOCKBACK)
      this.py = this.currentGroundY
      this.pvy = -4
      this.pState = 'jumping'
      this.jumpCount = 1
    }

    if (this.targetGroundY !== Infinity) {
      const diff = this.targetGroundY - this.currentGroundY
      this.currentGroundY += Math.sign(diff) * Math.min(Math.abs(diff), STEP_FOLLOW_SPEED)
    }
  }

  private updateBio() {
    if (this.thrustHeld) {
      this.pvy += SWIM_THRUST
    } else {
      this.pvy += GRAVITY * 0.6 // 沈降
    }
    this.pvy *= SWIM_DRAG
    this.pvy = Math.max(-SWIM_MAX_VY, Math.min(SWIM_MAX_VY, this.pvy))
    this.py += this.pvy
    this.pState = this.pvy < 0 ? 'jumping' : 'falling'

    if (this.py < 15 || this.py > CANVAS_H - 15) {
      this.py = CANVAS_H / 2
      this.pvy = 0
      this.knockback(BIO_WALL_KNOCKBACK)
    }

    if (this.thrustHeld && this.frame % 5 === 0) {
      this.burst(PLAYER_X - 15, this.py, '#ffffff88', 1)
    }
  }

  private spawnEntities() {
    if (this.isCode && --this.nextBug <= 0) {
      const nextStageX = this.stageProgress + CANVAS_W
      if (hasGroundAt(this.terrain, nextStageX) && hasGroundAt(this.terrain, nextStageX + 65)) {
        this.spawner.bug(nextStageX, this.obstacles, getGroundHeightAt(this.terrain, nextStageX))
      }
      this.nextBug = 60 + this.rng.next() * 48
      this.nextObs = Math.max(this.nextObs, 25) // 重ならないように障害物をずらす
    }

    // 障害物スポーン
    const CEIL_GROUND_GAP = 90
    if (this.isMat) {
      // 鍛えてカン！：塊は距離でなく時間（フレーム）基準の予定キューで置く。
      // チュートリアルで世界を遅くして待っている間は、キューの時間を進めない
      this.spawner.updateForge(
        this.forgeBaseSpeed, this.obstacles, this.stageProgress,
        getGroundHeightAt(this.terrain, this.stageProgress + CANVAS_W), !this.forge.holding,
      )
    } else if (--this.nextObs <= 0) {
      const nextStageX = this.stageProgress + CANVAS_W
      if (this.isBio) {
        this.spawner.pipePair(nextStageX, this.obstacles, bioZone(this.stageProgress))
      } else {
        if (
          hasGroundAt(this.terrain, nextStageX) &&
          hasGroundAt(this.terrain, nextStageX + 65) &&
          hasGroundAt(this.terrain, nextStageX + 130) &&
          isFlatAt(this.terrain, nextStageX, 130)
        ) {
          // 地上走行型の機械・電気電子・電子情報（1〜3）
          this.spawner.obstacle(
            this.departmentId as 1 | 2 | 3, nextStageX, this.obstacles,
            getGroundHeightAt(this.terrain, nextStageX),
          )
        }
      }
      const [mn, r] = SPAWN_GAPS[this.departmentId] ?? SPAWN_GAPS[1]
      this.nextObs = mn + this.rng.next() * r
      this.nextCeilingObs = Math.max(this.nextCeilingObs, CEIL_GROUND_GAP)
      if (this.isCode) this.nextBug = Math.max(this.nextBug, 25)
    }

    // 天井障害（電気電子・電子情報）
    if ((this.isElec || this.isCode) && --this.nextCeilingObs <= 0) {
      const nextStageX = this.stageProgress + CANVAS_W
      this.spawner.ceiling(nextStageX, this.obstacles)
      const base = Math.max(100, 260 - this.departmentId * 25)
      this.nextCeilingObs = base + this.rng.next() * 100
      this.nextObs = Math.max(this.nextObs, CEIL_GROUND_GAP)
    }

    // 電池スポーン（電気電子工学科）：必ずジャンプしないと届かない高さに配置する
    if (this.isElec && --this.nextBattery <= 0) {
      const nextStageX = this.stageProgress + CANVAS_W
      const groundY = getGroundHeightAt(this.terrain, nextStageX)
      const y = groundY - (74 + this.rng.next() * 46)
      this.items.push({ stageX: nextStageX, x: CANVAS_W + 10, y, effect: 'charge', wobble: this.rng.next() * Math.PI * 2 })
      const [mn, r] = BATTERY_GAP
      this.nextBattery = mn + this.rng.next() * r
    }

    // バリアアイテムスポーン（生物応用化学科）：培養液中を浮遊。取ると1回被弾を無効化
    if (this.isBio && --this.nextShield <= 0) {
      const nextStageX = this.stageProgress + CANVAS_W
      const y = 55 + this.rng.next() * (CANVAS_H - 110)
      this.items.push({ stageX: nextStageX, x: CANVAS_W + 10, y, effect: 'shield', wobble: this.rng.next() * Math.PI * 2 })
      const [mn, r] = SHIELD_GAP
      this.nextShield = mn + this.rng.next() * r
    }
  }

  private moveAndPruneEntities() {
    for (const o of this.obstacles) {
      // 叩いた塊（材料工学科）：世界より速く後ろへ飛ぶ。phase は叩いてからの経過フレーム（描画用）
      if (o.struck) { o.stageX -= 6; o.phase++ }
      o.x = this.toCanvasX(o.stageX)
      if (o.moving) o.y = o.baseY - Math.abs(Math.sin(o.phase += 0.045)) * o.amplitude
    }
    this.obstacles = this.obstacles.filter(o => o.x > -150)

    for (const it of this.items) { it.x = this.toCanvasX(it.stageX); it.wobble += 0.1 }
    this.items = this.items.filter(it => it.x > -20)

    this.particles = this.particles.filter(p => {
      p.x += p.vx; p.y += p.vy; p.vy += 0.15
      return --p.life > 0
    })
  }

  private checkCollisions() {
    const ph = playerHitbox(this.py)
    if (this.invincible === 0 && this.debugMode === 0) {
      for (const o of this.obstacles) {
        if (o.struck) continue // 叩いた塊（板になって飛んでいる）には当たらない
        if (!overlaps(ph, { x: o.x + 4, y: o.y + 4, w: o.w - 8, h: o.h - 8 })) continue
        // malloc/free 点滅ゲート：free（消滅）期間は当たり判定なし＝すり抜け
        if (o.shape === 'malloc_free' && !mallocSolid(o.phase, this.frame)) continue
        // 踏みつけ（電子情報）：落下中に踏める敵の上面へ着地したら成立
        if (this.isCode && o.stompable) {
          if (this.pvy > 0 && (this.py - this.pvy) <= o.y + STOMP_MARGIN) {
            this.stomp(o)
          } else {
            // 横から当たった場合はミスにならない（バグは消滅するがコンボは維持）
            this.obstacles = this.obstacles.filter(x => x !== o)
            this.burst(o.x + o.w / 2, o.y + o.h / 2, '#555555', 5)
          }
          break
        }
        // バリア（生物応用化学科）：保持中なら1回だけ被弾を無効化して通過
        if (this.isBio && this.bioShield) {
          this.bioShield = false
          this.invincible = KNOCKBACK_INVINCIBLE
          this.burst(PLAYER_X, this.py, SHIELD_COLOR, 18)
          this.sfx(playJump)
          break
        }
        // 通常被弾：チャージ大幅減（電気電子）＋ノックバック
        if (this.isElec) this.charge = Math.max(0, this.charge - CHARGE_HIT_COST)
        this.knockback(KNOCKBACK_AMOUNT)
        return
      }
    }

    // デバッグモード中（電子情報）：踏める敵はすり抜けつつ自動処理（壁はすり抜け）
    if (this.isCode && this.debugMode > 0) {
      this.obstacles = this.obstacles.filter(o => {
        if (o.stompable && overlaps(ph, { x: o.x, y: o.y, w: o.w, h: o.h })) {
          this.burst(o.x + o.w / 2, o.y + o.h / 2, AREAS[3].groundLineColor, 6)
          return false
        }
        return true
      })
    }

    this.collectItems(ph)
  }

  private collectItems(ph: Box) {
    if (!this.items.length) return
    this.items = this.items.filter(it => {
      const box = itemHitbox(it)
      if (!box || !overlaps(ph, box)) return true
      this.applyItem(it)
      return false
    })
  }

  private applyItem(it: Item) {
    switch (it.effect) {
      case 'charge':
        this.charge = Math.min(CHARGE_MAX, this.charge + BATTERY_REFILL)
        this.burst(it.x, it.y, AREAS[2].coinColor, 8)
        break
      case 'shield':
        this.bioShield = true
        this.burst(it.x, it.y, SHIELD_COLOR, 12)
        this.sfx(playJump)
        break
    }
  }

  private get currentSpeed(): number {
    const t = Math.min(this.stageProgress / STAGE_LENGTH, 1)
    if (this.isBio) {
      return BIO_SPEED_START + (BIO_SPEED_END - BIO_SPEED_START) * t
    }
    return SPEED_START + (SPEED_END - SPEED_START) * t
  }

  // 材料工学科：速度（チュートリアルの減速をかける前）。ミス直後の復帰中は他学科と同じ SPEED_START
  private get forgeBaseSpeed(): number {
    if (this.revivalTimer > 0) return SPEED_START
    return this.currentSpeed
  }

  private get effectiveSpeed(): number {
    if (this.revivalTimer > 0) return this.isBio ? BIO_SPEED_START : SPEED_START
    // 材料工学科：最初の2個を待つあいだだけ世界を遅くする
    if (this.isMat) return this.forgeBaseSpeed * (this.forge.holding ? FORGE_TUTORIAL_SLOW : 1)
    // デバッグモード中（電子情報）はスクロール加速＝タイム短縮ボーナス
    return this.debugMode > 0 ? this.currentSpeed * DEBUG_SPEED_MULT : this.currentSpeed
  }

  // stageProgress基準のCanvas X座標変換
  private toCanvasX(stageX: number): number {
    return PLAYER_X + (stageX - this.stageProgress)
  }

  private knockback(amount: number) {
    this.stageProgress    = Math.max(0, this.stageProgress - amount)
    this.missProgressLost = amount
    this.invincible       = KNOCKBACK_INVINCIBLE
    this.hitStopTimer     = HIT_STOP_FRAMES
    this.missOverlayTimer = MISS_OVERLAY_FRAMES
    this.revivalTimer     = REVIVAL_FRAMES
    // スイム（生物応用化学）は上下の慣性をリセットして復帰を安定させる
    if (this.isBio) this.pvy = 0
    this.forge.onMiss(this.isMat)
    this.missCount++
    this.sfx(playKnockback)
    this.burst(PLAYER_X, this.py - 20, '#ff8800', 10)
  }

  private performJump() {
    this.pvy = this.jumpCount === 1 ? JUMP_VY * 0.82 : JUMP_VY
    this.pState = 'jumping'
    this.jumpCount++
    this.coyoteTime = 0
    this.sfx(playJump)
    this.burst(PLAYER_X, this.py, '#ffffff', 4)
  }

  // 踏みつけ（電子情報）：バグを倒してバウンド、ゲージを伸ばす。満タンでデバッグモード突入。
  private stomp(o: Obstacle) {
    this.obstacles = this.obstacles.filter(x => x !== o)
    this.pvy = STOMP_BOUNCE
    this.jumpCount = 1
    this.pState = 'jumping'
    this.combo++
    this.burst(o.x + o.w / 2, o.y, AREAS[3].groundLineColor, 8)
    this.sfx(playJump)
    if (this.combo >= COMBO_NEEDED) {
      this.debugMode = DEBUG_FRAMES
      this.combo = 0
      this.burst(PLAYER_X, this.py - 30, '#00ffcc', 18)
    }
  }

  private sfx(play: () => void) {
    if (!this.silent) play()
  }

  private burst(x: number, y: number, color: string, n: number) {
    if (this.silent) return
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
    if (!ctx) return
    const theme = AREAS[this.departmentId as AreaId]
    const arrival = this.isMat
      ? this.forge.nextArrival(this.obstacles, this.forgeBaseSpeed, this.spawner.getForgeQueue())
      : Infinity
    const bg: BgContext = {
      frame: this.frame, bgX: this.bgX, speed: this.missOverlayTimer > 0 ? 0 : this.effectiveSpeed,
      debug: this.debugMode > 0, stageProgress: this.stageProgress, isBio: this.isBio,
    }

    ctx.save()
    // 材料工学科：PERFECT で画面を小さく揺らす
    if (this.isMat && this.forge.shake > 0) {
      ctx.translate(
        Math.sin(this.frame * 7) * this.forge.shake * 0.5,
        Math.cos(this.frame * 5) * this.forge.shake * 0.4,
      )
    }

    drawBg(ctx, this.departmentId as AreaId, theme, bg)
    if (this.isMat) {
      drawMatGround(ctx, theme, this.stageProgress)
    } else if (!this.isBio) {
      drawGround(ctx, theme, bg, this.terrain, this.stageProgress)
    }
    drawGoal(ctx, this.departmentId as AreaId, theme, this.stageProgress, this.frame)

    for (const o of this.obstacles) drawObstacle(ctx, o, theme, this.frame)
    if (this.isMat) drawForgeRings(ctx, this.obstacles, this.forge.holding, arrival, this.frame)

    for (const it of this.items) {
      if (it.effect === 'charge') drawBattery(ctx, it, theme, this.frame)
      else if (it.effect === 'shield') drawShieldItem(ctx, it, this.frame)
    }

    for (const p of this.particles) {
      ctx.globalAlpha = p.life / p.maxLife
      ctx.fillStyle = p.color
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill()
    }
    ctx.globalAlpha = 1

    const playerOpts = {
      py: this.py, pState: this.pState, pvy: this.pvy,
      invincible: this.invincible, legPhase: this.legPhase,
      shield: this.isBio ? this.bioShield : false, frame: this.frame,
      bio: this.isBio,
    }
    drawPlayer(ctx, theme.coinColor, playerOpts)
    if (this.isMat) {
      drawForgeHammer(ctx, { py: this.py, swingTimer: this.forge.swingTimer, frame: this.frame })
    }

    drawHUD(ctx, theme, {
      elapsedMs: this.elapsedMs,
      stageProgress: this.stageProgress,
      invincible: this.invincible,
      departmentId: this.departmentId,
      charge: this.isElec ? this.charge : undefined,
      chargeMax: this.isElec ? CHARGE_MAX : undefined,
      combo: this.isCode ? this.combo : undefined,
      comboNeeded: this.isCode ? COMBO_NEEDED : undefined,
      debugMode: this.isCode ? this.debugMode : undefined,
    })

    if (this.isMat) {
      drawForgeHud(ctx, {
        combo: this.forge.combo, judge: this.forge.judgeTimer > 0 ? this.forge.judge : null,
        judgeTimer: this.forge.judgeTimer, frame: this.frame,
        hint: this.forge.hits < FORGE_TUTORIAL_HITS, holding: this.forge.holding,
      })
      if (this.forge.cutinTimer > 0) {
        const [title, sub] = FORGE_ZONE_CUTIN[this.forge.cutinZone]
        drawMatCutin(ctx, theme, title, sub, this.forge.cutinTimer, FORGE_CUTIN_FRAMES)
      }
      if (this.isCleared) drawForgeResult(ctx, theme, this.forge.maxCombo)
    }

    if (this.missOverlayTimer > 0) {
      renderMissOverlay(ctx, theme, this.missProgressLost, this.missOverlayTimer, MISS_OVERLAY_FRAMES)
    }
    if (this.revivalTimer > 0) {
      renderRevivalHint(ctx, theme, this.revivalTimer, REVIVAL_FRAMES)
    }

    ctx.restore()
  }
}
