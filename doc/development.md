# 開発ガイド

このドキュメントはゲームの拡張・改修を行う開発者向けのガイドです。

## 目次

- [ゲームエンジンの構造](#ゲームエンジンの構造)
- [地形システム](#地形システム)
- [ノックバック・MISSシステム](#ノックバックmissシステム)
- [ゴールレンダラー](#ゴールレンダラー)
- [新しいアイテムを追加する](#新しいアイテムを追加する)
- [障害物の種類を追加する](#障害物の種類を追加する)
- [ゲームバランスの調整](#ゲームバランスの調整)
- [よくあるトラブル](#よくあるトラブル)

---

## ゲームエンジンの構造

`lib/game/engine.ts` の `GameEngine` クラスがゲームロジック全体を管理します。

### 初期化

```typescript
const engine = new GameEngine(
  canvasElement,
  departmentId,                       // 1〜5 の学科ID
  (result: GameClearResult) => { ... } // クリア時コールバック（{ timeMs, departmentId }）
)
```

### ゲームループ

```
start() → requestAnimationFrame
  └── loop()
        ├── update()  物理演算・衝突判定・スポーン処理・進捗更新
        └── render()  Canvas への描画
```

`update()` と `render()` は 60fps を目標に呼ばれます。

### 座標系

Canvas の左上が原点 `(0,0)`、Y軸は下方向が正です。

```
(0,0) ────────────────→ x (800)
  │
  │   [背景]
  │
  │   地面Y は TerrainSegment.groundY で決まる（可変）
  │   ════════════════  ← 地面ライン（段差で高さが変わる）
  │   [地面]
  ↓
y (280)
```

- プレイヤーの `py`（y座標）は**プレイヤーの底辺**を指します
- ジャンプ中は `py < currentGroundY`、着地すると `py = currentGroundY` にクランプ
- 穴の上では着地判定なし → 落下

### 当たり判定

障害物との衝突は AABB（Axis-Aligned Bounding Box）で判定します。
実際の障害物より内側 4px でヒットボックスを作ることで、見た目より少し当たり判定が小さくなっています。

```typescript
overlaps(ph, { x: o.x + 4, y: o.y + 4, w: o.w - 8, h: o.h - 8 })
```

アイテム（電気電子の🔋電池）との衝突も AABB（`overlaps()`）で判定します。
円形判定の `hitCircle()` も `helpers.ts` に用意されています（現在は未使用）。

---

## 地形システム

### TerrainSegment 型

```typescript
type TerrainSegment =
  | { type: 'ground'; stageX: number; width: number; groundY: number }
  | { type: 'hole';   stageX: number; width: number }
```

- `stageX`：ステージ上の固定位置（生成時に決定し、以後変化しない）
- `type === 'hole'` には `groundY` がない（discriminated union）

### 座標管理の基本方針

ゲーム内の全オブジェクトは **`stageX`（ステージ上の固定座標）** と **`stageProgress`（プレイヤーの進捗）** からCanvas座標を毎フレーム計算します。

```
Canvas上のX座標 = PLAYER_X + (stageX - stageProgress)
```

- オブジェクト自身の `x` は毎フレーム `toCanvasX(stageX)` で上書きされる
- `terrain` は `stageX` で管理されるため、スクロールさせる必要がない
- ノックバック時は `stageProgress` を減らすだけ → 全オブジェクトの位置が自動で正しくなる

### 仕組み

- プレイヤーは画面上 `PLAYER_X = 110` に固定（動かない）
- 「世界がプレイヤーの方に流れてくる」表現
- プレイヤー直下の `stageProgress` でどのセグメントにいるかを判定
- `type === 'hole'` のセグメントでは着地判定なし → 落下 → 穴落下演出 → MISS
- 段差（`groundY` が変わるセグメント）は `currentGroundY` を `STEP_FOLLOW_SPEED` ずつなめらかに追随
- 上り段差の縦面には `isBlockedByStep()` で壁判定 → ジャンプなしでは段差境界でスクロールが止まる

### 地形の追加（`lib/game/terrain.ts`）

学科ごとの地形パターンはこのファイルで定義します。`buildStage()` が `departmentId` で分岐します。

```typescript
export function buildStage(departmentId: number): TerrainSegment[] {
  if (departmentId === 1) return buildStageMech()  // 機械：穴なし・山登り階段
  if (departmentId === 2) return buildStageElec()  // 電気電子：完全な平坦（充電サバイバル）
  return buildStageDefault()                       // その他：標準の穴配置
}
```

- `buildStageMech()`：落とし穴を使わず、2〜4段の「山型階段」を積み上げる（`STEP_H = 40`）
- `buildStageElec()`：穴も段差も無い1本の平坦地面。プレイヤーは充電維持＋障害物回避に集中する
- `buildStageDefault()`：平坦な地面と穴（幅110px以上）を交互に配置

---

## ノックバック・MISSシステム

障害物ヒット時・穴落下時に `knockback(amount)` が呼ばれます。

```typescript
private knockback(amount: number) {
  this.stageProgress    = Math.max(0, this.stageProgress - amount)
  this.missProgressLost = amount              // オーバーレイに表示する後退量
  this.invincible       = KNOCKBACK_INVINCIBLE
  this.hitStopTimer     = HIT_STOP_FRAMES     // 6f = 0.1秒の衝撃感演出
  this.missOverlayTimer = MISS_OVERLAY_FRAMES // 90f = 1.5秒の MISS 表示
  this.revivalTimer     = REVIVAL_FRAMES      // 75f = 1.25秒の復活スロー
  playKnockback()
  this.burst(PLAYER_X, this.py - 20, '#ff8800', 10)
}
```

### ミス〜復活タイマーの流れ

```
hitStopTimer (6f)  → update() を丸ごとスキップ（frame は進む）
  ↓ 完了
missOverlayTimer (90f)  → 物理演算・スポーンをスキップ。赤オーバーレイを描画
  ↓ 完了
revivalTimer (75f)  → effectiveSpeed が SPEED_START に固定される
  ↓ 完了
通常速度に戻る
```

- `missOverlayTimer > 0` の間は jump() を受け付けない
- `revivalTimer > 0` の間はスコア計算用の速度 `effectiveSpeed` が `SPEED_START` で固定される
- `stageProgress` を戻すだけで全オブジェクトのCanvas座標は次フレームの `toCanvasX()` で自動修正される

### 穴落下の専用フロー（`isFallingIntoHole`）

障害物ヒットとは異なり、穴落下には視覚的な落下演出がある。

```typescript
// ①: 地面から30px落ちたらフラグをセット（スクロール停止）
if (targetGroundY === Infinity && py > DEFAULT_GROUND_Y + 30 && !isFallingIntoHole) {
  isFallingIntoHole = true
}

// ②: 画面外（CANVAS_H + 60 = 340px）まで落ちたら knockback 発火
if (isFallingIntoHole && py > CANVAS_H + 60) {
  isFallingIntoHole = false
  knockback(HOLE_KNOCKBACK)
  ...
}
```

フラグがセットされている間は `stageProgress` を更新しない（`isBlockedByStep()` と同じ仕組み）。
世界が静止した状態でプレイヤーだけが重力で落下し、画面外に消えてから MISS 処理が走る。

### 段差壁ブロック（`isBlockedByStep()`）

上り段差に対してジャンプなしで接近した場合、スクロールを止めて壁として機能させる。

```typescript
private isBlockedByStep(): boolean {
  // 上り段差（20px以上）の境界に speed+3px 以内まで近づいており
  // プレイヤーが段差の上面より低い位置（py > curr.groundY + 5）にいるとき true を返す
}
```

`stageProgress` の更新条件: `!isFallingIntoHole && !isBlockedByStep()`

**「世界が前に流れる = プレイヤーが後退した見た目」** になります。
ノックバック量は `constants.ts` の `KNOCKBACK_AMOUNT` / `HOLE_KNOCKBACK` で調整できます。

---

## ゴールレンダラー

`lib/game/goal-renderer.ts` の `drawGoal()` がステージ終端のフラッグポールを描画します。

```typescript
drawGoal(ctx, areaId, theme, stageProgress, frame)
```

- `stageX = STAGE_LENGTH` の位置に台座・ポール・学科emoji入りの旗を描画
- 750px 以内に近づくとグロー強度が増しパルスアニメーション
- 450px 以内で「GOAL」テキストがフェードイン
- 旗は `Math.sin(frame * 0.12 + t * 3.5)` の波打ちアニメーション
- `canvasX < -100 || canvasX > 900` の範囲外は描画をスキップ

---

## アイテムシステム（電気電子=充電サバイバルの実装）

アイテムは `Item` 型（`engine-types.ts`）で定義され、`engine.ts` の `items: Item[]` で管理されます。
電気電子工学科の🔋電池（`effect: 'charge'`）が実装の参照例です。新しいアイテムも同じ流れで追加します。

### 1. `Item.effect` に種別を追加（`engine-types.ts`）

```typescript
export interface Item {
  stageX: number
  x: number; y: number
  effect: 'time_stop' | 'invincible' | 'charge'  // ← ここに追加
  wobble: number
}
```

### 2. スポーンする（`engine.ts` の `update()`）

スポーンタイマーをカウントダウンし、`stageX`（画面右端＝`stageProgress + CANVAS_W`）に push します。
電池は学科限定（`departmentId === 2`）でスポーンします。

```typescript
if (this.isElec && --this.nextBattery <= 0) {
  const nextStageX = this.stageProgress + CANVAS_W
  // 必ずジャンプしないと届かない高さ（74〜120px）に置く。走行中の判定上端は groundY-46 付近
  const y = this.getGroundHeightAt(nextStageX) - (74 + Math.random() * 46)
  this.items.push({ stageX: nextStageX, x: CANVAS_W + 10, y, effect: 'charge', wobble: Math.random() * Math.PI * 2 })
  const [mn, r] = BATTERY_GAP
  this.nextBattery = mn + Math.random() * r
}
```

### 3. 取得判定と効果（`engine.ts` の衝突判定ブロック）

毎フレーム `playerHitbox` と AABB（`overlaps()`）で重なりを判定し、効果を適用して配列から除去します。

```typescript
this.items = this.items.filter(it => {
  if (it.effect === 'charge' && overlaps(ph, { x: it.x - 11, y: it.y - 15, w: 22, h: 30 })) {
    this.charge = Math.min(CHARGE_MAX, this.charge + BATTERY_REFILL)
    this.burst(it.x, it.y, AREAS[2].coinColor, 8)  // 取得エフェクト
    return false
  }
  return true
})
```

`time_stop` / `invincible` のような時間効果型は `itemEffect` / `itemEffectTimer` を使う
（`time_stop` 中は `elapsedMs` を加算しない仕組みが既にある）。

### 4. 描画する（`item-renderer.ts` + `engine.ts` の `render()`）

`item-renderer.ts` に描画関数を追加し、`render()` の `items` ループから呼びます。

```typescript
for (const it of this.items) {
  if (it.effect === 'charge') drawBattery(ctx, it, theme, this.frame)
}
```

`it.x` / `it.y` は毎フレーム `toCanvasX()` で Canvas 座標に更新済み。`wobble` で上下のふわふわ揺れを付けます。

---

## 障害物の種類を追加する

### 1. `Obstacle` 型の `shape` に追加（`engine-types.ts`）

```typescript
interface Obstacle {
  shape: 'gear' | 'bolt' | /* ... */ | 'new_shape'
}
```

### 2. `drawObstacle()` に描画処理を追加（`obstacle-drawers.ts`）

```typescript
const drawFns: Record<Shape, DrawFn> = {
  // ...既存...
  new_shape: (ctx, o, theme) => {
    // Canvas API で描画
  },
}
```

### 3. スポーン関数で使用（`spawner.ts`）

```typescript
// push(o) は o.x の Canvas オフセット（CANVAS_W+10 基準）を stageX に変換して登録する
// groundY は地形の高さ（段差上なら DEFAULT_GROUND_Y より小さい値が渡る）
function spawnDept1(push: (o: ObstacleInit) => void, groundY: number) {
  const h = 50
  push({ x: CANVAS_W + 10, y: groundY - h, w: 35, h, shape: 'new_shape' })
}
```

複合障害物の場合は `x` に異なる offset を渡すことで正しい間隔に配置される：

```typescript
push({ x: CANVAS_W + 10,  y: groundY - h1, w: 24, h: h1, shape: 'wrench' })
push({ x: CANVAS_W + 72,  y: groundY - h2, w: 22, h: h2, shape: 'spring' })
// → 2つ目の stageX は 1つ目から 62px 先になる
```

---

## ゲームバランスの調整

主要な定数はすべて `lib/game/constants.ts` にあります。

### ステージ長・速度

```typescript
export const STAGE_LENGTH = 70000   // ゴールまでの距離（約2分20秒でクリア）
export const SPEED_START   = 4      // 序盤の速度（px/frame）
export const SPEED_END     = 15     // 終盤の速度（px/frame）
```

> **注意**: `STAGE_LENGTH` は現在 `15000`（約30秒・テスト用）。本番リリース前に `70000` に戻すこと。
> `6000` 以下にすると 10 秒程度でクリアになり、ゲームとして成立しない。

### ノックバック量

```typescript
export const KNOCKBACK_AMOUNT = 120  // 障害物ヒット時の後退量
export const HOLE_KNOCKBACK   = 200  // 穴落下時の後退量
```

### フェアネス機構

```typescript
export const COYOTE_FRAMES       = 5   // コヨーテタイム（地面を離れた後のジャンプ猶予）
export const JUMP_BUFFER_FRAMES  = 8   // 先行入力バッファ（着地直前のジャンプ入力保持）
export const KNOCKBACK_INVINCIBLE = 90 // ノックバック後の無敵フレーム数
export const MISS_OVERLAY_FRAMES = 90  // MISS オーバーレイ表示時間（1.5秒）
export const REVIVAL_FRAMES      = 75  // 復活スロー時間（1.25秒）
```

### 充電サバイバル（電気電子工学科 = dept 2 のみ）

```typescript
export const CHARGE_MAX      = 100   // 充電ゲージ最大値
export const CHARGE_DRAIN    = 0.18  // /frame。常時減少（満タン→空 ≈ 9秒）
export const CHARGE_HIT_COST = 30    // 障害物被弾時のチャージ減（ノックバックと二重ペナルティ）
export const CHARGE_REVIVE   = 50    // チャージ0でのミス復活後の残量
export const BATTERY_REFILL  = 35    // 🔋電池1個の回復量
export const BATTERY_GAP: [number, number] = [110, 80]  // 電池スポーン間隔 [最小, ランダム幅] frames
```

> **バランス調整の指針**: 「電池をほぼ全部拾えばギリギリ完走できる」密度を狙う。
> `STAGE_LENGTH` を本番（70000）に戻した際は `BATTERY_GAP` / `CHARGE_DRAIN` の再調整が必要。

### 穴落下・段差の閾値（`engine.ts` 内）

```typescript
// 穴落下フラグ発動: 地面からこの px 下がったらスクロール停止
DEFAULT_GROUND_Y + 30  // = 250px

// 穴落下 MISS 発火: 画面下端からこの px 下がったら knockback
CANVAS_H + 60          // = 340px

// 段差壁の最小高さ: これ未満の groundY 差は無視する
20 (px)
```

- 穴落下フラグを下げると落ちた感が減り、上げすぎると高速時に穴をスキップできる
- MISS発火を下げるとプレイヤーが画面外に出る前に消えて見え、上げるとワープ感が残る
- 段差壁の高さは `buildStageMech` の `DEFAULT_GROUND_Y - 60` に合わせている

---

## よくあるトラブル

### ゲームが重い（フレームレートが低い）

- Chrome DevTools の **Performance タブ**でボトルネックを特定する
- `render()` 内の描画量が多すぎる可能性がある
  - 背景の描画が複雑すぎる → `bgX` スクロールに合わせて描画範囲を限定する
  - `ctx.shadowBlur` は GPU 負荷が高い → 重要な箇所のみに絞る

### クリアタイムが登録されない

1. ブラウザの DevTools → **Network タブ**で `POST /api/stage-clears` のレスポンスを確認
2. **HTTP 500 "missing Supabase env vars"** の場合:
   - Vercel ダッシュボード → Settings → Environment Variables を開く
   - `NEXT_PUBLIC_SUPABASE_URL` と `NEXT_PUBLIC_SUPABASE_ANON_KEY` が **All Environments** になっているか確認
   - Production のみだと Preview（dev ブランチ）では動かない
   - 変更後は必ず**再デプロイ**が必要（`NEXT_PUBLIC_*` はビルド時に埋め込まれるため）
3. **HTTP 500 その他** の場合: Supabase ダッシュボードの **Logs** でエラーを確認
4. RLS ポリシーの確認:
   ```sql
   SELECT policyname, cmd FROM pg_policies WHERE tablename = 'stage_clears';
   -- SELECT と INSERT の両方のポリシーが存在すること
   ```

### ランキングが表示されない

1. `GET /api/leaderboard?department=N` のレスポンスを確認
2. Supabase の RLS ポリシーが正しく設定されているか確認:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'stage_clears';
   ```
3. `NEXT_PUBLIC_SUPABASE_URL` と `NEXT_PUBLIC_SUPABASE_ANON_KEY` が正しいか確認

### Vercel Preview デプロイの注意事項

- `NEXT_PUBLIC_*` 環境変数はビルド時に埋め込まれる。**設定変更後は再デプロイが必要**。
- 環境変数が Preview 環境に設定されていない場合、API ルートがサーバーサイドで env var を読めずに 500 エラーになる。
- 空コミット `git commit --allow-empty -m "trigger redeploy" && git push origin dev` で再デプロイをトリガーできる。
