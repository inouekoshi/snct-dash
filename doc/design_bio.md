# 生物応用化学科ステージ（学科ID=4）「液体スイム」実装プラン

## Context（なぜこの変更をするか）

「高専ダッシュ！」は鈴鹿高専5学科のタイムアタック型ランゲーム。現在、機械(1)・電気(2)・電子情報(3)の3ステージが作り込み完成済みで、生物応用化学(4)・材料(5)は「デフォルト地形＋最低限の障害物」のまま `DepartmentSelect` で**選択不可**になっている。

今回は学科4「生物応用化学科」を、**既存3つと見た目もコンセプトも体験も全く違うステージ**として一から作り込む。鈴鹿高専の生物応用化学科は「応用化学コース（合成・触媒・環境）」と「生物化学コース（微生物・遺伝子・細胞）」の**二面性**が最大の特徴。これをゲームに落とし込むため、ユーザーと協議し以下を確定した：

- **コアギミック = 液体スイム（浮力）**：地面をなくし、培養液の中を上下動だけで進む（ヘリコプター/Flappy系）。既存の「走る＋ジャンプ＋地面」物理を根本から置き換え、操作感を完全に別物にする。
- **テーマ = 化学と生物の融合**：化学ゾーン（試薬・分子）と生物ゾーン（細胞・DNA）が `stageProgress` に応じて交互に切り替わる。
- **操作 = 長押し浮上**：押している間は浮上、離すと沈降。壁・障害物に当たるとノックバック（既存ミス処理を流用、ゲームオーバーなしは共通）。

既存3学科に影響を出さないため、全変更を `departmentId===4`（`isBio`）でガードして分岐させる。

## 確定仕様

| 項目 | 内容 |
|------|------|
| 物理 | 常時沈降＋押下中に上昇推力＋水の抵抗で減衰。上下壁あり |
| 地形 | 地面なし（`buildStageBio()` は空配列） |
| 障害物 | 上下から伸びるパイプペア（隙間を通る）。ゾーンで見た目切替 |
| ミス | 壁・パイプ衝突で `knockback()`（後退）。ゲームオーバーなし |
| 入力 | 長押しで浮上／離すと沈む（bio時のみ keyup/touchend を追加） |
| クリア | `stageProgress >= STAGE_LENGTH` でタイム確定（他学科共通） |

## 実装内容（ファイル別）

### 1. `lib/game/constants.ts` — 新定数（初期値、調整前提）
```ts
export const BIO_TOP_WALL    = 50
export const BIO_BOTTOM_WALL = CANVAS_H - 16   // 264
export const SWIM_SINK       = 0.34            // 常時沈降加速
export const SWIM_THRUST     = -0.72           // 押下中の上昇加速
export const SWIM_DRAG       = 0.90            // 速度減衰（水の抵抗）
export const SWIM_MAX_VY     = 5.2
export const BIO_WALL_KNOCKBACK = 90           // 壁ヒット後退（通常120より軽め）
export const BIO_GAP         = 116             // パイプ縦隙間（プレイヤー高46+余裕）
export const BIO_PIPE_W      = 42
export const BIO_SPEED_START = 6
export const BIO_SPEED_END   = 10
```
- `SPAWN_GAPS` の index 4 を `[50,32]` → `[78,46]` に変更（スイムは間隔に余裕が必要）。

### 2. `lib/game/engine.ts` — 物理統合（中核）
- フィールド追加：`private isBio = false`、`private thrustHeld = false`。constructor で `this.isBio = departmentId === 4`、bio時の初期 `py` を液中央に。
- メソッド追加 `setThrust(active: boolean)`：ポーズ/ミス/クリア中はガード（`jump()` と同じ条件）。
- `update()`：**地形判定＋プレイヤー物理ブロック（既存 L172-210 相当）を `if (this.isBio) {…スイム物理…} else {…既存…}` で分岐**。スイム物理＝推力/沈降/減衰/クランプ→`py` 更新→上下壁判定（はみ出たら中央へ戻し `knockback(BIO_WALL_KNOCKBACK)`）。処理は `updateBio()` private に切り出して見通しを保つ。
- スポーンブロックを分岐：bio時は通常 `spawnObstacle`/`spawnCeilingObstacle`/電池を**通さず**、`spawnPipePair(stageProgress+CANVAS_W, obstacles, bioZone(stageProgress))` を `SPAWN_GAPS[4]` 間隔で呼ぶ。
- `currentSpeed` getter を bio時 `BIO_SPEED_START→END` に分岐。
- `render()`：bio時は `drawGround` をスキップ、`drawBg` に `stageProgress`（=ゾーン情報）を渡す、`drawPlayer` に bio フラグ。
- 衝突ループ・タイマー・クリア判定・パーティクル・座標更新は**無改変で共有**（パイプは `overlaps` で当たり最終 `knockback` に落ちる）。

### 3. `components/Game.tsx` — bio時の長押し入力
- `setThrust(active)` を engine に呼ぶ。`useEffect` のイベント登録を `departmentId === 4` で分岐：
  - bio：`keydown`(Space/↑)→`setThrust(true)`／`keyup`→`false`、canvas `touchstart`→true／`touchend`/`touchcancel`→false、`pointerdown`→true/`pointerup`/`pointerleave`→false、`window blur`→false。
  - bio時は `<canvas onClick={handleJump}>` を無効化（二重入力防止）。
  - 非bio：現状のまま（影響ゼロ）。
- スタート画面の操作説明（L139）とプレイ画面下の説明（L180-181）を bio時のみ「長押し：浮上（離すと沈む）」に分岐。

### 4. `lib/game/terrain.ts`
- `buildStage()` に `if (departmentId === 4) return buildStageBio()` を追加。`buildStageBio(): TerrainSegment[] { return [] }`（空配列で地面・穴・段差ロジックを無害化）。

### 5. `lib/game/spawner.ts` — `spawnPipePair`
- `spawnCeilingObstacle`（y=0 から伸びる既存実装）を雛形に、上下ペア＋隙間 `BIO_GAP` を生成する `spawnPipePair(stageX, obstacles, zone)` を新設。`zone` で shape を `reagent_tube`(化学)／`cell_wall`(生物) に切替。バリエーションは `ShuffleBag` で管理（`resetSpawnerBags` に追加）。揺れるパイプは `moving:true`+`amplitude` で既存揺動ロジックを流用。

### 6. `lib/game/engine-types.ts` / `lib/game/obstacle-drawers.ts`
- Obstacle の shape ユニオン型に `'reagent_tube' | 'cell_wall'`（必要なら浮遊用 `'molecule_node' | 'dna_helix'`）を追加。型追加で `OBSTACLE_DRAWERS`（`Record<shape,...>`）が未実装を型エラー検出。
- `dReagentTube`（試薬管＝色付き液面・気泡・ガラス縁）と `dCellWall`（六角コロニー・核点描）を `dStalactite`/`rrect` を雛形に実装し、`OBSTACLE_DRAWERS` に登録。

### 7. `lib/game/background-renderers.ts` — 液体化＋ゾーン
- `BgContext` に `stageProgress`(or `zone`) を追加（生成は engine.render の1箇所、消費は本ファイルのみ＝後方互換）。
- `bgBio` を作り替え：縦グラデ＋光の差し込み＋上昇する泡（密度増）＋浮遊ダスト＋ゾーンティント（chem=寒色・分子格子／bio=暖色・DNA/細胞）を境界でクロスフェード。
- 上下壁を `bgBio` 末尾で描画（`drawGround` の流れるダッシュラインを流用、「水槽の縁」感）。

### 8. `lib/game/player-renderer.ts`
- `PlayerRenderState` に `bio?: boolean`。bio時は床影をスキップ。泡トレイルは engine 側で `burst()` を後方に小さく出す（drawPlayer 改変最小）。

### 9. ゾーン切替ヘルパ（`lib/game/areas.ts` 末尾 or 新規 `bio-zones.ts`）
```ts
export function bioZone(p: number): 'chem' | 'bio' {
  return Math.floor(p / 2200) % 2 === 0 ? 'chem' : 'bio'  // 約15-18秒ごと交互
}
```
背景・障害物shapeの両方で参照。色テーマは緑固定のまま shape/モチーフで差を出す（影響範囲を限定）。

### 10. `components/DepartmentSelect.tsx` / `lib/game/stage-info.ts` / `lib/game/areas.ts`
- DepartmentSelect L24：`id === 4 || id === 5` → `id === 5`（学科4を解放）。
- stage-info 学科4：catch「培養液をかいくぐれ！」／about「生命科学と物質合成のフィールド」／features に「地面なし・上下に泳ぐ」「押すと浮上・離すと沈む」「化学/生物ゾーンが交互に出現」。
- areas 学科4：緑テーマ維持しつつ液体感へ微調整（任意：bgTop `#021a14` 等）。

## 再利用する既存資産（新規コード最小化）
`knockback()`／`overlaps()`・`playerHitbox()`（helpers.ts）／`burst()`・particles／座標更新ループ・moving揺動／`ShuffleBag`・`resetSpawnerBags`／`spawnCeilingObstacle` 構造／`drawObstacle` 辞書ディスパッチ・`rrect`・`dStalactite`／`drawGround` のダッシュライン／AREASテーマ・`drawHUD`・`drawGoal`・タイマー/進捗/クリア判定（無改変共有）。

## 実装順序と動作確認（dev ブランチ、各段階で `npm run dev` → 学科4を選択して確認）
1. 解放＋空ステージ（`buildStageBio()`=[]、`isBio` 追加）→ 地面が消え落下し続けるのを確認。
2. スイム物理＋上下壁＋Game.tsx 長押し配線 → 押して浮く/離して沈む/壁で跳ね返るを確認。
3. パイプ障害物（`spawnPipePair`＋新shape）→ 隙間を通れる・当たるとノックバックを確認。
4. 背景・壁・泡（`bgBio` 液体化、`BgContext` 拡張、床影スキップ）。
5. ゾーン切替（`bioZone()` を背景＋shapeに適用）→ 化学/生物の交替を確認。
6. バランス調整（隙間・速度・推力の微調整）→ 通しクリア確認。
7. stage-info / 操作説明 / areas 仕上げ。
8. 本番化：dev検証中に縮めた `STAGE_LENGTH` を **70000 に戻す**（既知運用）→ 通し確認 → `npm run lint` → コミット（dev ブランチ。コミット/プッシュはユーザー指示時のみ）。

## リスクと緩和策
- **既存3学科への退行** → 全変更を `isBio`/`departmentId===4` でガード、terrain空配列で既存ロジック無害化（`getGroundY` 等は破綻しない）。
- **入力競合（押しっぱ暴発・二重入力）** → `setThrust` をポーズ/ミス/クリアでガード、`blur`/`pointerleave`/`touchcancel` で false、bio時 `onClick` jump を無効化。
- **壁ノックバック連発でハマる** → ヒット後 `py` 中央復帰＋`pvy=0`＋`invincible`(90f)、`BIO_WALL_KNOCKBACK` を軽め(90)。必要なら「壁=クランプのみ／パイプ=ノックバック」に緩和可。
- **物理分岐の肥大化** → `updateBio()` に切り出し。差し込みは update の物理ブロック・スポーン・currentSpeed の3点に限定。
- **新shape型追加漏れ** → ユニオン型追加で `OBSTACLE_DRAWERS` が型エラー検出（網羅強制）。
