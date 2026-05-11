# アーキテクチャと技術スタック

## 技術スタック

| 役割 | 技術 | 選定理由 |
|------|------|---------|
| フレームワーク | Next.js 16 (App Router) | Vercelとの親和性、サーバー/クライアントの統合 |
| ゲームレンダリング | Canvas API（ライブラリなし） | Phaser.js等を使わず軽量に。祭当日の低スペック端末でも60fps動作を優先 |
| スタイリング | Tailwind CSS | UI部分（タイトル・リーダーボード）のみ使用 |
| 効果音 | Web Audio API（プロシージャル） | 音声ファイル0個。ブラウザAPIで音を合成するため読み込み時間なし |
| データベース | Supabase | リーダーボード用スコア保存。東京リージョン(ap-northeast-1)を使用 |
| デプロイ | Vercel | GitHubと連携した自動デプロイ |
| 言語 | TypeScript | 型安全性によるバグ防止 |

## アーキテクチャ

```
SNCT-Casual-games/
├── app/
│   ├── page.tsx                   # タイトル画面（Server Component）
│   ├── game/
│   │   └── page.tsx               # ゲーム画面（Client Component）
│   ├── leaderboard/
│   │   └── page.tsx               # ランキング画面（10秒revalidate）
│   └── api/
│       ├── scores/route.ts        # POST: スコア登録・バリデーション
│       └── leaderboard/route.ts   # GET: ランキング取得（filter=all|today）
│
├── components/
│   ├── Game.tsx                   # Canvasゲームの React ラッパー
│   │                              #   → GameEngine を初期化・キーボード/タッチ入力を中継
│   ├── ResultModal.tsx            # ゲームオーバー後のスコア表示・API送信
│   └── Leaderboard.tsx            # ランキング表示（全期間/当日 タブ切替）
│
└── lib/
    ├── types.ts                   # 共通型定義（GameResult, ScoreEntry 等）
    ├── supabase.ts                # クライアントサイド用 Supabase クライアント
    ├── supabase-server.ts         # サーバーサイド用 Supabase クライアント（APIルート専用）
    └── game/
        ├── engine.ts              # ゲームエンジン本体（GameEngine クラス）
        ├── engine-types.ts        # ゲーム内型定義（refactoring済）
        ├── constants.ts           # 定数定義（refactoring済）
        ├── areas.ts               # 5学科エリアのテーマ定義（色・名前・絵文字）
        └── sound.ts               # Web Audio API による効果音生成
```

### データフロー

```
[ユーザー操作]
    ↓ キーボード/タッチイベント
[Game.tsx]
    ↓ jump() / slide() 呼び出し
[GameEngine (engine.ts)]
    ↓ onGameOver コールバック
[ResultModal.tsx]
    ↓ POST /api/scores
[scores/route.ts]
    ↓ Supabase INSERT
[scores テーブル]
    ↑ GET /api/leaderboard
[Leaderboard.tsx]
```
