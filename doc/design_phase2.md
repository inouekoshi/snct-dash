# Phase 2 実装設計書（レビュー反映済み）

## 概要

旧仕様（エンドレスランナー・シールド制・スコア制）を新仕様（タイムアタック制・ノックバック制・地形システム）に全面移行する。

---

## 変更ファイル一覧

| ファイル | 種別 | 変更内容 |
|---------|------|---------|
| `lib/game/constants.ts` | 全面書き換え | 旧定数を削除、新定数を追加 |
| `lib/game/engine-types.ts` | 変更 | Coin/ShieldDrop削除、TerrainSegment/Item追加 |
| `lib/game/terrain.ts` | 新規作成 | 地形生成ロジック |
| `lib/game/engine.ts` | 全面書き換え | 新仕様ゲームループ |
| `lib/game/spawner.ts` | 変更 | コイン/シールドスポーン削除、departmentId対応・stageX付与 |
| `lib/game/hud-renderer.ts` | 変更 | スコア→タイマー、進捗バー更新 |
| `lib/game/areas.ts` | 変更 | テーマ定義は残す（AreaId/AreaThemeはそのまま流用） |
| `lib/game/sound.ts` | 変更 | playGameOver/playCoin/playShieldGet/playAreaChange削除、playKnockback/playClear追加 |
| `lib/game/background-renderers.ts` | 変更 | drawGround()にTerrainSegment[]を渡して段差・穴を視覚表現 |
| `components/Game.tsx` | 変更 | departmentId受取、onClearコールバック(GameClearResult)に変更 |
| `components/DepartmentSelect.tsx` | 新規作成 | 学科選択UI |
| `components/ResultModal.tsx` | 全面書き換え | タイム表示・/api/stage-clearsにPOST |
| `components/Leaderboard.tsx` | 全面書き換え | 学科別タブ・タイム表示 |
| `app/game/page.tsx` | 変更 | フェーズに'department'を追加 |
| `app/api/stage-clears/route.ts` | 新規作成 | クリアタイム登録 |
| `app/api/leaderboard/route.ts` | 新規作成 | 学科別ランキング取得 |
| `app/api/scores/route.ts` | 削除 | 旧スコアAPI |

---

## 1. constants.ts（全面書き換え）

```typescript
// キャンバス・プレイヤー（変更なし）
export const CANVAS_W = 800
export const CANVAS_H = 280
export const PLAYER_X = 110
export const GRAVITY = 0.65
export const JUMP_VY = -13.5

// 地面（デフォルト。TerrainSegmentのgroundYで上書き可能）
export const DEFAULT_GROUND_Y = 220

// ステージ
export const STAGE_LENGTH = 6000    // クリアまでの進捗距離（px単位）
export const SPEED_START   = 4      // 序盤の速度（px/frame）
export const SPEED_END     = 15     // 終盤の速度（px/frame）

// ノックバック
export const KNOCKBACK_AMOUNT     = 120  // 障害物ヒット時の後退量
export const HOLE_KNOCKBACK       = 200  // 穴落下時の後退量
export const KNOCKBACK_INVINCIBLE = 90   // ノックバック後の無敵フレーム数

// 障害物スポーン間隔（[最小, ランダム幅] frames）
// departmentId 1〜5 対応（インデックス0は未使用）
export const SPAWN_GAPS: [number, number][] = [
  [0, 0], [110, 60], [85, 50], [65, 40], [50, 32], [36, 26],
]

// フェアネス機構（変更なし）
export const COYOTE_FRAMES      = 5
export const JUMP_BUFFER_FRAMES = 8
export const HIT_STOP_FRAMES    = 6

// 地形
export const MIN_STEP_HEIGHT   = 30  // 自動乗り越え段差の最大高さ
export const STEP_FOLLOW_SPEED = 8   // 段差追随速度（px/frame）
```

---

## 2. engine-types.ts（変更）

```typescript
export type PlayerState = 'running' | 'jumping' | 'falling'
// 'dead'を'falling'に変更（穴落下中の状態として流用）

export interface Obstacle {
  shape: 'gear' | 'bolt' | ... // 変更なし
  stageX: number  // ★追加：ステージ上の固定位置（ノックバック後の再計算に使用）
  x: number       // Canvas上の現在位置（stageX - stageProgress + PLAYER_X で計算）
  y: number; w: number; h: number
  moving: boolean; phase: number; baseY: number; amplitude: number
}

// 地形セグメント（discriminated union）
export type TerrainSegment =
  | { type: 'ground'; stageX: number; width: number; groundY: number }
  | { type: 'hole';   stageX: number; width: number }

export interface Item {
  stageX: number
  x: number  // Canvas上の現在位置
  y: number
  effect: 'time_stop' | 'invincible'
  wobble: number
}

export interface Particle {
  x: number; y: number; vx: number; vy: number
  life: number; maxLife: number; color: string; size: number
}
```

---

## 3. 座標管理の基本方針（重要）

**stageXベースの再計算方式を採用する。**

```
Canvas上のX座標 = PLAYER_X - stageProgress + stageX
```

- `stageX`：ステージ上の固定位置（生成時に決定、変化しない）
- `stageProgress`：プレイヤーの進捗（毎フレーム速度を加算）
- ノックバック時は`stageProgress`を減らすだけ → 全オブジェクトのCanvasX座標が自動で正しくなる

```typescript
// engine.ts内のヘルパー
private toCanvasX(stageX: number): number {
  return PLAYER_X - this.stageProgress + stageX
}
```

この方式のメリット：
- ノックバック処理が`this.stageProgress -= amount`の1行で完了
- 浮動小数点誤差の累積がない
- ステージ全体を事前生成してデバッグしやすい

---

## 4. terrain.ts（新規作成）

ゲーム開始時にSTAGE_LENGTH分の地形を一括生成する（動的生成はしない）。

```typescript
export function buildStage(departmentId: number): TerrainSegment[] {
  const segments: TerrainSegment[] = []
  let cursor = 0

  // 最初の安全地帯（プレイヤー初期位置）
  segments.push({ type: 'ground', stageX: 0, width: 400, groundY: DEFAULT_GROUND_Y })
  cursor = 400

  while (cursor < STAGE_LENGTH - 500) {
    // 平坦な地面 → 穴 or 段差 → 繰り返し
    const groundWidth = 250 + Math.random() * 200
    segments.push({ type: 'ground', stageX: cursor, width: groundWidth, groundY: DEFAULT_GROUND_Y })
    cursor += groundWidth

    const r = Math.random()
    if (r < 0.4) {
      // 穴：幅100〜180px
      const w = 100 + Math.random() * 80
      segments.push({ type: 'hole', stageX: cursor, width: w })
      cursor += w
    } else {
      // 段差（Phase 3で学科別に差別化）
      // ※Phase 2では段差なし（全てDEFAULT_GROUND_Y）
      cursor += 0
    }
  }

  // ゴール前の安全地帯
  segments.push({ type: 'ground', stageX: cursor, width: STAGE_LENGTH + CANVAS_W - cursor, groundY: DEFAULT_GROUND_Y })
  return segments
}
```

Phase 2では段差はなし・穴のみ実装。Phase 3で学科別の地形パターンに差別化する。

---

## 5. engine.ts（全面書き換え）

### コンストラクタ

```typescript
class GameEngine {
  constructor(
    canvas: HTMLCanvasElement,
    departmentId: number,
    onClear: (result: GameClearResult) => void  // timeMs + departmentId
  )
}
```

### 状態変数

**削除するもの**
- `score`, `multiplier`, `multiplierJustUp`, `coinCombo`, `coinComboTimer`
- `shield`, `shieldDrops`, `nextShield`
- `coins`, `nextCoin`
- `area`, `maxArea`, `areaTimer`, `prevArea`, `transAlpha`, `noMiss`, `lap`
- `isOver`（ゲームオーバーなし）

**追加するもの**
- `departmentId: number`
- `stageProgress = 0`：0〜STAGE_LENGTH
- `elapsedMs = 0`：累積タイム（毎フレーム加算。ポーズ中・hitStop中は加算しない）
- `terrain: TerrainSegment[]`
- `currentGroundY = DEFAULT_GROUND_Y`
- `targetGroundY = DEFAULT_GROUND_Y`
- `items: Item[]`
- `nextItem: number`
- `itemEffect: 'time_stop' | 'invincible' | null = null`
- `itemEffectTimer = 0`
- `isCleared = false`
- `isPaused = false`（ポーズは存続）

### タイマー管理

```typescript
// performance.now()は使わない
// 毎フレームのdelta時間（60fps = 16.67ms）を加算する
// ポーズ中・hitStop中・time_stop中は加算しない
private update() {
  if (this.isPaused) return
  if (this.hitStopTimer > 0) { this.hitStopTimer--; return }

  // time_stopアイテム中はタイマーを進めない
  if (this.itemEffect !== 'time_stop') {
    this.elapsedMs += 1000 / 60  // 約16.67ms/frame
  }
  // ...
}
```

### 速度計算

```typescript
private get currentSpeed(): number {
  const t = Math.min(this.stageProgress / STAGE_LENGTH, 1)
  return SPEED_START + (SPEED_END - SPEED_START) * t
}
```

### 地形判定

```typescript
private getSegmentAt(playerStageX: number): TerrainSegment | null {
  for (const seg of this.terrain) {
    if (seg.stageX <= playerStageX && playerStageX < seg.stageX + seg.width) {
      return seg
    }
  }
  return null
}

private getGroundYAt(playerStageX: number): number {
  const seg = this.getSegmentAt(playerStageX)
  if (!seg || seg.type === 'hole') return Infinity
  return seg.groundY
}
```

`playerStageX = this.stageProgress`（プレイヤーはCanvas上でPLAYER_X固定）

### 段差の自動乗り越え

```typescript
this.targetGroundY = this.getGroundYAt(this.stageProgress)
if (this.targetGroundY !== Infinity) {
  const diff = this.targetGroundY - this.currentGroundY
  this.currentGroundY += Math.sign(diff) * Math.min(Math.abs(diff), STEP_FOLLOW_SPEED)
}
```

### 着地判定

```typescript
// py >= currentGroundY で着地（固定のGROUND_Yではなく）
if (this.py >= this.currentGroundY) {
  this.py = this.currentGroundY
  this.pvy = 0
  this.jumpCount = 0
  this.coyoteTime = COYOTE_FRAMES
  if (this.jumpBuffer > 0) { this.jumpBuffer = 0; this.performJump() }
}
```

### 穴落下処理

```typescript
// targetGroundY === Infinity の場合、着地なし
// py > DEFAULT_GROUND_Y + 15 で落下確定
// ※ CANVAS_H + 30 では高速時に穴を渡り切ってしまうため修正済み
if (this.targetGroundY === Infinity && this.py > DEFAULT_GROUND_Y + 15) {
  this.knockback(HOLE_KNOCKBACK)
  this.py = this.currentGroundY  // 着地位置に戻す
  this.pvy = -4  // 弾む演出
  this.pState = 'jumping'
  this.jumpCount = 1
}
```

### ノックバック

```typescript
private knockback(amount: number) {
  // stageProgressを戻すだけ。全Canvas座標はtoCanvasX()で自動再計算される
  this.stageProgress = Math.max(0, this.stageProgress - amount)
  this.invincible = KNOCKBACK_INVINCIBLE
  this.hitStopTimer = HIT_STOP_FRAMES
  playKnockback()
  this.burst(PLAYER_X, this.py - 20, '#ff8800', 10)
}
```

### クリア判定

```typescript
if (this.stageProgress >= STAGE_LENGTH && !this.isCleared) {
  this.isCleared = true
  cancelAnimationFrame(this.raf)
  playClear()
  setTimeout(() => this.onClear({ timeMs: this.elapsedMs, departmentId: this.departmentId }), 500)
}
```

### render()内でのCanvas座標変換

```typescript
// 全オブジェクトのCanvasX = toCanvasX(stageX)で取得
private render() {
  for (const seg of this.terrain) {
    const canvasX = this.toCanvasX(seg.stageX)
    drawTerrainSegment(ctx, seg, canvasX, ...)
  }
  for (const o of this.obstacles) {
    o.x = this.toCanvasX(o.stageX)  // 毎フレームCanvas座標を更新
    drawObstacle(ctx, o, ...)
  }
}
```

---

## 6. background-renderers.ts（変更）

```typescript
// drawGround()にTerrainSegmentと地形情報を渡す
export function drawGround(
  ctx: CanvasRenderingContext2D,
  theme: Theme,
  bg: BgContext,
  terrain: TerrainSegment[],
  stageProgress: number
)
```

- `type === 'ground'` のセグメント → 地面を描画
- `type === 'hole'` のセグメント → その位置は地面を描画しない（穴として空白）
- 段差の縦面も描画（Phase 3で段差を実装したタイミングで追加）

---

## 7. sound.ts（変更）

```typescript
// 削除
// playGameOver(), playCoin(), playShieldGet(), playAreaChange()

// 追加
export function playKnockback() { /* 衝突音 */ }
export function playClear()     { /* クリア音 */ }

// 残す
export function playJump()      { /* 変更なし */ }
export function playHurt()      { /* 変更なし（knockback内で使用） */ }
```

---

## 8. hud-renderer.ts（変更）

```typescript
export interface HudState {
  elapsedMs: number
  stageProgress: number
  invincible: number
  departmentId: number  // AREAS[departmentId as AreaId] でテーマ取得
}

function formatTime(ms: number): string {
  const m = Math.floor(ms / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  const cs = Math.floor((ms % 1000) / 10)
  return `${m}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`
}
```

HUDに表示するもの：
- 左：`formatTime(elapsedMs)` （タイマー）
- 中央：学科名・絵文字
- 右：進捗バー（stageProgress / STAGE_LENGTH）
- 無敵フラッシュオーバーレイ（変更なし）

---

## 9. 画面フロー変更

```
旧: nickname → playing → result
新: nickname → department → playing → result
```

### game/page.tsx のPhase追加

```typescript
type Phase = 'nickname' | 'department' | 'playing' | 'result'
const [departmentId, setDepartmentId] = useState<number>(1)
```

### onClear のデータフロー

```
GameEngine.onClear(GameClearResult)
  → Game.tsx が受け取りpage.tsxのhandleClear(result)を呼ぶ
  → ResultModal に result を渡す
```

`departmentId` はengineがコールバックに含めて返す（`GameClearResult.departmentId`）。

---

## 10. DepartmentSelect.tsx（新規）

```typescript
interface Props {
  onSelect: (departmentId: number) => void
  onBack: () => void
}
```

5学科をグリッド表示。`areas.ts` の `AREAS` からテーマ（emoji, name, color）を流用する。

---

## 11. ResultModal.tsx（全面書き換え）

- `result: GameClearResult`（timeMs, departmentId）を受け取る
- `POST /api/stage-clears` に nickname + department + clear_time_ms を送信
- タイム表示（mm:ss.xx形式）
- ランキングへのリンク（`/leaderboard?department=N`）

---

## 12. Leaderboard.tsx（全面書き換え）

- 学科タブ（1〜5）で絞り込み
- `GET /api/leaderboard?department=N` を呼ぶ
- `StageClearEntry` の `clear_time_ms` を `mm:ss.xx` でフォーマット表示
- TOP10表示（クリアタイム昇順）

---

## 13. APIルート

### /api/stage-clears（新規 POST）

```typescript
// バリデーション
// nickname: 1〜20文字、前後空白除去後も1文字以上
// department: 1〜5 の整数
// clear_time_ms: 1〜600000（10分上限）の整数
// → Supabase stage_clears テーブルに INSERT
```

### /api/leaderboard（新規 GET）

```typescript
// ?department=N (1〜5) でフィルタ
// department未指定 or 不正値 → 400エラー
// clear_time_ms ASC, LIMIT 10
// 旧 /api/leaderboard と /api/scores は削除
```

---

## 14. 実装順序（改訂版）

```
Step 1: constants.ts + engine-types.ts
        → 型と定数の土台。他の全ファイルがこれに依存する

Step 2: terrain.ts
        → 地形生成ロジックを単体で完成させてからengineに組み込む

Step 3: engine.ts 全面書き換え（sound.tsの更新も同時）
        → 地形・ノックバック・クリア判定が動く最小構成

Step 4: background-renderers.ts + hud-renderer.ts
        → 段差・穴の視覚表現、タイマー・進捗バーのHUD

Step 5: Supabase stage_clearsテーブル作成
        → DB→APIの経路を先に通しておく

Step 6: /api/stage-clears + /api/leaderboard
        → APIルートを実データで動作確認

Step 7: Game.tsx + game/page.tsx + DepartmentSelect.tsx
        → UIフローを繋げる（学科選択→ゲーム→リザルト）

Step 8: ResultModal.tsx + Leaderboard.tsx
        → 実データで全フロー確認
```

---

## 15. アイテムについて

Phase 2ではアイテムの骨格（型定義・state変数）のみ持つ。スポーンはしない。

- `Item` 型（engine-types.ts）
- `items: Item[]`, `itemEffect`, `itemEffectTimer`（engine.ts）
- `time_stop` 中は `elapsedMs` を加算しない（累積加算方式なので対応済み）
- 実際のスポーンはPhase 3で学科固有アイテムと同時実装

---

## 16. 既知の制約・将来対応

| 項目 | 内容 | 対応フェーズ |
|------|------|---------|
| 同一プレイヤー最速タイムのみ | 複数回プレイで上位を独占できる | Phase 4（スパム対策と同時） |
| Delta-time補正 | 低FPS端末でタイムが端末依存になる | Phase 4（パフォーマンス保証） |
| 段差の視覚表現（縦面） | Phase 2では穴のみ、段差なし | Phase 3（学科別地形） |
