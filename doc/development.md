# 開発ガイド

このドキュメントはゲームの拡張・改修を行う開発者向けのガイドです。

## 目次

- [ゲームエンジンの構造](#ゲームエンジンの構造)
- [地形システム](#地形システム)
- [ノックバック・MISSシステム](#ノックバックmissシステム)
- [ゴールレンダラー](#ゴールレンダラー)
- [アイテムシステム](#アイテムシステム)
- [障害物の種類を追加する](#障害物の種類を追加する)
- [ゲームバランスの調整](#ゲームバランスの調整)
- [自動プレイで確かめる](#自動プレイで確かめる)
- [よくあるトラブル](#よくあるトラブル)

---

## ゲームエンジンの構造

`lib/game/engine.ts` の `GameEngine` クラスがゲームロジック全体を管理します。

### 初期化

```typescript
const engine = new GameEngine(
  canvasElement,                        // null ならロジックだけ（テスト・ボット用）
  departmentId,                         // 1〜5 の学科ID
  (result: GameClearResult) => { ... }, // クリア時コールバック（{ timeMs, departmentId, misses }）
  { seed, silent },                     // 省略可：乱数シード／効果音・パーティクルなし
)
```

### ゲームループ（固定タイムステップ）

```
start() → requestAnimationFrame
  └── loop(now)
        ├── 経過時間を STEP_MS（1/60秒）刻みに区切って update() を0〜5回
        │     update()  物理演算・衝突判定・スポーン処理・進捗更新（1回 = 1/60秒）
        ├── render()    Canvas への描画（1回）
        └── フレーム間隔を見て、重ければ光彩（shadowBlur）を自動で切る
```

- **「1フレーム」＝ `update()` 1回＝1/60秒**。定数の「〜frames」はすべてこの単位
- 120Hz の端末でも2倍速にならない。重い端末では1フレームで最大5回 `update()` して追いつく
- クリアタイムは `update()` の回数 × 1/60秒（ゲーム内時間）
- ゲームロジックの乱数は `this.rng.next()`（シード付き）を使う。`Math.random()` は描画だけのゆらぎ（パーティクル等）に限る。
  こうしておくと同じシードで同じステージが再現でき、`clone()` で先読みできる

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

プレイヤーの判定ボックスは `playerHitbox(py, h = 46)` です。材料工学科だけ、工程に応じて高さ `h` を変えます（液滴34／薄板22／金属片40、`MAT_HITBOX_H`）。
アイテムとの判定も AABB で、ボックスは `itemHitbox(item)`（`helpers.ts`）が種類ごとに返します。

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
export function buildStage(departmentId: number, rand: Rand): TerrainSegment[] {
  if (departmentId === 1) return buildStageMech(rand)  // 機械：穴なし・山登り階段
  if (departmentId === 4) return []                // 生物応化：地面なし（液体スイム）
  return buildStageFlat()                          // 電気電子・電子情報・材料：完全な平坦
}
```

- `buildStageMech()`：落とし穴を使わず、2〜4段の「山型階段」を積み上げる（`STEP_H = 40`）
- `buildStageFlat()`：穴も段差も無い1本の平坦地面。各学科の固有ギミックに集中させる
- 穴（`type: 'hole'`）の落下フローは engine に残しているが、現在どの学科も使っていない

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

## アイテムシステム

アイテムは `Item` 型（`engine-types.ts`）で定義し、`engine.ts` の `items: Item[]` で管理します。

| effect | 学科 | 内容 |
|--------|------|------|
| `charge` | 電気電子 | 🔋電池。充電ゲージを回復 |
| `shield` | 生物応化 | バリア。1回だけ被弾を無効化 |

※ 材料工学科は赤熱塊（`hot_ingot`）をハンマーで叩くギミックのため、固有アイテムはありません（障害物としてスポーンします）。

新しいアイテムは次の4か所に追加します。

1. **種類を追加する**：`Item.effect` に追加する（`engine-types.ts`）
2. **スポーンする**：`engine.ts` の `update()` でタイマーをカウントダウンし、画面右端（`stageProgress + CANVAS_W`）の `stageX` で `items` に push する。学科限定のものはフラグ（`isElec` など）で囲む
   ```typescript
   if (this.isElec && --this.nextBattery <= 0) {
     const nextStageX = this.stageProgress + CANVAS_W
     const y = this.getGroundHeightAt(nextStageX) - (74 + this.rng.next() * 46)
     this.items.push({ stageX: nextStageX, x: CANVAS_W + 10, y, effect: 'charge', wobble: this.rng.next() * Math.PI * 2 })
     ...
   }
   ```
3. **取得判定と効果**：判定ボックスを `helpers.ts` の `itemHitbox()` に、効果を `engine.ts` の `applyItem()` に追加する。毎フレーム `collectItems()` が判定し、取得したものを配列から除く
4. **描画する**：描画関数（`item-renderer.ts` など）を作り、`render()` の `items` ループから呼ぶ。`it.x` / `it.y` は毎フレーム Canvas 座標に更新済み。`wobble` で上下のふわふわ揺れを付けられる

---

## 障害物の種類を追加する

### 1. `Obstacle` 型の `shape` に追加（`engine-types.ts`）

```typescript
interface Obstacle {
  shape:
       // 機械工学科
       | 'wrench' | 'spring' | /* ... */ | 'new_shape'
}
```

### 2. `drawObstacle()` に描画処理を追加（`obstacle-drawers.ts`）

```typescript
export const OBSTACLE_DRAWERS: Record<Obstacle['shape'], ObstacleDrawFn> = {
  // ...既存...
  new_shape: dNewShape,  // (ctx, o, theme, frame) => void
}
```

`Record` なので、`shape` に追加して描画関数を登録し忘れると型エラーになります。

### 3. スポーン関数で使用（`spawner.ts`）

学科ごとのパターンは `SpawnFn` の配列にまとめ、`ShuffleBag` で偏りなく順番に出します（機械＝`dept1Spawners`、電気電子＝`dept2Spawners`、電子情報＝`dept3RedSpawners`。材料工学科は時間キュー基準で `hot_ingot` をスポーン）。
バッグの残りと乱数は `Spawner` クラス（エンジンごとに1つ）が持ちます。乱数は引数の `rand()` を使い、`Math.random()` は使いません。

```typescript
// push(o) は o.x の Canvas オフセット（CANVAS_W+10 基準）を stageX に変換して登録する
// groundY は地形の高さ（段差上なら DEFAULT_GROUND_Y より小さい値が渡る）
const dept1Spawners: SpawnFn[] = [
  // ...既存...
  (push, groundY, rand) => {
    const h = 44 + rand() * 12
    push({ x: CANVAS_W + 10, y: groundY - h, w: 35, h, shape: 'new_shape' })
  },
]
```

追加したら `npm run test:autoplay` で全学科が最後まで走り切れる（詰まない）ことを確かめる。

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
export const STAGE_LENGTH = 70000   // ゴールまでの距離（約1分半でクリア）
export const SPEED_START   = 8      // 序盤の速度（px/frame）
export const SPEED_END     = 15     // 終盤の速度（px/frame）
```

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
export const CHARGE_DRAIN    = 0.16  // /frame。常時減少（満タン→空 ≈ 10.4秒）
export const CHARGE_HIT_COST = 30    // 障害物被弾時のチャージ減（ノックバックと二重ペナルティ）
export const CHARGE_REVIVE   = 50    // チャージ0でのミス復活後の残量
export const BATTERY_REFILL  = 35    // 🔋電池1個の回復量
export const BATTERY_GAP: [number, number] = [110, 80]  // 電池スポーン間隔 [最小, ランダム幅] frames
```

> **バランス調整の指針**: 「電池をほぼ全部拾えばギリギリ完走できる」密度を狙う。
> `STAGE_LENGTH` を本番（70000）に戻した際は `BATTERY_GAP` / `CHARGE_DRAIN` の再調整が必要。

### 電子情報・生物応化・材料

- 電子情報（dept 3）：`COMBO_NEEDED` / `DEBUG_FRAMES` / `DEBUG_SPEED_MULT` / `STOMP_*` / `MALLOC_*`
- 生物応化（dept 4）：`SWIM_*` / `BIO_GAP` / `BIO_SPEED_*` / `SHIELD_GAP`（[doc/design_bio.md](design_bio.md)）
- 材料（dept 5）：`MAT_*` / `HEAT_*` / `MELT_BOUNCE_VY` / `ROLL_GAP`（調整のポイントは [doc/design_mat.md](design_mat.md)）

### テスト用に STAGE_LENGTH を縮める

動作確認では `STAGE_LENGTH` を一時的に `15000`（約30秒）にしてよい。**`6000` は12秒でクリアになるので使わない。** コミット・マージ前に必ず `70000` に戻す。材料工学科の工程の区間は比率で決まるので、縮めても4工程すべて確認できる。

> 縮めたままだとクリアタイムがサーバーの下限（`lib/game/limits.ts` の `MIN_CLEAR_TIME_MS`）を下回るので、**登録は「クリアタイムが正しくありません」で失敗する**（正常な動作）。
> 70000 のまま画面だけ確かめたいときは、E2E 用ビルド（`NEXT_PUBLIC_E2E=1`）で `window.__kosendash.engine` の `stageProgress` を書き換えてワープできる。

### 速度・ステージ長・加速倍率を変えたら

学科ごとの最短タイム（不正判定の下限）が変わる。`npm test` の `limits.test.ts` が落ちたら、
`lib/game/limits.ts` の `MIN_CLEAR_TIME_MS` と、DB関数 `min_clear_time_ms()`（新しいマイグレーションを作って両方のDBに適用）を直す。

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

## 自動プレイで確かめる

`lib/game/autopilot.ts` のボットで、ステージを最後まで走らせてクリアタイムを測れる（[doc/testing.md](testing.md)）。

```bash
npm run autoplay:report -- 5 4      # 生物応化を5回（シード違い）自動プレイ
npm run test:autoplay               # 全学科を各2回。詰んだら失敗する
```

ボットは人間より上手いとは限らないので、絶対値ではなく「変更前後の差」「学科どうしの差」を見る目安にする。

---

## よくあるトラブル

### ゲームが重い（フレームレートが低い）

- Chrome DevTools の **Performance タブ**でボトルネックを特定する
- `render()` 内の描画量が多すぎる可能性がある
  - 背景の描画が複雑すぎる → `bgX` スクロールに合わせて描画範囲を限定する
  - `ctx.shadowBlur` は GPU 負荷が高い → 重要な箇所のみに絞る

### クリアタイムが登録されない

1. ブラウザの DevTools → **Network タブ**で `POST /api/runs`（スタート時）と `POST /api/stage-clears`（クリア時）のレスポンスを確認。
   `code` で原因がわかる（`invalid_time`＝タイムが学科の下限未満、`time_mismatch`＝開始からの経過時間と合わない、
   `nickname_rejected`＝NGワード、`run_not_found`＝スタート時の通信に失敗していた など。一覧は [doc/database.md](database.md)）
2. **HTTP 500 "Missing Supabase server env vars"** の場合:
   - Vercel ダッシュボード → Settings → Environment Variables を開く
   - `NEXT_PUBLIC_SUPABASE_URL` と `NEXT_PUBLIC_SUPABASE_ANON_KEY` が、エラーの出た環境（Production / Preview / Development）に設定されているか確認
   - Production にしかないと Preview（dev ブランチ）では動かない。Preview と Development には開発DB（`kosendash-dev`）の値を入れる（本番DBの値は入れない）
   - 変更後は必ず**再デプロイ**が必要（`NEXT_PUBLIC_*` はビルド時に埋め込まれるため）
3. **HTTP 500 その他** の場合:
   - まず Supabase プロジェクトが一時停止（INACTIVE）していないか確認する。Free プランは約7日アクセスがないと止まる（Cron ウォームアップで防いでいるが、止まったらダッシュボードの Restore で復旧）
   - Vercel のランタイムログに `Invalid API key` が出ていたら、その環境の `NEXT_PUBLIC_SUPABASE_ANON_KEY` が正しいか確認する
   - それ以外は Supabase ダッシュボードの **Logs** でエラーを確認
4. DB にマイグレーションが当たっているかの確認:
   ```sql
   select to_regclass('public.runs');                     -- runs テーブルがあること
   select proname from pg_proc where proname in ('start_run', 'submit_clear', 'get_leaderboard');
   ```

### ランキングが表示されない

1. `GET /api/leaderboard?department=N` のレスポンスを確認
2. DB関数 `get_leaderboard()` があるか確認（上と同じ SQL）
3. `NEXT_PUBLIC_SUPABASE_URL` と `NEXT_PUBLIC_SUPABASE_ANON_KEY` が正しいか確認

### Vercel Preview デプロイの注意事項

- `NEXT_PUBLIC_*` 環境変数はビルド時に埋め込まれる。**設定変更後は再デプロイが必要**。
- 環境変数が Preview 環境に設定されていない場合、API ルートがサーバーサイドで env var を読めずに 500 エラーになる。
- 空コミット `git commit --allow-empty -m "trigger redeploy" && git push origin dev` で再デプロイをトリガーできる。
