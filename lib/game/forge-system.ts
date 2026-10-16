import {
  PLAYER_X, STAGE_LENGTH,
  FORGE_RING_OFFSET, FORGE_PERFECT, FORGE_GOOD_EARLY, FORGE_GOOD_LATE, FORGE_SWING_FRAMES,
  FORGE_EARLY_LIMIT, FORGE_COOLDOWN, FORGE_HITSTOP,
  FORGE_CUTIN_FRAMES, FORGE_TUTORIAL_WAIT,
} from './constants'
import type { Obstacle } from './engine-types'
import type { ForgeJudge } from './mat-renderers'

export interface ForgeStrikeCallbacks {
  onHitStop: (frames: number) => void
  burst: (x: number, y: number, color: string, count: number) => void
  playHitSound: () => void
}

/**
 * 材料工学科（鍛えてカン！）専用の状態・判定管理クラス
 */
export class ForgeSystem {
  combo = 0             // PERFECT/GOOD の連続回数
  maxCombo = 0
  hits = 0              // 叩いた塊の数（チュートリアルの文字を消す判断に使う）
  strikeCooldown = 0    // 空振り後の硬直の残りフレーム
  swingTimer = 0        // ハンマーを振っている残りフレーム
  judge: ForgeJudge | null = null
  judgeTimer = 0
  holding = false       // チュートリアルで世界を遅くして待っているか
  wait = 0              // 待っているフレーム数
  shake = 0             // PERFECT の画面の揺れ
  maxZone = 0           // 到達した最も先の区間（カットインは初到達時のみ）
  cutinTimer = 0
  cutinZone = 0

  clone(): ForgeSystem {
    return Object.assign(new ForgeSystem(), this)
  }

  /** ヒットストップ中も進める演出タイマー */
  tickVisualTimers() {
    if (this.swingTimer > 0) this.swingTimer--
    if (this.judgeTimer > 0) this.judgeTimer--
    if (this.shake > 0) this.shake--
  }

  /** 通常ステップでのクールダウン・チュートリアル待機更新 */
  tickStep(obstacles: Obstacle[], baseSpeed: number, isMat: boolean) {
    if (this.strikeCooldown > 0) this.strikeCooldown--
    if (isMat) this.updateHold(obstacles, baseSpeed)
  }

  /** 塊の中心が輪の中心に届くまでの残りフレーム（小数）。正の値は「まだ届いていない＝早い」 */
  ingotT(o: Obstacle, speed: number): number {
    return (o.x + o.w / 2 - (PLAYER_X + FORGE_RING_OFFSET)) / speed
  }

  /** チュートリアル：最初の2個は、輪に近づいたら世界を遅くして待つ（最大 FORGE_TUTORIAL_WAIT フレーム） */
  private updateHold(obstacles: Obstacle[], baseSpeed: number) {
    const target = obstacles.find(o => o.tutorial && !o.struck)
    if (
      target &&
      this.wait < FORGE_TUTORIAL_WAIT &&
      this.ingotT(target, baseSpeed) <= FORGE_GOOD_EARLY
    ) {
      this.holding = true
      this.wait++
      return
    }
    this.holding = false
    if (target && this.wait >= FORGE_TUTORIAL_WAIT) {
      // 待っても叩かなかったので通常の速さに戻す（次のチュートリアルの塊のために待ち時間も戻す）
      target.tutorial = false
      this.wait = 0
    }
  }

  /** ハンマーで叩く。タップ（スペース・↑・クリック）はすべてここに来る */
  strike(
    obstacles: Obstacle[],
    effectiveSpeed: number,
    inHitStop: boolean,
    cb: ForgeStrikeCallbacks,
  ) {
    // PERFECT のヒットストップ中と、空振り後の硬直中のタップは捨てる（先行入力にしない）
    if (inHitStop || this.strikeCooldown > 0) return
    this.swingTimer = FORGE_SWING_FRAMES

    // 待機中のチュートリアルは、いつ叩いても PERFECT 扱い
    if (this.holding) {
      const tutorial = obstacles.find(o => o.tutorial && !o.struck)
      if (tutorial) {
        this.hitIngot(tutorial, 'perfect', cb)
        return
      }
    }

    // まだ叩いていない塊のうち、判定を過ぎきっていない（t >= -GOOD_LATE）一番近いものを選ぶ
    let target: Obstacle | null = null
    let tNear = Infinity
    for (const o of obstacles) {
      if (o.struck || o.shape !== 'hot_ingot') continue
      const t = this.ingotT(o, effectiveSpeed)
      if (t >= -FORGE_GOOD_LATE && t < tNear) {
        tNear = t
        target = o
      }
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
    this.hitIngot(target, Math.abs(tNear) <= FORGE_PERFECT ? 'perfect' : 'good', cb)
  }

  /** 塊を叩いて板にする */
  private hitIngot(o: Obstacle, kind: 'perfect' | 'good', cb: ForgeStrikeCallbacks) {
    o.struck = true
    o.phase = 0
    o.tutorial = false
    this.hits++
    this.wait = 0
    this.holding = false
    this.combo++
    this.maxCombo = Math.max(this.maxCombo, this.combo)
    const cx = o.x + o.w / 2
    const cy = o.y + o.h / 2
    if (kind === 'perfect') {
      cb.onHitStop(FORGE_HITSTOP)
      this.shake = 6
      cb.burst(cx, cy, '#ffe9a0', 18)
      cb.burst(cx, cy, '#ff8a2a', 10)
      this.showJudge('perfect', 36)
      cb.playHitSound()
    } else {
      cb.burst(cx, cy, '#ff8a2a', 8)
      this.showJudge('good', 26)
      cb.playHitSound()
    }
  }

  showJudge(kind: ForgeJudge, frames: number) {
    this.judge = kind
    this.judgeTimer = frames
  }

  /** ミス（ノックバック）時のリセット処理 */
  onMiss(isMat: boolean) {
    this.combo = 0
    this.holding = false
    this.wait = 0
    if (isMat) this.showJudge('late', 50)
  }

  /** 区間（進み具合 25% ごと）の切り替わりカットイン更新（初到達時のみ発動） */
  updateZone(stageProgress: number, onEnterZone: () => void) {
    const zone = Math.min(3, Math.floor(Math.min(1, stageProgress / STAGE_LENGTH) * 4))
    if (zone > this.maxZone) {
      this.maxZone = zone
      this.cutinZone = zone
      this.cutinTimer = FORGE_CUTIN_FRAMES
      onEnterZone()
    }
    if (this.cutinTimer > 0) this.cutinTimer--
  }

  /** 次の塊が輪に届くまでの残りフレーム（炉の脈動用）。置いていない塊は予定キューから引く */
  nextArrival(
    obstacles: readonly Obstacle[],
    baseSpeed: number,
    queue: readonly { remaining: number }[],
  ): number {
    let best = Infinity
    for (const o of obstacles) {
      if (o.struck || o.shape !== 'hot_ingot') continue
      const t = this.ingotT(o, baseSpeed)
      if (t >= 0 && t < best) best = t
    }
    if (queue.length > 0) best = Math.min(best, Math.max(0, queue[0].remaining))
    return best
  }
}
