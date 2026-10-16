# アーキテクチャと技術スタック

## 技術スタック

| 役割 | 技術 | 選定理由 |
|------|------|---------|
| フレームワーク | Next.js 16 (App Router) | Vercelとの親和性、サーバー/クライアントの統合 |
| ゲームレンダリング | Canvas API（ライブラリなし） | Phaser.js等を使わず軽量に。祭当日の低スペック端末でも60fps動作を優先 |
| スタイリング | Tailwind CSS v4 | UI部分（タイトル・学科選択・リーダーボード）のみ使用。配色は常にダーク（`app/globals.css`） |
| 効果音 | Web Audio API（プロシージャル） | 音声ファイル0個。ブラウザAPIで音を合成するため読み込み時間なし |
| データベース | Supabase（Free） | クリアタイム・プレイ記録の保存。東京リージョン。本番用と開発用の2プロジェクト |
| デプロイ | Vercel | GitHubと連携した自動デプロイ（main=本番、それ以外=Preview）。Cron で Supabase の自動停止を防ぐ |
| PWA | Web App Manifest + Service Worker（`public/sw.js`） | ホーム画面に追加・電波が弱くても画面を開ける |
| テスト | Vitest（単体・自動プレイ）／Playwright（E2E） | `npm test` / `npm run test:e2e`（[doc/testing.md](testing.md)） |
| 言語 | TypeScript | 型安全性によるバグ防止 |

## ディレクトリ構成

```
snct-dash/
├── app/
│   ├── page.tsx                     # タイトル画面（ニックネーム入力は初回のみ・localStorage保存）
│   ├── game/page.tsx                # ゲーム画面（学科選択 → ブリーフィング → プレイ → リザルト）。プレイID（runId）を管理
│   ├── leaderboard/page.tsx         # ランキング画面（学科別）
│   ├── r/[id]/page.tsx              # シェアされたクリア記録のページ（X / LINE のリンク先）
│   ├── r/[id]/opengraph-image.tsx   # ↑のOGP画像（タイム・学科・順位入り）
│   ├── opengraph-image.tsx          # サイト全体のOGP画像
│   ├── manifest.ts                  # Web App Manifest（アイコンは public/icons）
│   ├── icon.png / apple-icon.png    # ファビコン・iOS ホーム画面アイコン
│   └── api/
│       ├── runs/route.ts            # POST: プレイ開始（runId 発行）→ DB関数 start_run()
│       ├── stage-clears/route.ts    # POST: クリア登録 → DB関数 submit_clear()（検証はDB側）
│       ├── leaderboard/route.ts     # GET: ランキング → DB関数 get_leaderboard()（CDNに5秒キャッシュ）
│       └── cron/warmup/route.ts     # GET: Supabase 自動停止防止の定期アクセス（Vercel Cron・1日1回）
│
├── components/
│   ├── Game.tsx                     # Canvasゲームの React ラッパー（ブリーフィング・入力・一時停止メニュー・自動ポーズ）
│   ├── DepartmentSelect.tsx         # 学科選択UI
│   ├── ResultModal.tsx              # リザルト（タイム・順位・自己ベスト・登録エラー表示）
│   ├── ShareButtons.tsx             # X / LINE / 端末の共有メニュー
│   ├── MatProductReveal.tsx         # 材料工学科のクリア演出（鍛造による結晶粒微細化）
│   ├── Leaderboard.tsx              # ランキング表示（学科別タブ）
│   └── ServiceWorkerRegister.tsx    # 本番ビルドでだけ Service Worker を登録
│
├── lib/
│   ├── types.ts                     # 共通型（GameClearResult / StageClearEntry / API のレスポンス）
│   ├── nickname.ts                  # ニックネームの整形（入力画面と API で共通）
│   ├── format.ts                    # タイム表示（m:ss.cc）
│   ├── supabase-server.ts           # サーバー用 Supabase クライアント（APIルート専用・anon キー）
│   ├── client/game-api.ts           # ブラウザから API を呼ぶ関数（startRun / submitClear / fetchLeaderboard）
│   ├── server/                      # API ルート用（エラー変換・IPハッシュ・記録の取得）
│   ├── og/                          # OGP画像の描画（日本語フォントは必要な文字だけ取得）
│   └── game/
│       ├── engine.ts                # GameEngine（固定タイムステップのループ・状態・衝突判定・学科別ギミック）
│       ├── engine-types.ts          # Obstacle / TerrainSegment / Item / Particle 型定義
│       ├── constants.ts             # 全定数（速度・スポーン間隔・ステージ長・学科別ギミックの値）
│       ├── limits.ts                # 学科ごとのクリアタイムの受付範囲（不正判定）と理論最短タイム
│       ├── rng.ts                   # シード付き乱数（エンジンごとに1つ）
│       ├── spawner.ts               # Spawner クラス：学科別の障害物・アイテム生成（ShuffleBag で偏りを抑える）
│       ├── terrain.ts               # 地形生成（機械の山登り階段／平坦／生物応化は地面なし）
│       ├── autopilot.ts             # 自動プレイ（テスト・バランス調整用のボット）
│       ├── areas.ts                 # 5学科のテーマ定義（色・名前・絵文字）と生物応化のゾーン判定
│       ├── stage-info.ts            # ブリーフィング画面の学科紹介・ステージ特徴
│       ├── helpers.ts               # overlaps / playerHitbox / itemHitbox / rrect
│       ├── *-renderer(s).ts         # 描画（背景・地面・自キャラ・ゴール・アイテム・HUD・材料工学科専用）
│       ├── obstacle-drawers.ts      # drawObstacle（Record<Shape, DrawFn> によるデータ駆動描画）
│       └── sound.ts                 # Web Audio API によるプロシージャル効果音
│
├── supabase/
│   ├── migrations/                  # DB スキーマ（本番・開発の両方に同じものを適用する）
│   └── tests/rpc_test.sql           # DB関数のテスト（SQL エディタで実行・最後に ROLLBACK）
├── tests/
│   ├── unit/                        # Vitest（エンジン・制限値・API ルート・全学科の自動プレイ）
│   └── e2e/                         # Playwright（画面の流れ・スマホ操作・実時間の通しプレイ）
├── scripts/
│   ├── autoplay-report.ts           # 全学科を自動プレイしてクリアタイムを集計（バランス調整用）
│   └── generate-icons.mjs           # public/icons/icon.svg から PNG アイコンを作る
└── public/
    ├── sw.js                        # Service Worker
    └── icons/                       # PWA アイコン（icon.svg が元データ）
```

## ゲームエンジン

### 固定タイムステップ

`requestAnimationFrame` の呼ばれる頻度は端末によって違う（60Hz / 90Hz / 120Hz / 処理落ち時は30Hz以下）。
エンジンは経過時間を `STEP_MS`（1/60秒）刻みに区切って `update()` を呼び、描画は1回だけ行う。

- 120Hz の端末でも2倍速にならない／重い端末でもスローにならない（1フレームで最大5ステップまで追いつく）
- クリアタイムは「`update()` の回数 × 1/60秒」＝ゲーム内時間。一時停止中・処理落ちで捨てたぶんは数えない
- 端数は四捨五入的に持ち越すので、60Hz の端末でタイミングが揺れても1フレーム1ステップのまま

### 乱数とスポーナー

乱数（`Rng`）とスポーナー（`Spawner`、シャッフルバッグの残りを持つ）はエンジンごとに持つ。
シードを渡せば同じステージが再現でき、`clone()` で状態を丸ごと複製できる（自動プレイのボットが先読みに使う）。
描画だけのゆらぎ（パーティクル等）は `Math.random()` のまま。

### 学科別ギミックの分岐

`GameEngine` は学科ごとのフラグ（`isElec` / `isCode` / `isBio` / `isMat`）で処理を分岐する。学科固有の処理はフラグで囲み、他学科の物理には影響させない方針。

| 学科 | フラグ | 主な固有処理 |
|------|--------|-------------|
| 1 機械 | — | 段差（`isBlockedByStep()`）・山登り階段地形 |
| 2 電気電子 | `isElec` | 充電ゲージの減少・🔋電池・天井障害 |
| 3 電子情報 | `isCode` | バグの独立スポーン・踏みつけ・デバッグモード・天井障害 |
| 4 生物応化 | `isBio` | `updateBio()`（長押し浮上の物理）・パイプ・バリア |
| 5 材料 | `isMat` | `strike()` による叩き判定・4段階加速・連打抑止・チュートリアル減速待機 |

## データフロー

```
[タイトル] ニックネーム（localStorage: snct_nickname）
    ↓
[学科選択 → ブリーフィング → ▶スタート！]
    ↓ POST /api/runs { department, startedAgoMs } → start_run()  … runs に1行（プレイ記録）
    ↓   ← { runId }（裏で取得。失敗してもプレイはできる）
[GameEngine] キーボード/タッチ → jump() / setThrust() / pause()
    ↓ onClear({ timeMs, departmentId, misses })
[ResultModal]
    ↓ POST /api/stage-clears { runId, nickname, clear_time_ms, misses } → submit_clear()
    ↓   DB で検証：run が未使用・30分以内／学科の最短タイム以上／開始からの経過時間と矛盾しない／NGワード
    ↓   ← { id, rank, bestMs, isPersonalBest, totalPlayers }
[順位・自己ベスト表示／シェア /r/{id}]

[ランキング] GET /api/leaderboard?department=N → get_leaderboard()（同じニックネームは最速1件）
```

DB の詳細は [doc/database.md](database.md)。

## 画面フロー

```
タイトル (app/page.tsx)
  ↓ ニックネーム入力（初回のみ）
ゲーム (app/game/page.tsx)
  ├ 学科選択 (DepartmentSelect.tsx)
  ├ ブリーフィング → プレイ (Game.tsx)
  │    └ ⏸一時停止メニュー：再開／最初からやり直す／学科選択に戻る
  │      （タブ切替・縦向きでも自動で一時停止）
  └ クリア → リザルト (ResultModal.tsx)
       ├ もう一度！（同じ学科・ブリーフィングなし）
       ├ 学科を選ぶ／ランキング／タイトル
       └ シェア → /r/[id]
ランキング (app/leaderboard/page.tsx)
```

## 環境変数

| 変数名 | 必須 | 説明 |
|--------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase API URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | 匿名キー（公開可）。APIルートもこのキーで DB 関数（RPC）を呼ぶ |
| `CRON_SECRET` | 任意 | 設定すると `/api/cron/warmup` が Authorization ヘッダーを検証する |
| `NEXT_PUBLIC_MAINTENANCE_DEPARTMENTS` | 任意 | メンテナンス中にする学科ID（カンマ区切り。例: `5`）。その学科は選択画面で押せなくなり、`/api/runs` もプレイ開始を 503 で断る。現在は設定なし（全学科プレイ可能） |
| `NEXT_PUBLIC_E2E` | テスト専用 | `1` でビルドすると `window.__kosendash`（自動操縦・ワープ）が有効になる。**本番では設定しない** |

### Vercel 設定の注意点

- `NEXT_PUBLIC_SUPABASE_URL` と `NEXT_PUBLIC_SUPABASE_ANON_KEY` は **環境ごとに別の値**を設定する。Production は本番DB（`kosendash`）、Preview と Development は開発DB（`kosendash-dev`）を指す
- 「All Environments」で同じ値を入れない。Preview に本番DBの値が入ると、dev ブランチでのテストプレイが本番ランキングに載る
- Preview に設定がないと、dev ブランチの API ルートが 500 エラーになる
- `NEXT_PUBLIC_*` はビルド時に埋め込まれるため、**設定変更後は再デプロイが必要**
- `SUPABASE_SERVICE_ROLE_KEY` は使っていない。2026-10-14 時点で3環境すべてに残っている（削除手順は [doc/operations.md](operations.md#vercel-の不要な環境変数を消す)）
