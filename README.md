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

- **`dev`**: 開発はここで行う（作業ブランチから PR でマージ）。
- **`main`**: 本番。直接コミットせず、dev で確認できたものをマージする。手順は [doc/operations.md の「本番リリース手順」](doc/operations.md#本番リリース手順dev--main)（**マージ後に本番DBへ1つ SQL を当てる**）。
- マージ前に `lib/game/constants.ts` の `STAGE_LENGTH` が **70000**（本番値）になっていることを必ず確認する。

## 開発状況（2026-10-13 時点）

- **Phase 2・3**（エンジン刷新・5学科のステージ）✅ 完了
  - 機械：山登り階段／電気電子：充電サバイバル／電子情報：デバッグ踏みつけ／生物応用化学：液体スイム／材料：製品ができるまでラン
- **Phase 4**（高専祭仕様化）✅ 実装完了・実機確認待ち
  - 不正タイム対策（DB関数で検証・直接書き込み禁止）、ランキングは1人1件、リザルトに順位・自己ベスト
  - シェア（X / LINE・OGP画像）、PWA、プレイ記録の集計（analytics）
  - 固定タイムステップ（どの端末でも同じ速さ）、重い端末の自動軽量化、一時停止メニュー、同じ学科でもう一度
  - 自動テスト一式（単体・全学科の自動プレイ・E2E・DB関数）
- **Phase 5**（直前準備）🔄 運用資料・負荷見積もりは作成済み。実機確認・本番マージ・当番表が残り

残タスクは GitHub の [Issues](https://github.com/inouekoshi/snct-dash/issues) で管理しています（ラベル `P1: 高専祭までに必須` が最優先）。全体像は [doc/roadmap.md](doc/roadmap.md)。

## ドキュメント

| ファイル | 内容 |
|---------|------|
| [doc/game_spec.md](doc/game_spec.md) | ゲーム仕様（タイムアタック制・地形・ノックバック・学科別ギミック・ランキング） |
| [doc/architecture.md](doc/architecture.md) | アーキテクチャ・ディレクトリ構成・データフロー・環境変数 |
| [doc/database.md](doc/database.md) | DBスキーマ・DB関数（不正対策の検証内容）・分析ビュー・マイグレーションの適用状況 |
| [doc/development.md](doc/development.md) | 開発ガイド（エンジン構造・地形/アイテム/障害物の追加方法・バランス調整・トラブル） |
| [doc/testing.md](doc/testing.md) | テストの種類と実行方法・自動プレイ・計測結果 |
| [doc/operations.md](doc/operations.md) | **本番リリース手順・実機チェックリスト・当日の監視とトラブル対応・運営スタッフ向け案内** |
| [doc/roadmap.md](doc/roadmap.md) | ロードマップ（Phase 2〜6）と残タスク |
| [doc/design_mat.md](doc/design_mat.md) | 材料工学科ステージの設計書・学科リサーチ |
| [doc/design_bio.md](doc/design_bio.md) | 生物応用化学科ステージの実装計画（履歴） |
| [doc/design_phase2.md](doc/design_phase2.md) | Phase 2 実装設計書（旧仕様→タイムアタック制への移行・履歴） |

---

## 開発の始め方

```bash
npm install
cp .env.local.example .env.local   # 開発DB（kosendash-dev）の URL と anon キーを書く
npm run dev                        # http://localhost:3000
```

| コマンド | 内容 |
|---------|------|
| `npm run check` | lint ＋ 型チェック ＋ 単体テスト ＋ 本番ビルド（**push 前に必ず**） |
| `npm run test:autoplay` | 全5学科を自動プレイでクリアできるか（ステージ・スポーンを変えたら） |
| `npm run test:e2e` | 画面の流れ・スマホ操作の E2E テスト |
| `npm run autoplay:report` | 自動プレイでクリアタイムを集計（バランス調整用） |

詳しくは [doc/testing.md](doc/testing.md)。

## 環境変数

| 変数名 | 必須 | 説明 |
|--------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase プロジェクトの API URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase の匿名キー（公開可）。APIルートもこのキーで DB 関数を呼ぶ |
| `CRON_SECRET` | 任意 | Cron ウォームアップの認証 |

Supabase ダッシュボード → プロジェクト → **Settings > API** で確認できます。DB のスキーマは `supabase/migrations/`（適用状況は [doc/database.md](doc/database.md)）。
