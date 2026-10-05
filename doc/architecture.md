# アーキテクチャと技術スタック

## 技術スタック

| 役割 | 技術 | 選定理由 |
|------|------|---------|
| フレームワーク | Next.js 16 (App Router) | Vercelとの親和性、サーバー/クライアントの統合 |
| ゲームレンダリング | Canvas API（ライブラリなし） | Phaser.js等を使わず軽量に。祭当日の低スペック端末でも60fps動作を優先 |
| スタイリング | Tailwind CSS v4 | UI部分（タイトル・学科選択・リーダーボード）のみ使用。配色は常にダーク（`app/globals.css`） |
| 効果音 | Web Audio API（プロシージャル） | 音声ファイル0個。ブラウザAPIで音を合成するため読み込み時間なし |
| データベース | Supabase（Free） | リーダーボード用クリアタイム保存。東京リージョン。本番用と開発用の2プロジェクト |
| デプロイ | Vercel | GitHubと連携した自動デプロイ（main=本番、dev=Preview）。Cron で Supabase の自動停止を防ぐ |
| 言語 | TypeScript | 型安全性によるバグ防止 |

## アーキテクチャ

```
snct-dash/
├── app/
│   ├── page.tsx                     # タイトル画面（ニックネーム入力は初回のみ・localStorage保存）
│   ├── game/
│   │   └── page.tsx                 # ゲーム画面（学科選択 → プレイ → リザルト）
│   ├── leaderboard/
│   │   └── page.tsx                 # ランキング画面（学科別）
│   ├── manifest.ts                  # Web App Manifest
│   └── api/
│       ├── stage-clears/route.ts    # POST: クリアタイム登録・バリデーション
│       ├── leaderboard/route.ts     # GET: ランキング取得（department=1〜5）
│       └── cron/warmup/route.ts     # GET: Supabase 自動停止防止の定期アクセス（Vercel Cron・1日1回）
│
├── components/
│   ├── DepartmentSelect.tsx         # 学科選択UI
│   ├── Game.tsx                     # Canvasゲームの React ラッパー（ブリーフィング画面・入力の中継）
│   ├── ResultModal.tsx              # クリア後のタイム表示・API送信
│   ├── MatProductReveal.tsx         # 材料工学科のクリア演出（チタン眼鏡フレーム完成）
│   └── Leaderboard.tsx              # ランキング表示（学科別タブ）
│
└── lib/
    ├── types.ts                     # 共通型定義（GameClearResult / StageClearEntry）
    ├── supabase-server.ts           # サーバー用 Supabase クライアント（APIルート専用・anon キー）
    └── game/
        ├── engine.ts                # GameEngine（ループ・状態管理・衝突判定・学科別ギミックの統合）
        ├── engine-types.ts          # Obstacle / TerrainSegment / Item / Particle 型定義
        ├── constants.ts             # 全定数（速度・スポーン間隔・ステージ長・学科別ギミックの値）
        ├── terrain.ts               # 地形生成（機械の山登り階段／平坦／生物応化は地面なし）
        ├── areas.ts                 # 5学科のテーマ定義（色・名前・絵文字）と生物応化のゾーン判定
        ├── stage-info.ts            # ブリーフィング画面の学科紹介・ステージ特徴
        ├── helpers.ts               # overlaps / playerHitbox / itemHitbox / rrect
        ├── spawner.ts               # 学科別の障害物・アイテム生成（ShuffleBag で偏りを抑える）
        ├── obstacle-drawers.ts      # drawObstacle（Record<Shape, DrawFn> によるデータ駆動描画）
        ├── background-renderers.ts  # drawBg（学科別背景）/ drawGround
        ├── player-renderer.ts       # drawPlayer
        ├── goal-renderer.ts         # drawGoal（ゴールフラッグポール）
        ├── item-renderer.ts         # 🔋電池（電気電子）・バリア（生物応化）
        ├── mat-renderers.ts         # 材料工学科専用の描画（背景・地面・自キャラ・ゲート・障害物・HUD）
        ├── hud-renderer.ts          # drawHUD / renderMissOverlay / renderRevivalHint / renderPauseOverlay
        └── sound.ts                 # Web Audio API によるプロシージャル効果音
```

### 学科別ギミックの分岐

`GameEngine` は学科ごとのフラグ（`isElec` / `isCode` / `isBio` / `isMat`）で処理を分岐する。学科固有の処理はフラグで囲み、他学科の物理には影響させない方針。

| 学科 | フラグ | 主な固有処理 |
|------|--------|-------------|
| 1 機械 | — | 段差（`isBlockedByStep()`）・山登り階段地形 |
| 2 電気電子 | `isElec` | 充電ゲージの減少・🔋電池・天井障害 |
| 3 電子情報 | `isCode` | バグの独立スポーン・踏みつけ・デバッグモード・天井障害 |
| 4 生物応化 | `isBio` | `updateBio()`（長押し浮上の物理）・パイプ・バリア |
| 5 材料 | `isMat` | `updateMat()`（工程・状態・タイマー）・熱処理セット・工程ごとの当たり判定 |

### データフロー

```
[ユーザー操作]
    ↓ キーボード/タッチイベント
[Game.tsx]
    ↓ jump() / setThrust()（生物応化の長押し）/ togglePause() 呼び出し
    ↓ departmentId を GameEngine に渡す
[GameEngine (engine.ts)]
    ↓ onClear コールバック（GameClearResult: { timeMs, departmentId }）
[ResultModal.tsx]
    ↓ POST /api/stage-clears（nickname, department, clear_time_ms）
[stage_clears テーブル]
    ↑ GET /api/leaderboard?department=N
[Leaderboard.tsx]
```

### 画面フロー

```
タイトル (app/page.tsx)
  ↓ ニックネーム入力（初回のみ）
ゲーム (app/game/page.tsx)
  ├ 学科選択 (DepartmentSelect.tsx)
  ├ ブリーフィング → プレイ (Game.tsx)
  └ クリア → リザルト (ResultModal.tsx)
ランキング (app/leaderboard/page.tsx)
```

## 環境変数

| 変数名 | 必須 | 説明 |
|--------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase API URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | 匿名キー（公開可）。APIルート（`lib/supabase-server.ts`）もこのキーで RLS ポリシーに従って読み書きする |

### Vercel 設定の注意点

- すべての変数を **All Environments**（Production・Preview・Development）に設定すること
- `NEXT_PUBLIC_*` はビルド時に埋め込まれるため、**設定変更後は再デプロイが必要**
- Preview 環境に設定されていないと dev ブランチのAPIルートが 500 エラーになる
