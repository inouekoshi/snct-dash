# 高専ダッシュ！

鈴鹿高専の5学科をテーマにしたタイムアタック型ステージクリアゲームです。
高専祭（2026-11-03）の来場者が15分の空き時間に楽しめるブラウザゲームを目指しています。

## デプロイ環境

| ブランチ | 環境 | URL | 用途 |
|---------|------|-----|------|
| `main` | 本番 | https://kosendash-koshiinoues-projects.vercel.app | 安定版・触らない |
| `dev` | 開発 | https://kosendash-git-dev-koshiinoues-projects.vercel.app | 新仕様の開発・動作確認 |

ブランチへの push で Vercel が自動デプロイします。

## ブランチ運用

- **`main`**: 旧仕様（エンドレスランナー）の動作を保持。直接コミットしない。
- **`dev`**: Phase 2以降の新仕様（タイムアタック制）を実装するブランチ。開発はここで行う。
- 機能が完成したら `dev → main` にマージ。

## ドキュメント

| ファイル | 内容 |
|---------|------|
| [doc/game_spec.md](doc/game_spec.md) | ゲーム仕様（タイムアタック制・地形・ノックバック） |
| [doc/architecture.md](doc/architecture.md) | アーキテクチャと技術スタック |
| [doc/database.md](doc/database.md) | DBスキーマ（stage_clearsテーブル） |
| [doc/development.md](doc/development.md) | 開発ガイド（エンジン構造・障害物追加方法など） |
| [doc/roadmap.md](doc/roadmap.md) | ロードマップ（Phase 2〜6） |

---

## 環境変数

| 変数名 | 必須 | 説明 |
|--------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase プロジェクトの API URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase の匿名キー（公開可） |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase のサービスロールキー（APIルート専用・秘密） |

Supabase ダッシュボード → プロジェクト → **Settings > API** で確認できます。

---

## ビルド確認

```bash
npm install
npm run build
npx tsc --noEmit
```
