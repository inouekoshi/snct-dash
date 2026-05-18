# 開発ガイド

このドキュメントはゲームの拡張・改修を行う開発者向けのガイドです。

## 目次

- [ゲームエンジンの構造](#ゲームエンジンの構造)
- [新しい学科エリアを追加する](#新しい学科エリアを追加する)
- [障害物の種類を追加する](#障害物の種類を追加する)
- [ゲームバランスの調整](#ゲームバランスの調整)
- [よくあるトラブル](#よくあるトラブル)

---

## ゲームエンジンの構造

`lib/game/engine.ts` の `GameEngine` クラスがゲームロジック全体を管理します。

### ゲームループ

```
start() → requestAnimationFrame
  └── loop()
        ├── update()  物理演算・衝突判定・スポーン処理
        └── render()  Canvas への描画
```

`update()` と `render()` は 60fps を目標に呼ばれます。

### 座標系

Canvas の左上が原点 `(0, 0)`、Y軸は下方向が正です。

```
(0,0) ────────────────→ x (800)
  │
  │   [背景]
  │
  │   GROUND_Y = 220   ← プレイヤーが立つ地面の Y 座標
  │   ════════════════  ← 地面ライン
  │   [地面]
  ↓
y (280)
```

- プレイヤーの `py`（y座標）は**プレイヤーの底辺**を指します
- ジャンプ中は `py < GROUND_Y`、着地すると `py = GROUND_Y` にクランプ

### 当たり判定

障害物との衝突は AABB（Axis-Aligned Bounding Box）で判定します。
実際の障害物より内側 4px でヒットボックスを作ることで、見た目より少し当たり判定が小さくなっています。

```typescript
// overlaps() の呼び出し例
this.overlaps(ph, { x: o.x + 4, y: o.y + 4, w: o.w - 8, h: o.h - 8 })
//                       ↑ 4px内側               ↑ 8px小さく
```

コイン・シールドとの衝突は円形（`hitCircle()`）で判定します。

---

## 新しい学科エリアを追加する

5エリアより増やす場合（例: 専攻科追加）の手順です。

### 1. `lib/game/areas.ts` にエリアを追加

```typescript
export const AREAS: Record<AreaId, AreaTheme> = {
  // ...既存エリア...
  6: {
    id: 6,
    name: '専攻科',
    emoji: '🎓',
    bgTop: '#100010',
    bgBottom: '#1a0020',
    groundColor: '#3a0050',
    groundLineColor: '#ff00ff',
    obstacleColor: '#880088',
    obstacleStroke: '#ff44ff',
    coinColor: '#ff88ff',
    decorations: ['star', 'ring'],
  },
}
```

### 2. `AreaId` 型を更新

`lib/game/areas.ts` の `AreaId` 型と `engine.ts` の `AREA_SPEEDS`・`SPAWN_GAPS` に追加します。

```typescript
// areas.ts
export type AreaId = 1 | 2 | 3 | 4 | 5 | 6

// engine.ts
const AREA_SPEEDS = { 1: 5, ..., 6: 20 }
const SPAWN_GAPS: [number, number][] = [
  [0, 0],
  // ...既存...
  [30, 20],  // エリア 6
]
```

### 3. エリアのループ処理を更新

`engine.ts` の `nextArea()` メソッドにあるループ処理を修正します。

```typescript
// 変更前（5エリアループ）
this.area = ((this.area % 5) + 1) as AreaId

// 変更後（6エリアループ）
this.area = ((this.area % 6) + 1) as AreaId
```

### 4. 背景描画を追加

`drawBg()` に `case 6:` を追加し、対応する描画関数を実装します。

### 5. 障害物スポーン関数を追加

`spawnObstacle()` に `case 6:` を追加し、`spawnA6()` を実装します。

---

## 障害物の種類を追加する

### 1. `Obstacle` 型の `shape` に追加

```typescript
// lib/game/engine-types.ts
interface Obstacle {
  // ...
  shape: 'gear' | 'bolt' | 'piston' | 'circuit' | 'coil' | 'capacitor' | 'bug' | 'monitor' | 'chip' | 'bacteria' | 'flask' | 'mushroom' | 'crystal' | 'ingot' | 'lattice' | 'stalactite' | 'robot'
  //                                                                                                                                                                  ↑ 天井障害物  ↑ 追加例
}
```

> **天井障害物 `stalactite` について**
> `stalactite` は `y = 0`（天井）を起点に垂れ下がる特殊な障害物で、`spawnCeilingObstacle()` によって管理されます。地面障害物のスポーンタイマー（`nextObs`）とは独立した別タイマー（`nextCeilingObs`）で制御されます。地面側の障害物を追加する場合は通常の手順で問題ありません。

### 2. `drawObstacle()` に描画処理を追加

```typescript
private drawObstacle(...) {
  // ...
  else if (o.shape === 'robot') this.dRobot(ctx, o, theme)
}

private dRobot(ctx: CanvasRenderingContext2D, o: Obstacle, theme: typeof AREAS[AreaId]) {
  // Canvas API で描画する
  this.rrect(ctx, o.x, o.y, o.w, o.h, 6); ctx.fill(); ctx.stroke()
  // ... 追加のディテール
}
```

### 3. スポーン関数で使用

```typescript
private spawnA1() {
  // ...
  this.mk({ x: CANVAS_W+10, y: GROUND_Y-50, w: 35, h: 50, type: 'low', shape: 'robot' })
}
```

---

## ゲームバランスの調整

### 難易度を下げたい

**速度を遅くする:**
```typescript
// lib/game/constants.ts
const AREA_SPEEDS = { 1: 4, 2: 6, 3: 8.5, 4: 11, 5: 14 }
//                      ↑ 各エリアを少し遅く
```

**障害物の間隔を広げる:**
```typescript
// lib/game/constants.ts
const SPAWN_GAPS: [number, number][] = [
  [0, 0],
  [130, 80],   // エリア 1: 2.2〜3.5秒ごと（より余裕）
  // ...
]
```

**シールドの無敵時間を延ばす:**
```typescript
// engine.ts の hit() メソッド内
this.invincible = 180  // 2秒 → 3秒（60fps × 3）
```

### ステージ時間を変えたい

```typescript
// lib/game/constants.ts
const AREA_DURATION = 30 * 60  // 30秒に変更
```

### ノーミスボーナスを調整したい

```typescript
// engine.ts の nextArea() メソッド内
if (this.noMiss) { this.score += 200 }  // 100点 → 200点
```

### 周回スケーリングを調整したい

```typescript
// lib/game/constants.ts
export const LAP_SPEED_SCALE = 0.10   // 1周ごとの速度増加率（デフォルト0.15）
export const LAP_SPAWN_SCALE = 0.05   // 1周ごとのスポーン短縮率（デフォルト0.07）
export const MAX_SPEED_SCALE = 2.0    // 速度の最大倍率上限（デフォルト3.0）
```

### 速度バーストを調整したい

```typescript
// engine.ts の update() 内
this.burstTimer = 120           // バースト持続フレーム（デフォルト150 = 2.5秒）
this.burstCooldown = 900 + ...  // 次バーストまでのフレーム（デフォルト600〜900）

// 速度倍率
const burstScale = this.burstTimer > 0 ? 1.8 : 1.0  // 1.8倍 → 任意の値に変更
```

---

## よくあるトラブル

### ゲームが重い（フレームレートが低い）

- Chrome DevTools の **Performance タブ**でボトルネックを特定する
- `render()` 内の描画量が多すぎる可能性がある
  - 背景の描画が複雑すぎる → `bgX` スクロールに合わせて描画範囲を限定する
  - `ctx.shadowBlur` は GPU 負荷が高い → 重要な箇所のみに絞る

### スコアが登録されない

1. ブラウザの DevTools → **Network タブ**で `POST /api/scores` のレスポンスを確認
2. エラーレスポンスに `error` フィールドがあれば原因がわかる
3. Supabase ダッシュボードの **Logs** でエラーを確認

### ランキングが表示されない

1. `GET /api/leaderboard` のレスポンスを確認
2. Supabase の RLS ポリシーが正しく設定されているか確認:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'scores';
   ```
3. `NEXT_PUBLIC_SUPABASE_URL` と `NEXT_PUBLIC_SUPABASE_ANON_KEY` が正しいか確認

### 当日ランキングが機能しない

`app/api/leaderboard/route.ts` はJST（UTC+9）ベースでフィルタリングを行います。

- `FESTIVAL_DATE` 環境変数（`YYYY-MM-DD` 形式）が設定されていればその日付を使用
- 未設定の場合はサーバー上の現在時刻をJSTに変換して当日の範囲を自動計算

```bash
vercel env ls  # 現在の環境変数を確認
```

フィルタリングの仕組み：

```typescript
// FESTIVAL_DATE未設定時はJST(UTC+9)の本日を自動計算
const now = new Date()
const jstDate = new Date(now.getTime() + 9 * 60 * 60 * 1000)
const dateStr = festivalDate ?? jstDate.toISOString().slice(0, 10)
const start = `${dateStr}T00:00:00+09:00`
const end = `${dateStr}T23:59:59.999+09:00`
```
