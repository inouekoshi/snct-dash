# 高専ダッシュ！

鈴鹿高専の5学科エリアを走り抜けるエンドレスランナーゲームです。
鈴鹿高専祭（学校祭）の来場者が短い空き時間（15〜20分）に楽しめることを想定しています。

**本番URL**: https://kosendash.vercel.app

## ドキュメント

プロジェクトの詳細な仕様やアーキテクチャについては、`doc/` ディレクトリ内のドキュメントを参照してください。

- **[ゲーム仕様](doc/game_spec.md)**
  - 操作方法、各エリアの特徴、スコアシステム、各種チューニングについて
- **[アーキテクチャと技術スタック](doc/architecture.md)**
  - 採用技術、ディレクトリ構成、データフローについて
- **[データベース設計](doc/database.md)**
  - Supabase上のスキーマ定義やスコアバリデーションについて
- **[開発ガイド](doc/development.md)**
  - ローカル開発環境のセットアップ、エリアや障害物の追加方法など

---

## ローカル開発環境のセットアップ

### 前提条件

- Node.js 18以上
- npm

### 手順

```bash
# 1. リポジトリをクローン
git clone https://github.com/inouekoshi/SNCT-Casual-games.git
cd SNCT-Casual-games

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

## デプロイ

### Vercel への自動デプロイ

`main` ブランチへの push で自動デプロイされます（Vercel の GitHub 連携済み）。

### 手動デプロイ

```bash
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
