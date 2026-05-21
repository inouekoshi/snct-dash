# 開発ガイド

このドキュメントはゲームの拡張・改修を行う開発者向けのガイドです。

## 目次

- [ゲームエンジンの構造](#ゲームエンジンの構造)
- [地形システム](#地形システム)
- [ノックバック処理](#ノックバック処理)
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
  departmentId,         // 1〜5 の学科ID
  (timeMs) => { ... }   // クリア時コールバック
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

アイテムとの衝突は円形（`hitCircle()`）で判定します。

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
- `type === 'hole'` のセグメントでは着地判定なし → 落下 → ジュゲム処理
- 段差（`groundY` が変わるセグメント）は `currentGroundY` を `STEP_FOLLOW_SPEED` ずつなめらかに追随

### 地形の追加（`lib/game/terrain.ts`）

学科ごとの地形パターンはこのファイルで定義します。

```typescript
export function buildStage(departmentId: number): TerrainSegment[] {
  // departmentId に応じて段差・穴の配置を返す
}
```

---

## ノックバック処理

障害物ヒット時・穴落下時に呼ばれます。

```typescript
private knockback(amount: number) {
  this.stageProgress = Math.max(0, this.stageProgress - amount)
  this.invincible = KNOCKBACK_INVINCIBLE  // 無敵フレーム（約1.5秒）
  this.hitStopTimer = HIT_STOP_FRAMES
  playKnockback()
}
```

`stageProgress` を戻すだけで完結します。`stageX` ベースの座標管理のため、全オブジェクトのCanvas座標は次フレームの `toCanvasX()` 呼び出しで自動的に正しい値になります。

**「世界が前に流れる = プレイヤーが後退した見た目」** になります。
ノックバック量は `constants.ts` の `KNOCKBACK_AMOUNT` で調整できます。

---

## 新しいアイテムを追加する

### 1. `ItemEffect` 型に追加（`engine-types.ts`）

```typescript
type ItemEffect = 'time_stop' | 'invincible' | 'speed_down'  // 追加例
```

### 2. 効果の処理を `engine.ts` に追加

```typescript
private applyItem(effect: ItemEffect) {
  switch (effect) {
    case 'speed_down':
      this.speedModifier = 0.5
      this.itemEffectTimer = 180  // 3秒
      break
    // ...
  }
}
```

### 3. スポーン関数に登録（`spawner.ts`）

```typescript
export function spawnItem(departmentId: number, items: Item[]) {
  // departmentId に応じてアイテムを出現させる
}
```

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
// stageX = スポーンのステージ座標（通常 stageProgress + CANVAS_W 付近）
function spawnDept1(stageX: number, obstacles: Obstacle[]) {
  mk(obstacles, { stageX, x: CANVAS_W + 10, y: DEFAULT_GROUND_Y - 50, w: 35, h: 50, shape: 'new_shape' })
}
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

> **注意**: `STAGE_LENGTH = 6000` にすると約12秒でクリアになってしまう。
> テスト時は `15000`（約30秒）、本番は `70000` を使うこと。

### ノックバック量

```typescript
export const KNOCKBACK_AMOUNT = 120  // 障害物ヒット時の後退量
export const HOLE_KNOCKBACK   = 200  // 穴落下時の後退量
```

### フェアネス機構

```typescript
export const COYOTE_FRAMES      = 5   // コヨーテタイム（地面を離れた後のジャンプ猶予）
export const JUMP_BUFFER_FRAMES = 8   // 先行入力バッファ（着地直前のジャンプ入力保持）
export const KNOCKBACK_INVINCIBLE = 90 // ノックバック後の無敵フレーム数
```

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
