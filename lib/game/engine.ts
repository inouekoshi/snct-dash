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
  FORGE_RING_OFFSET, FORGE_PERFECT, FORGE_GOOD_EARLY, FORGE_GOOD_LATE, FORGE_SWING_FRAMES,
  FORGE_EARLY_LIMIT, FORGE_COOLDOWN, FORGE_HITSTOP,
  FORGE_CUTIN_FRAMES, FORGE_TUTORIAL_SLOW, FORGE_TUTORIAL_WAIT, FORGE_ZONE_CUTIN,
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
  type ForgeJudge,
} from './mat-renderers'
import { buildStage } from './terrain'

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
  private forgeCombo = 0             // PERFECT/GOOD の連続回数
  private forgeMaxCombo = 0
  private forgeHits = 0              // 叩いた塊の数（チュートリアルの文字を消す判断に使う）
  private strikeCooldown = 0         // 空振り後の硬直の残りフレーム
  private swingTimer = 0             // ハンマーを振っている残りフレーム
  private judge: ForgeJudge | null = null
  private judgeTimer = 0
  private forgeHolding = false       // チュートリアルで世界を遅くして待っているか
  private forgeWait = 0              // 待っているフレーム数
  private shake = 0                  // PERFECT の画面の揺れ
  private maxForgeZone = 0           // 到達した最も先の区間（カットインは初到達時のみ）
  private cutinTimer = 0
  private cutinZone = 0

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
    if (this.isMat) { this.strike(); return }
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
      forgeCombo: this.forgeCombo,
      forgeMaxCombo: this.forgeMaxCombo,
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
      maxCombo = this.forgeMaxCombo
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

  private update() {
    this.frame++

    // 材料工学科の演出タイマー（ヒットストップ中も動かして見た目を止めない）
    if (this.swingTimer > 0) this.swingTimer--
    if (this.judgeTimer > 0) this.judgeTimer--
    if (this.shake > 0) this.shake--

    // ヒットストップ中はタイマー以外を止める
    if (this.hitStopTimer > 0) { this.hitStopTimer--; return }

    // MISS オーバーレイ中は物理を止める（frame は進みアニメ継続）
    if (this.missOverlayTimer > 0) { this.missOverlayTimer--; return }

    // タイマー加算（ゲーム内時間。ポーズ・処理落ちで捨てたフレームは数えない）
    this.elapsedMs += STEP_MS

    // 復活スロー：revivalTimer 中は最低速度に固定
    if (this.revivalTimer > 0) this.revivalTimer--
    if (this.strikeCooldown > 0) this.strikeCooldown--
    if (this.isMat) this.updateForgeHold()
    const speed = this.effectiveSpeed
    // 穴落下中・段差壁ブロック中はスクロールを停止
    if (!this.isFallingIntoHole && !this.isBlockedByStep()) {
      this.stageProgress += speed
      this.bgX -= speed * 0.25
    }

    // 地形判定とプレイヤー物理
    if (this.isBio) {
      this.updateBio()
    } else {
      this.targetGroundY = this.getGroundY()

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
    // コンボは時間でリセットせず、踏んだ数を累積する
    if (this.isCode) {
      if (this.debugMode > 0) this.debugMode--
    }

    if (this.isMat) this.updateForgeZone()

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

    if (this.isCode && --this.nextBug <= 0) {
      const nextStageX = this.stageProgress + CANVAS_W
      if (this.hasGroundAt(nextStageX) && this.hasGroundAt(nextStageX + 65)) {
        this.spawner.bug(nextStageX, this.obstacles, this.getGroundHeightAt(nextStageX))
      }
      this.nextBug = 60 + this.rng.next() * 48 // 以前の約半分の出現頻度
      this.nextObs = Math.max(this.nextObs, 25) // 重ならないように障害物をずらす
    }

    // 障害物スポーン
    const CEIL_GROUND_GAP = 90
    if (this.isMat) {
      // 鍛えてカン！：塊は距離でなく時間（フレーム）基準の予定キューで置く。
      // チュートリアルで世界を遅くして待っている間は、キューの時間を進めない
      this.spawner.updateForge(
        this.forgeBaseSpeed, this.obstacles, this.stageProgress,
        this.getGroundHeightAt(this.stageProgress + CANVAS_W), !this.forgeHolding,
      )
    } else if (--this.nextObs <= 0) {
      const nextStageX = this.stageProgress + CANVAS_W
      if (this.isBio) {
        this.spawner.pipePair(nextStageX, this.obstacles, bioZone(this.stageProgress))
      } else {
        if (this.hasGroundAt(nextStageX) && this.hasGroundAt(nextStageX + 65) && this.hasGroundAt(nextStageX + 130)
            && this.isFlatAt(nextStageX, 130)) {
          // ここに来るのは地上走行型の機械・電気電子・電子情報（1〜3）のみ
          this.spawner.obstacle(this.departmentId as 1 | 2 | 3, nextStageX, this.obstacles, this.getGroundHeightAt(nextStageX))
        }
      }
      const [mn, r] = SPAWN_GAPS[this.departmentId] ?? SPAWN_GAPS[1]
      this.nextObs = mn + this.rng.next() * r
      this.nextCeilingObs = Math.max(this.nextCeilingObs, CEIL_GROUND_GAP)
      if (this.isCode) this.nextBug = Math.max(this.nextBug, 25) // 重ならないようにバグをずらす
    }
    // 天井障害（電気電子・電子情報）
    if ((this.isElec || this.isCode) && --this.nextCeilingObs <= 0) {
      const nextStageX = this.stageProgress + CANVAS_W
      this.spawner.ceiling(nextStageX, this.obstacles)
      const base = Math.max(100, 260 - this.departmentId * 25)
      this.nextCeilingObs = base + this.rng.next() * 100
      this.nextObs = Math.max(this.nextObs, CEIL_GROUND_GAP)
    }

    // 電池スポーン（電気電子工学科）：必ずジャンプしないと届かない高さに配置する。
    // 走行中のプレイヤー判定上端は groundY-46 付近なので、それより十分上（74〜120px）に置く。
    if (this.isElec && --this.nextBattery <= 0) {
      const nextStageX = this.stageProgress + CANVAS_W
      const groundY = this.getGroundHeightAt(nextStageX)
      const y = groundY - (74 + this.rng.next() * 46) // ジャンプの上昇〜頂点で取れる高さ
      this.items.push({ stageX: nextStageX, x: CANVAS_W + 10, y, effect: 'charge', wobble: this.rng.next() * Math.PI * 2 })
      const [mn, r] = BATTERY_GAP
      this.nextBattery = mn + this.rng.next() * r
    }

    // バリアアイテムスポーン（生物応用化学科）：培養液中を浮遊。取ると1回被弾を無効化。
    if (this.isBio && --this.nextShield <= 0) {
      const nextStageX = this.stageProgress + CANVAS_W
      const y = 55 + this.rng.next() * (CANVAS_H - 110) // 上下壁を避けた高さ
      this.items.push({ stageX: nextStageX, x: CANVAS_W + 10, y, effect: 'shield', wobble: this.rng.next() * Math.PI * 2 })
      const [mn, r] = SHIELD_GAP
      this.nextShield = mn + this.rng.next() * r
    }

    // オブジェクトのCanvas座標を更新・画面外を除去
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

    // 衝突判定
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
        // バリア（生物応用化学科）：保持中なら1回だけ被弾を無効化して通過。
        // 消費して無敵フレームを付与し、当たったパイプをそのまま通り抜けられるようにする。
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

  // ── 内部メソッド ──────────────────────────────────────────────────────────

  // アイテム取得判定：🔋電池（電気電子）／🛡バリア（生物応化）。
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
        // 拾うとバリアを保持（1回被弾を無効化）
        this.bioShield = true
        this.burst(it.x, it.y, SHIELD_COLOR, 12)
        this.sfx(playJump)
        break
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

    if (this.py < 15) {
      this.py = CANVAS_H / 2
      this.pvy = 0
      this.knockback(BIO_WALL_KNOCKBACK)
    } else if (this.py > CANVAS_H - 15) {
      this.py = CANVAS_H / 2
      this.pvy = 0
      this.knockback(BIO_WALL_KNOCKBACK)
    }
    
    if (this.thrustHeld && this.frame % 5 === 0) {
      this.burst(PLAYER_X - 15, this.py, '#ffffff88', 1)
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
    if (this.isMat) return this.forgeBaseSpeed * (this.forgeHolding ? FORGE_TUTORIAL_SLOW : 1)
    // デバッグモード中（電子情報）はスクロール加速＝タイム短縮ボーナス
    return this.debugMode > 0 ? this.currentSpeed * DEBUG_SPEED_MULT : this.currentSpeed
  }

  // 塊の中心が輪の中心に届くまでの残りフレーム（小数）。正の値は「まだ届いていない＝早い」
  private forgeIngotT(o: Obstacle, speed: number): number {
    return (o.x + o.w / 2 - (PLAYER_X + FORGE_RING_OFFSET)) / speed
  }

  // 3-4 チュートリアル：最初の2個は、輪に近づいたら世界を遅くして待つ（最大 FORGE_TUTORIAL_WAIT フレーム）
  private updateForgeHold() {
    const target = this.obstacles.find(o => o.tutorial && !o.struck)
    if (target && this.forgeWait < FORGE_TUTORIAL_WAIT
        && this.forgeIngotT(target, this.forgeBaseSpeed) <= FORGE_GOOD_EARLY) {
      this.forgeHolding = true
      this.forgeWait++
      return
    }
    this.forgeHolding = false
    if (target && this.forgeWait >= FORGE_TUTORIAL_WAIT) {
      // 待っても叩かなかったので通常の速さに戻す（次のチュートリアルの塊のために待ち時間も戻す）
      target.tutorial = false
      this.forgeWait = 0
    }
  }

  // 3-2 ハンマーで叩く。タップ（スペース・↑・クリック）はすべてここに来る
  private strike() {
    // PERFECT のヒットストップ中と、空振り後の硬直中のタップは捨てる（先行入力にしない）
    if (this.hitStopTimer > 0 || this.strikeCooldown > 0) return
    this.swingTimer = FORGE_SWING_FRAMES

    // 待機中のチュートリアルは、いつ叩いても PERFECT 扱い
    if (this.forgeHolding) {
      const tutorial = this.obstacles.find(o => o.tutorial && !o.struck)
      if (tutorial) { this.hitIngot(tutorial, 'perfect'); return }
    }

    // まだ叩いていない塊のうち、判定を過ぎきっていない（t ≥ -GOOD_LATE）一番近いものを選ぶ
    const speed = this.effectiveSpeed
    let target: Obstacle | null = null
    let tNear = Infinity
    for (const o of this.obstacles) {
      if (o.struck || o.shape !== 'hot_ingot') continue
      const t = this.forgeIngotT(o, speed)
      if (t >= -FORGE_GOOD_LATE && t < tNear) { tNear = t; target = o }
    }

    // 近くに塊がない：ハンマーを振るだけ。罰はなく、硬直だけ入る
    if (!target || tNear > FORGE_EARLY_LIMIT) {
      this.strikeCooldown = FORGE_COOLDOWN
      return
    }
    // はやい：硬直
    if (tNear > FORGE_GOOD_EARLY) {
      this.strikeCooldown = FORGE_COOLDOWN
      this.showJudge('early', 30)
      return
    }
    this.hitIngot(target, Math.abs(tNear) <= FORGE_PERFECT ? 'perfect' : 'good')
  }

  // 塊を叩いて板にする
  private hitIngot(o: Obstacle, kind: 'perfect' | 'good') {
    o.struck = true
    o.phase = 0
    o.tutorial = false
    this.forgeHits++
    this.forgeWait = 0
    this.forgeHolding = false
    this.forgeCombo++
    this.forgeMaxCombo = Math.max(this.forgeMaxCombo, this.forgeCombo)
    const cx = o.x + o.w / 2, cy = o.y + o.h / 2
    if (kind === 'perfect') {
      this.hitStopTimer = FORGE_HITSTOP
      this.shake = 6
      this.burst(cx, cy, '#ffe9a0', 18)
      this.burst(cx, cy, '#ff8a2a', 10)
      this.showJudge('perfect', 36)
      this.sfx(playJump)
    } else {
      this.burst(cx, cy, '#ff8a2a', 8)
      this.showJudge('good', 26)
      this.sfx(playJump)
    }
  }

  private showJudge(kind: ForgeJudge, frames: number) {
    this.judge = kind
    this.judgeTimer = frames
  }

  // 区間（進み具合 25% ごと）の切り替わりカットイン。初めて入ったときだけ（ノックバックで戻っても出さない）
  private updateForgeZone() {
    const zone = Math.min(3, Math.floor(Math.min(1, this.stageProgress / STAGE_LENGTH) * 4))
    if (zone > this.maxForgeZone) {
      this.maxForgeZone = zone
      this.cutinZone = zone
      this.cutinTimer = FORGE_CUTIN_FRAMES
      this.burst(PLAYER_X, this.py - 20, AREAS[5].groundLineColor, 14)
    }
    if (this.cutinTimer > 0) this.cutinTimer--
  }

  // 次の塊が輪に届くまでの残りフレーム（炉の脈動用）。置いていない塊は予定キューから引く
  private forgeNextArrival(): number {
    const speed = this.forgeBaseSpeed
    let best = Infinity
    for (const o of this.obstacles) {
      if (o.struck || o.shape !== 'hot_ingot') continue
      const t = this.forgeIngotT(o, speed)
      if (t >= 0 && t < best) best = t
    }
    const queue = this.spawner.getForgeQueue()
    if (queue.length > 0) best = Math.min(best, Math.max(0, queue[0].remaining))
    return best
  }

  // stageProgress基準のCanvas X座標変換
  private toCanvasX(stageX: number): number {
    return PLAYER_X + (stageX - this.stageProgress)
  }

  // stageX を含む地形セグメントの添字（無ければ -1）。セグメントは stageX 昇順に隙間なく並ぶので二分探索する
  private segmentIndexAt(stageX: number): number {
    const t = this.terrain
    let lo = 0, hi = t.length - 1
    while (lo <= hi) {
      const mid = (lo + hi) >> 1
      const seg = t[mid]
      if (stageX < seg.stageX) hi = mid - 1
      else if (stageX >= seg.stageX + seg.width) lo = mid + 1
      else return mid
    }
    return -1
  }

  // プレイヤー直下の地面Y（穴ならInfinity）
  private getGroundY(): number {
    const seg = this.terrain[this.segmentIndexAt(this.stageProgress)]
    if (!seg) return DEFAULT_GROUND_Y
    return seg.type === 'hole' ? Infinity : seg.groundY
  }

  private hasGroundAt(stageX: number): boolean {
    const seg = this.terrain[this.segmentIndexAt(stageX)]
    return !seg || seg.type !== 'hole'
  }

  private getGroundHeightAt(stageX: number): number {
    const seg = this.terrain[this.segmentIndexAt(stageX)]
    return !seg || seg.type === 'hole' ? DEFAULT_GROUND_Y : seg.groundY
  }

  // 区間 [stageX, stageX+width] が同じ高さの平坦な地面か（段差・階段の途中に障害物を出さないため）
  private isFlatAt(stageX: number, width: number): boolean {
    const base = this.getGroundHeightAt(stageX)
    for (let dx = 30; dx <= width; dx += 30) {
      if (this.getGroundHeightAt(stageX + dx) !== base) return false
    }
    return true
  }

  // 目の前（このフレームで進む距離以内）に上り段差があり、まだその高さまで跳んでいなければ進めない
  private isBlockedByStep(): boolean {
    if (this.terrain.length < 2) return false
    const speed = this.effectiveSpeed
    const i = Math.max(1, this.segmentIndexAt(this.stageProgress))
    for (let j = i; j < this.terrain.length; j++) {
      const prev = this.terrain[j - 1]
      const curr = this.terrain[j]
      const dist = curr.stageX - this.stageProgress
      if (dist > speed + 3) break
      if (dist < 0 || prev.type !== 'ground' || curr.type !== 'ground') continue
      const stepHeight = prev.groundY - curr.groundY  // 正なら上り段差
      if (stepHeight >= 20 && this.py > curr.groundY + 5) return true
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
    // スイム（生物応用化学）は上下の慣性をリセットして復帰を安定させる
    // （壁ヒットは updateBio 側で既に 0 にしているが、パイプ衝突経路もここで揃える）
    if (this.isBio) this.pvy = 0
    // 材料工学科：叩けなかった塊に当たったら、連続回数を0に戻す
    this.forgeCombo = 0
    this.forgeHolding = false
    this.forgeWait = 0
    if (this.isMat) this.showJudge('late', 50)
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
    const arrival = this.isMat ? this.forgeNextArrival() : Infinity
    const bg: BgContext = {
      frame: this.frame, bgX: this.bgX, speed: this.missOverlayTimer > 0 ? 0 : this.effectiveSpeed,
      debug: this.debugMode > 0, stageProgress: this.stageProgress, isBio: this.isBio,
    }

    ctx.save()
    // 材料工学科：PERFECT で画面を小さく揺らす
    if (this.isMat && this.shake > 0) {
      ctx.translate(Math.sin(this.frame * 7) * this.shake * 0.5, Math.cos(this.frame * 5) * this.shake * 0.4)
    }

    drawBg(ctx, this.departmentId as AreaId, theme, bg)
    if (this.isMat) {
      drawMatGround(ctx, theme, this.stageProgress)
    } else if (!this.isBio) {
      drawGround(ctx, theme, bg, this.terrain, this.stageProgress)
    }
    drawGoal(ctx, this.departmentId as AreaId, theme, this.stageProgress, this.frame)

    for (const o of this.obstacles) drawObstacle(ctx, o, theme, this.frame)
    if (this.isMat) drawForgeRings(ctx, this.obstacles, this.forgeHolding, arrival, this.frame)

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
      drawForgeHammer(ctx, { py: this.py, swingTimer: this.swingTimer, frame: this.frame })
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
        combo: this.forgeCombo, judge: this.judgeTimer > 0 ? this.judge : null,
        judgeTimer: this.judgeTimer, frame: this.frame,
        hint: this.forgeHits < FORGE_TUTORIAL_HITS, holding: this.forgeHolding,
      })
      if (this.cutinTimer > 0) {
        const [title, sub] = FORGE_ZONE_CUTIN[this.cutinZone]
        drawMatCutin(ctx, theme, title, sub, this.cutinTimer, FORGE_CUTIN_FRAMES)
      }
      if (this.isCleared) drawForgeResult(ctx, theme, this.forgeMaxCombo)
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
