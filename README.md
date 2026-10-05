# 高専ダッシュ！

鈴鹿高専の5学科をテーマにしたタイムアタック型ステージクリアゲームです。
高専祭（2026-11-03）の来場者が15分の空き時間に楽しめるブラウザゲームを目指しています。

## デプロイ環境

| ブランチ | 環境 | URL | 用途 |
|---------|------|-----|------|
| `main` | 本番 | https://kosendash.vercel.app | 公開版（高専祭で使う） |
| `dev` | 開発（Preview） | https://kosendash-git-dev-koshiinoues-projects.vercel.app | 開発・動作確認 |

ブランチへの push で Vercel が自動デプロイします。DB は本番用（`kosendash`）と開発用（`kosendash-dev`）の Supabase プロジェクトに分かれており、Production は本番DB、Preview・Development は開発DBを使います。

## ブランチ運用

- **`dev`**: 開発はここで行う。
- **`main`**: 本番。直接コミットせず、dev で確認できたものをマージする。
- マージ前に `lib/game/constants.ts` の `STAGE_LENGTH` が **70000**（本番値）になっていることを必ず確認する。

## 開発状況（2026-10 時点）

- **Phase 2**（エンジン刷新・タイムアタック制）✅ 完了
- **Phase 3**（学科別ステージ作り込み）✅ 完了（5学科すべて遊べる）
  - 機械（dept 1）：山登り階段＋障害物6種
  - 電気電子（dept 2）：充電サバイバル型（減り続ける充電ゲージを🔋電池で維持）
  - 電子情報（dept 3）：デバッグ踏みつけ型（バグを踏んでコンボ → デバッグモード）
  - 生物応用化学（dept 4）：液体スイム型（長押しで浮上・化学/生物ゾーン切替）
  - 材料（dept 5）：製品ができるまでラン（溶解 → 圧延 → 熱処理 → 検査で自分の性質が変わる）
- **Phase 4・5**（高専祭仕様化・直前準備）🔄 進行中

残タスクは GitHub の [Issues](https://github.com/inouekoshi/snct-dash/issues)（マイルストーン「高専祭 2026-11-03」）で管理しています。ラベル `P1: 高専祭までに必須` が最優先です。全体像は [doc/roadmap.md](doc/roadmap.md) を参照。

## ドキュメント

| ファイル | 内容 |
|---------|------|
| [doc/game_spec.md](doc/game_spec.md) | ゲーム仕様（タイムアタック制・地形・ノックバック・学科別ギミック） |
| [doc/architecture.md](doc/architecture.md) | アーキテクチャと技術スタック |
| [doc/database.md](doc/database.md) | DBスキーマ（stage_clearsテーブル・RLS）・DB環境・自動停止対策 |
| [doc/development.md](doc/development.md) | 開発ガイド（エンジン構造・地形/アイテム/障害物の追加方法・バランス調整） |
| [doc/roadmap.md](doc/roadmap.md) | ロードマップ（Phase 2〜6）と残タスク |
| [doc/design_phase2.md](doc/design_phase2.md) | Phase 2 実装設計書（旧仕様→タイムアタック制への移行・履歴） |
| [doc/design_bio.md](doc/design_bio.md) | 生物応用化学科ステージ（液体スイム）の実装計画（履歴） |
| [doc/design_mat.md](doc/design_mat.md) | 材料工学科ステージ（製品ができるまでラン）の設計書・学科リサーチ |

---

## 環境変数

| 変数名 | 必須 | 説明 |
|--------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase プロジェクトの API URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase の匿名キー（公開可）。APIルートもこのキーを使う |

Supabase ダッシュボード → プロジェクト → **Settings > API** で確認できます。

---

## ビルド確認

```bash
npm install
npm run build
npx tsc --noEmit
```
