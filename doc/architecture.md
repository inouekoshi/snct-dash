# アーキテクチャと技術スタック

## 技術スタック

| 役割 | 技術 | 選定理由 |
|------|------|---------|
| フレームワーク | Next.js 16 (App Router) | Vercelとの親和性、サーバー/クライアントの統合 |
| ゲームレンダリング | Canvas API（ライブラリなし） | Phaser.js等を使わず軽量に。祭当日の低スペック端末でも60fps動作を優先 |
| スタイリング | Tailwind CSS | UI部分（タイトル・学科選択・リーダーボード）のみ使用 |
| 効果音 | Web Audio API（プロシージャル） | 音声ファイル0個。ブラウザAPIで音を合成するため読み込み時間なし |
| データベース | Supabase | リーダーボード用クリアタイム保存。東京リージョン(ap-northeast-1)を使用 |
| デプロイ | Vercel | GitHubと連携した自動デプロイ |
| 言語 | TypeScript | 型安全性によるバグ防止 |

## アーキテクチャ

```
snct-dash/
├── app/
│   ├── page.tsx                     # タイトル画面（Server Component）
│   ├── game/
│   │   └── page.tsx                 # ゲーム画面（Client Component）
│   ├── leaderboard/
│   │   └── page.tsx                 # ランキング画面（学科別）
│   └── api/
│       ├── stage-clears/route.ts    # POST: クリアタイム登録・バリデーション
│       └── leaderboard/route.ts     # GET: ランキング取得（department=1〜5）
│
├── components/
│   ├── DepartmentSelect.tsx         # 学科選択UI（タイトル後に表示）
│   ├── Game.tsx                     # Canvasゲームの React ラッパー
│   │                                #   → GameEngine を初期化・キーボード/タッチ入力を中継
│   ├── ResultModal.tsx              # クリア後のタイム表示・API送信
│   └── Leaderboard.tsx              # ランキング表示（学科別タブ）
│
└── lib/
    ├── types.ts                     # 共通型定義（GameClearResult 等）
    ├── supabase.ts                  # クライアントサイド用 Supabase クライアント
    ├── supabase-server.ts           # サーバーサイド用 Supabase クライアント（APIルート専用）
    └── game/
        ├── engine.ts                # GameEngine クラス（ループ・状態管理・衝突判定の統合）
        ├── engine-types.ts          # Obstacle / TerrainSegment / Item / Particle 型定義
        ├── constants.ts             # 全定数（速度・スポーン間隔・ステージ長・ノックバック量等）
        ├── terrain.ts               # 地形セグメント生成・管理（段差・穴）
        ├── areas.ts                 # 5学科のテーマ定義（色・名前・絵文字）
        ├── helpers.ts               # overlaps / hitCircle / playerHitbox / rrect
        ├── spawner.ts               # spawnObstacle / spawnItem
        ├── obstacle-drawers.ts      # drawObstacle（Record<Shape, DrawFn> によるデータ駆動描画）
        ├── background-renderers.ts  # drawBg / drawGround（地形対応版）
        ├── player-renderer.ts       # drawPlayer
        ├── hud-renderer.ts          # drawHUD（タイム表示・進捗バー等）/ drawTransition
        └── sound.ts                 # Web Audio API によるプロシージャル効果音
```

### データフロー

```
[ユーザー操作]
    ↓ キーボード/タッチイベント
[Game.tsx]
    ↓ jump() / togglePause() 呼び出し
    ↓ departmentId を GameEngine に渡す
[GameEngine (engine.ts)]
    ↓ onClear コールバック（timeMs: number）
[ResultModal.tsx]
    ↓ POST /api/stage-clears（nickname, department, clear_time_ms）
[stage_clears テーブル]
    ↑ GET /api/leaderboard?department=N
[Leaderboard.tsx]
```

### 画面フロー

```
タイトル (app/page.tsx)
  ↓ ニックネーム入力 → 学科選択 (DepartmentSelect.tsx)
ゲーム (app/game/page.tsx)
  ↓ クリア
リザルト (ResultModal.tsx) → ランキング (app/leaderboard/page.tsx)
```

## 環境変数

| 変数名 | 説明 |
|--------|------|
| NEXT_PUBLIC_SUPABASE_URL | Supabase API URL |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | 匿名キー（公開可） |
| SUPABASE_SERVICE_ROLE_KEY | サービスロールキー（秘密・APIルート専用） |
