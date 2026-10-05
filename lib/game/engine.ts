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
  matPhase, matBoundaries, MAT_PHASE_ORDER, MAT_PHASE_START, MAT_HITBOX_H, MAT_SAFE_MARGIN, MELT_BOUNCE_VY,
  HEAT_GATE_OFFSET, HEAT_STATE_SPAN, HEAT_SET_GAP, MAT_SPAWN_GAPS,
  MAT_BEND_FRAMES, MAT_BOOST_FRAMES, MAT_BOOST_MAX, MAT_SLOW_FRAMES, MAT_SLOW_MULT, MAT_CUTIN_FRAMES,
  MAT_FLEX_COLOR, MAT_HARD_COLOR, type MatPhase,
} from './constants'
import type { PlayerState, Obstacle, TerrainSegment, Item, Particle } from './engine-types'
import { overlaps, playerHitbox, itemHitbox, type Box } from './helpers'
import { drawObstacle } from './obstacle-drawers'
import { drawBattery, drawShieldItem } from './item-renderer'
import { drawBg, drawGround, type BgContext } from './background-renderers'
import { drawPlayer } from './player-renderer'
import { drawGoal } from './goal-renderer'
import { drawHUD, renderPauseOverlay, renderMissOverlay, renderRevivalHint } from './hud-renderer'
import { spawnObstacle, spawnCeilingObstacle, spawnBug, spawnPipePair, resetSpawnerBags, spawnMat, spawnHeatSet } from './spawner'
import { drawMatPlayer, drawMatItem, drawMatGround, drawMatHud, drawMatCutin, type MatState } from './mat-renderers'
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

  // 製品ができるまでラン（材料工学科 = departmentId 5 のみ稼働）
  private isMat = false
  private matState: MatState = 'normal'
  private matStateUntilX = 0       // この stageX を過ぎたら状態が通常に戻る
  private nextHeatSetX = 0         // 次の熱処理セットの先頭 stageX
  private heatSetCount = 0
  private bendTimer = 0            // 板バネで曲がっている残りフレーム（減速）
  private boostTimer = 0           // 形が戻った反動の加速の残りフレーム
  private boostMult = 1
  private matSlowTimer = 0         // 結晶壁を迂回したときの減速の残りフレーム
  private maxMatPhaseIdx = -1      // 到達した最も先の工程（カットインは初到達時のみ）
  private lastHeatKind: 'flex' | 'hard' | null = null
  private heatKindStreak = 0
  private cutinTimer = 0
  private cutinPhase: MatPhase = 'melt'

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
    this.isElec = departmentId === 2
    this.isCode = departmentId === 3
    this.isBio = departmentId === 4
    this.isMat = departmentId === 5
    this.nextHeatSetX = MAT_PHASE_START.heat * STAGE_LENGTH + MAT_SAFE_MARGIN
    if (this.isBio) {
      this.py = CANVAS_H / 2
    }
    this.onClear = onClear
    resetSpawnerBags()
    this.terrain = buildStage(departmentId)
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

    // タイマー加算
    this.elapsedMs += 1000 / 60

    // 復活スロー：revivalTimer 中は最低速度に固定
    if (this.revivalTimer > 0) this.revivalTimer--
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
        // 溶解（材料工学科）：液滴は着地のたびに小さく自動で弾む。ジャンプ回数は消費しない
        else if (this.isMat && matPhase(this.stageProgress) === 'melt') this.pvy = MELT_BOUNCE_VY
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

    if (this.isMat) this.updateMat()

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

    if (this.isCode && --this.nextBug <= 0) {
      const nextStageX = this.stageProgress + CANVAS_W
      if (this.hasGroundAt(nextStageX) && this.hasGroundAt(nextStageX + 65)) {
        spawnBug(nextStageX, this.obstacles, this.getGroundHeightAt(nextStageX))
      }
      this.nextBug = 60 + Math.random() * 48 // 以前の約半分の出現頻度
      this.nextObs = Math.max(this.nextObs, 25) // 重ならないように障害物をずらす
    }

    // 障害物スポーン
    const CEIL_GROUND_GAP = 90
    if (--this.nextObs <= 0) {
      const nextStageX = this.stageProgress + CANVAS_W
      if (this.isBio) {
        spawnPipePair(nextStageX, this.obstacles, bioZone(this.stageProgress))
      } else if (this.isMat) {
        const ph = matPhase(nextStageX)
        if ((ph === 'melt' || ph === 'roll') && this.isMatSafeToSpawn(nextStageX, 260)) {
          spawnMat(ph, nextStageX, this.obstacles, this.getGroundHeightAt(nextStageX))
        }
      } else {
        if (this.hasGroundAt(nextStageX) && this.hasGroundAt(nextStageX + 65) && this.hasGroundAt(nextStageX + 130)
            && this.isFlatAt(nextStageX, 130)) {
          // ここに来るのは地上走行型の機械・電気電子・電子情報（1〜3）のみ
          spawnObstacle(this.departmentId as 1 | 2 | 3, nextStageX, this.obstacles, this.getGroundHeightAt(nextStageX))
        }
      }
      const [mn, r] = this.isMat
        ? MAT_SPAWN_GAPS[matPhase(this.stageProgress) === 'roll' ? 'roll' : 'melt']
        : SPAWN_GAPS[this.departmentId] ?? SPAWN_GAPS[1]
      this.nextObs = mn + Math.random() * r
      this.nextCeilingObs = Math.max(this.nextCeilingObs, CEIL_GROUND_GAP)
      if (this.isCode) this.nextBug = Math.max(this.nextBug, 25) // 重ならないようにバグをずらす
    }
    // 天井障害（電気電子・電子情報）
    if ((this.isElec || this.isCode) && --this.nextCeilingObs <= 0) {
      const nextStageX = this.stageProgress + CANVAS_W
      spawnCeilingObstacle(nextStageX, this.obstacles)
      const base = Math.max(100, 260 - this.departmentId * 25)
      this.nextCeilingObs = base + Math.random() * 100
      this.nextObs = Math.max(this.nextObs, CEIL_GROUND_GAP)
    }

    // 電池スポーン（電気電子工学科）：必ずジャンプしないと届かない高さに配置する。
    // 走行中のプレイヤー判定上端は groundY-46 付近なので、それより十分上（74〜120px）に置く。
    if (this.isElec && --this.nextBattery <= 0) {
      const nextStageX = this.stageProgress + CANVAS_W
      const groundY = this.getGroundHeightAt(nextStageX)
      const y = groundY - (74 + Math.random() * 46) // ジャンプの上昇〜頂点で取れる高さ
      this.items.push({ stageX: nextStageX, x: CANVAS_W + 10, y, effect: 'charge', wobble: Math.random() * Math.PI * 2 })
      const [mn, r] = BATTERY_GAP
      this.nextBattery = mn + Math.random() * r
    }

    // バリアアイテムスポーン（生物応用化学科）：培養液中を浮遊。取ると1回被弾を無効化。
    if (this.isBio && --this.nextShield <= 0) {
      const nextStageX = this.stageProgress + CANVAS_W
      const y = 55 + Math.random() * (CANVAS_H - 110) // 上下壁を避けた高さ
      this.items.push({ stageX: nextStageX, x: CANVAS_W + 10, y, effect: 'shield', wobble: Math.random() * Math.PI * 2 })
      const [mn, r] = SHIELD_GAP
      this.nextShield = mn + Math.random() * r
    }

    // オブジェクトのCanvas座標を更新・画面外を除去
    for (const o of this.obstacles) {
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
    const ph = this.isMat ? playerHitbox(this.py, MAT_HITBOX_H[matPhase(this.stageProgress)]) : playerHitbox(this.py)
    if (this.invincible === 0 && this.debugMode === 0) {
      for (const o of this.obstacles) {
        if (o.spent) continue
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
        // しなる（材料工学科）：板バネに当たると曲がって、形が戻る反動で前へ加速する
        if (this.isMat && o.bendable && this.matState === 'flex') {
          this.bendSpring(o)
          continue
        }
        // かたい（材料工学科）：もろい結晶壁を砕いて通過する（加速はしない）
        if (this.isMat && o.breakable && this.matState === 'hard') {
          this.obstacles = this.obstacles.filter(x => x !== o)
          this.burst(o.x + o.w / 2, o.y + o.h / 2, '#ff7aff', 16)
          this.burst(o.x + o.w / 2, o.y + o.h * 0.2, MAT_HARD_COLOR, 8)
          playKnockback()
          continue
        }
        // バリア（生物応用化学科）：保持中なら1回だけ被弾を無効化して通過。
        // 消費して無敵フレームを付与し、当たったパイプをそのまま通り抜けられるようにする。
        if (this.isBio && this.bioShield) {
          this.bioShield = false
          this.invincible = KNOCKBACK_INVINCIBLE
          this.burst(PLAYER_X, this.py, SHIELD_COLOR, 18)
          playJump()
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

  // アイテム取得判定：🔋電池（電気電子）／🛡バリア（生物応化）／🔥炉・💧水槽（材料）。看板は判定なし。
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
        playJump()
        break
      case 'furnace':
      case 'quench': {
        // 熱処理ゲート：🔥炉で「しなる」、💧水槽で「かたい」になる
        const kind = it.effect === 'furnace' ? 'flex' : 'hard'
        this.matState = kind
        this.matStateUntilX = it.stageX - HEAT_GATE_OFFSET + HEAT_STATE_SPAN[kind]
        this.burst(it.x, it.y, kind === 'flex' ? MAT_FLEX_COLOR : MAT_HARD_COLOR, 16)
        playJump()
        break
      }
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

  private get effectiveSpeed(): number {
    if (this.revivalTimer > 0) return this.isBio ? BIO_SPEED_START : SPEED_START
    // 材料工学科：板バネで曲がっている間は減速 → 形が戻ると加速。結晶壁の迂回は減速。
    if (this.isMat) {
      let s = this.currentSpeed
      if (this.bendTimer > 0) s *= 0.6
      else if (this.boostTimer > 0) s *= this.boostMult
      if (this.matSlowTimer > 0) s *= MAT_SLOW_MULT
      return s
    }
    // デバッグモード中（電子情報）はスクロール加速＝タイム短縮ボーナス
    return this.debugMode > 0 ? this.currentSpeed * DEBUG_SPEED_MULT : this.currentSpeed
  }

  // 材料工学科：毎フレームの工程・状態・タイマー処理と、熱処理セットのスポーン
  private updateMat() {
    const phase = matPhase(this.stageProgress)
    const idx = MAT_PHASE_ORDER.indexOf(phase)
    // 工程カットイン：初めてその工程に入ったときだけ（ノックバックで戻って再突入しても出さない）
    if (idx > this.maxMatPhaseIdx) {
      this.maxMatPhaseIdx = idx
      this.cutinPhase = phase
      this.cutinTimer = MAT_CUTIN_FRAMES
      if (idx > 0) this.burst(PLAYER_X, this.py - 20, AREAS[5].groundLineColor, 14)
    }
    if (this.cutinTimer > 0) this.cutinTimer--

    // 熱処理の状態はセットを抜けたら通常に戻る（stageX 基準なので速度が変わってもずれない）
    if (this.matState !== 'normal' && this.stageProgress > this.matStateUntilX) this.matState = 'normal'

    if (this.bendTimer > 0 && --this.bendTimer === 0) this.boostTimer = MAT_BOOST_FRAMES
    else if (this.boostTimer > 0) this.boostTimer--
    if (this.matSlowTimer > 0) this.matSlowTimer--

    for (const o of this.obstacles) {
      if (o.bend) o.bend = Math.max(0, o.bend - 1 / MAT_BEND_FRAMES)
      // 結晶壁を砕かずに越えた（迂回した）→ 着地先の減速
      if (o.breakable && !o.spent && o.x + o.w < PLAYER_X - 12) {
        o.spent = true
        this.matSlowTimer = MAT_SLOW_FRAMES
      }
    }

    // 熱処理セット：看板 → ゲート → 課題。最初の1回は炉を地上に置いて「しなる」を必ず体験させる
    const heatEnd = MAT_PHASE_START.inspect * STAGE_LENGTH - MAT_SAFE_MARGIN
    if (this.stageProgress + CANVAS_W >= this.nextHeatSetX && this.nextHeatSetX + HEAT_STATE_SPAN.flex < heatEnd) {
      const forced = this.heatSetCount === 0
      let kind: 'flex' | 'hard' = forced ? 'flex' : Math.random() < 0.5 ? 'flex' : 'hard'
      if (!forced && kind === this.lastHeatKind && this.heatKindStreak >= 2) kind = kind === 'flex' ? 'hard' : 'flex'
      this.heatKindStreak = kind === this.lastHeatKind ? this.heatKindStreak + 1 : 1
      this.lastHeatKind = kind
      spawnHeatSet(this.nextHeatSetX, kind, forced, this.obstacles, this.items, this.getGroundHeightAt(this.nextHeatSetX))
      this.heatSetCount++
      const [mn, r] = HEAT_SET_GAP
      this.nextHeatSetX += mn + Math.random() * r
    }
  }

  // 材料工学科：区間境界の前後（安全区間）にかからないか
  private isMatSafeToSpawn(stageX: number, width: number): boolean {
    for (const b of matBoundaries()) {
      if (stageX + width > b.x - MAT_SAFE_MARGIN && stageX < b.x + MAT_SAFE_MARGIN) return false
    }
    return true
  }

  // しなる（材料工学科）：板バネを曲げる。上から勢いよく当たるほど、形が戻ったときの加速が大きい
  private bendSpring(o: Obstacle) {
    o.spent = true
    o.bend = 1
    this.bendTimer = MAT_BEND_FRAMES
    this.boostTimer = 0
    this.boostMult = Math.min(MAT_BOOST_MAX, 1.15 + Math.abs(this.pvy) * 0.02)
    this.burst(o.x + o.w / 2, o.y + 10, '#ffd34d', 12)
    playJump()
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

  // 区間 [stageX, stageX+width] が同じ高さの平坦な地面か（段差・階段の途中に障害物を出さないため）
  private isFlatAt(stageX: number, width: number): boolean {
    const base = this.getGroundHeightAt(stageX)
    for (let dx = 30; dx <= width; dx += 30) {
      if (this.getGroundHeightAt(stageX + dx) !== base) return false
    }
    return true
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
    // スイム（生物応用化学）は上下の慣性をリセットして復帰を安定させる
    // （壁ヒットは updateBio 側で既に 0 にしているが、パイプ衝突経路もここで揃える）
    if (this.isBio) this.pvy = 0
    // 材料工学科：曲げ・加速・減速の途中状態は持ち越さない
    this.bendTimer = 0; this.boostTimer = 0; this.matSlowTimer = 0
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

  // 踏みつけ（電子情報）：バグを倒してバウンド、ゲージを伸ばす。満タンでデバッグモード突入。
  private stomp(o: Obstacle) {
    this.obstacles = this.obstacles.filter(x => x !== o)
    this.pvy = STOMP_BOUNCE
    this.jumpCount = 1
    this.pState = 'jumping'
    this.combo++
    this.burst(o.x + o.w / 2, o.y, AREAS[3].groundLineColor, 8)
    playJump()
    if (this.combo >= COMBO_NEEDED) {
      this.debugMode = DEBUG_FRAMES
      this.combo = 0
      this.burst(PLAYER_X, this.py - 30, '#00ffcc', 18)
    }
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
    const bg: BgContext = { frame: this.frame, bgX: this.bgX, speed: this.missOverlayTimer > 0 ? 0 : this.effectiveSpeed, debug: this.debugMode > 0, stageProgress: this.stageProgress, isBio: this.isBio }

    ctx.save()

    drawBg(ctx, this.departmentId as AreaId, theme, bg)
    if (this.isMat) {
      drawMatGround(ctx, theme, this.stageProgress)
    } else if (!this.isBio) {
      drawGround(ctx, theme, bg, this.terrain, this.stageProgress)
    }
    drawGoal(ctx, this.departmentId as AreaId, theme, this.stageProgress, this.frame)

    for (const o of this.obstacles) drawObstacle(ctx, o, theme, this.frame)

    for (const it of this.items) {
      if (it.effect === 'charge') drawBattery(ctx, it, theme, this.frame)
      else if (it.effect === 'shield') drawShieldItem(ctx, it, this.frame)
      else drawMatItem(ctx, it, this.frame)
    }

    for (const p of this.particles) {
      ctx.globalAlpha = p.life / p.maxLife
      ctx.fillStyle = p.color
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill()
    }
    ctx.globalAlpha = 1

    if (this.isMat) {
      drawMatPlayer(ctx, {
        py: this.py, pvy: this.pvy, phase: matPhase(this.stageProgress), state: this.matState,
        invincible: this.invincible, bendTimer: this.bendTimer, frame: this.frame,
      })
    } else {
      drawPlayer(ctx, theme.coinColor, {
        py: this.py, pState: this.pState, pvy: this.pvy,
        invincible: this.invincible, legPhase: this.legPhase,
        shield: this.isBio ? this.bioShield : false, frame: this.frame,
        bio: this.isBio
      })
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
      drawMatHud(ctx, theme, matPhase(this.stageProgress), this.matSlowTimer > 0)
      if (this.cutinTimer > 0) drawMatCutin(ctx, theme, this.cutinPhase, this.cutinTimer, MAT_CUTIN_FRAMES)
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
