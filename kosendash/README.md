# 高専ダッシュ！

鈴鹿高専の5学科エリアを走り抜けるエンドレスランナーゲームです。
鈴鹿高専祭（学校祭）の来場者が短い空き時間（15〜20分）に楽しめることを想定しています。

**本番URL**: https://kosendash.vercel.app

## 目次

- [ゲーム概要](#ゲーム概要)
- [技術スタック](#技術スタック)
- [アーキテクチャ](#アーキテクチャ)
- [ローカル開発環境のセットアップ](#ローカル開発環境のセットアップ)
- [環境変数](#環境変数)
- [データベース](#データベース)
- [ゲームの仕様](#ゲームの仕様)
- [デプロイ](#デプロイ)

---

## ゲーム概要

### 操作方法

| 操作 | PC | スマートフォン |
|------|-----|--------------|
| ジャンプ | スペース / ↑ キー | タップ |
| 二段ジャンプ | スペース / ↑ （空中で） | 空中でタップ |
| スライディング | ↓ キー | 下方向スワイプ |

### 5学科エリア

エリアは40秒ごとに切り替わり、ループします。エリアが進むほど速度・障害物密度が上昇します。

| エリア | 学科 | 速度 | 障害物の特徴 | 背景 |
|--------|------|------|------------|------|
| 1 | 機械工学科 | 5 | 歯車ブロック（入門） | 大型歯車シルエット |
| 2 | 電気電子工学科 | 7.5 | 天井ビーム＋ジャンプ→スライドのコンボ | 回路基板グリッド |
| 3 | 電子情報工学科 | 10.5 | バグ敵（上下ホップ）・サーバーラック | マトリックス数字 |
| 4 | 生物応用化学科 | 13.5 | 細菌ブロブ（ゆらゆら）・密集クラスター | 浮遊気泡 |
| 5 | 材料工学科 | 17 | クリスタル鍾乳石・石筍の高密度パターン | 結晶格子 |

### スコアシステム

| 要素 | 点数 |
|------|------|
| 走行距離 | 速度÷8 点/フレーム |
| コイン取得 | +10点 |
| エリアノーミスクリア | +100点ボーナス |

### シールドシステム（マリオのキノコ相当）

- スタート時にシールドを1つ所持
- 障害物に当たるとシールドを消費し、**2秒間無敵**になる
- シールドなしで当たるとゲームオーバー
- コース上に出現する🛡アイテムを取るとシールドが回復する
- すでにシールドがある状態で拾うと +50点ボーナス

### リーダーボード

- **全期間 TOP20**：通算ハイスコア
- **当日 TOP10**：高専祭当日限定ランキング（`FESTIVAL_DATE` 環境変数で制御）
- ニックネームを入力してプレイ開始、ゲームオーバー後に自動登録

---

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

---

## アーキテクチャ

```
kosendash/
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

---

## ローカル開発環境のセットアップ

### 前提条件

- Node.js 18以上
- npm

### 手順

```bash
# 1. リポジトリをクローン
git clone https://github.com/inouekoshi/SNCT-Casual-games.git
cd SNCT-Casual-games/kosendash

# 2. 依存関係をインストール
npm install

# 3. 環境変数ファイルを作成
cp .env.local.example .env.local
# .env.local を編集して Supabase の認証情報を入力（後述）

# 4. 開発サーバーを起動
npm run dev
```

ブラウザで http://localhost:3000 を開くとゲームが起動します。

> **Supabase 不要でのローカル確認**
> 環境変数が設定されていなくてもゲーム本体（Canvas部分）は動作します。
> スコア送信・ランキング取得のみ失敗します。

---

## 環境変数

`.env.local.example` をコピーして `.env.local` を作成し、以下を設定してください。

| 変数名 | 必須 | 説明 |
|--------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase プロジェクトの API URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase の匿名キー（公開可） |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase のサービスロールキー（APIルート専用・秘密） |
| `FESTIVAL_DATE` | 任意 | 高専祭の開催日 (`YYYY-MM-DD` 形式)。設定すると「当日ランキング」フィルターが機能する |

### Supabase キーの取得場所

Supabase ダッシュボード → プロジェクト選択 → **Settings > API** に全て記載されています。

### FESTIVAL_DATE の設定

高専祭前日までに Vercel ダッシュボードで設定してください。

```
# 例: 高専祭が 2026年11月3日の場合
FESTIVAL_DATE=2026-11-03
```

---

## データベース

### スキーマ

```sql
CREATE TABLE scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- プレイヤー名（最大20文字、空白のみ不可）
  nickname TEXT NOT NULL CHECK (length(nickname) <= 20 AND length(trim(nickname)) > 0),

  -- スコア（0〜999999の整数。サーバー側でバリデーション済み）
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 999999),

  -- 走行距離（ピクセル単位の整数）
  distance INTEGER NOT NULL CHECK (distance >= 0),

  -- 到達した最大エリア番号（1〜5）
  max_area INTEGER NOT NULL CHECK (max_area BETWEEN 1 AND 5),

  created_at TIMESTAMPTZ DEFAULT now()
);

-- ランキング取得を高速化
CREATE INDEX idx_scores_score      ON scores(score DESC);
CREATE INDEX idx_scores_created_at ON scores(created_at DESC);

-- RLS: 誰でも読み取り可、誰でも書き込み可（スコア不正は API レイヤーで防ぐ）
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read scores"   ON scores FOR SELECT USING (true);
CREATE POLICY "Anyone can insert scores" ON scores FOR INSERT WITH CHECK (true);
```

`supabase-schema.sql` に同じ内容があります。Supabase の SQL エディタで実行して適用してください。

### 不正スコア対策

クライアントからは任意の数値を送信できるため、`app/api/scores/route.ts` でサーバーサイドバリデーションを行っています。

- `score`: 0〜999999 の整数であること
- `nickname`: 空でなく20文字以内であること
- `max_area`: 1〜5 の整数であること
- `distance`: 0以上の整数であること

---

## ゲームの仕様

### GameEngine クラス（`lib/game/engine.ts`）

ゲームロジックの全てを担う中心クラスです。

```typescript
const engine = new GameEngine(canvasElement, (result: GameResult) => {
  // ゲームオーバー時に呼ばれるコールバック
  console.log(result.score, result.distance, result.maxArea)
})

engine.start()   // ゲームループ開始
engine.jump()    // ジャンプ入力
engine.slide()   // スライディング入力
engine.destroy() // ゲームループ停止（コンポーネントのアンマウント時）
```

#### GameResult 型

```typescript
interface GameResult {
  score: number    // 最終スコア
  distance: number // 走行距離（整数）
  maxArea: number  // 到達した最大エリア番号（1〜5）
}
```

### エリアのチューニング（`lib/game/areas.ts` / `engine.ts`）

各エリアのビジュアルテーマは `lib/game/areas.ts` の `AREAS` オブジェクトで定義されています。
色や名前を変えたい場合はここを編集します。

速度・スポーン間隔などのゲームバランスは `lib/game/engine.ts` の先頭定数で調整できます。

```typescript
// エリアごとのスクロール速度（大きいほど速い）
const AREA_SPEEDS = { 1: 5, 2: 7.5, 3: 10.5, 4: 13.5, 5: 17 }

// エリアごとの障害物スポーン間隔 [最小フレーム数, ランダム幅]
// 60fps なので 60 = 1秒。小さいほど障害物が多く出る
const SPAWN_GAPS = [
  [0, 0],      // 未使用（index 0）
  [110, 60],   // エリア 1: 1.8〜2.8秒ごと
  [85, 50],    // エリア 2: 1.4〜2.3秒ごと
  [65, 40],    // エリア 3: 1.1〜1.7秒ごと
  [50, 32],    // エリア 4: 0.8〜1.4秒ごと
  [36, 26],    // エリア 5: 0.6〜1.1秒ごと
]

// 1エリアあたりの時間（フレーム数）
const AREA_DURATION = 40 * 60  // 40秒 × 60fps = 2400フレーム
```

### 効果音（`lib/game/sound.ts`）

音声ファイルを一切使わず、Web Audio API でプロシージャルに生成します。
ゲーム起動時のバンドルサイズに影響しません。

| 関数 | タイミング |
|------|-----------|
| `playJump()` | ジャンプ時 |
| `playCoin()` | コイン取得時 |
| `playGameOver()` | ゲームオーバー時 |
| `playAreaChange()` | エリア切替時 |
| `playHurt()` | シールドでダメージ吸収時 |
| `playShieldGet()` | シールドアイテム取得時 |

---

## デプロイ

### Vercel への自動デプロイ

`main` ブランチへの push で自動デプロイされます（Vercel の GitHub 連携済み）。

### 手動デプロイ

```bash
cd kosendash

# 初回のみ: Vercel にログインしてプロジェクトをリンク
vercel login
vercel link --scope koshiinoues-projects

# 本番デプロイ
vercel --prod
```

### 環境変数の更新

```bash
# 例: 高専祭の日付を設定
echo "2026-11-03" | vercel env add FESTIVAL_DATE production
```

または Vercel ダッシュボード → プロジェクト → **Settings > Environment Variables** から設定。

### ビルド確認

```bash
npm run build   # 本番ビルドのエラーチェック
npm run lint    # ESLint によるコード品質チェック
```
