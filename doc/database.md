# データベース設計

スキーマの正本は `supabase/migrations/` の SQL。本番DB（`kosendash`）と開発DB（`kosendash-dev`）に同じものを適用する。

| ファイル | 内容 | 開発DB | 本番DB |
|---------|------|-------|-------|
| `20260511000000_init_schema.sql` | `stage_clears` テーブル（初期） | ✅ | ✅ |
| `20261013000100_runs_anticheat_leaderboard.sql` | `runs`・NGワード・DB関数・analytics ビュー | ✅ 2026-10-13 | ✅ 2026-10-13 |
| `20261013000200_lockdown_direct_insert.sql` | `stage_clears` への直接 INSERT を禁止 | ✅ 2026-10-13 | ✅ 2026-10-16（本番リリース時に適用完了） |
| `20261013000300_archive_legacy_scores.sql` | 旧 `scores` テーブルを `archive` スキーマへ退避 | ✅ 2026-10-13 | ✅ 2026-10-13 |
| `20261013000400_review_fixes.sql` | 順位の数え方の統一・隠した名前の再登録・通信遅れの補正・直接呼び出しの制限 | ✅ 2026-10-13 | ✅ 2026-10-13 |
| `20261018000100_increase_rate_limit.sql` | 当日同時100人アクセス対策：start_run のレート制限を緩和（同一IP 300回/分、全体 1200回/分） | 適用待ち | 適用待ち |

> 本番への新コードデプロイに伴い、`..._200_lockdown`（および材料工学科の最短下限タイム更新）は 2026-10-16 に本番DBへ適用済み。手順の履歴は [doc/operations.md の「本番リリース手順」](operations.md#本番リリース手順dev--main)。

## テーブル

### `stage_clears`（クリア記録・ランキング）

| 列 | 型 | 説明 |
|----|----|------|
| `id` | uuid PK | シェアページ `/r/{id}` に使う |
| `nickname` | text | 1〜20文字 |
| `department` | int | 1=機械, 2=電気電子, 3=電子情報, 4=生物応用化学, 5=材料 |
| `clear_time_ms` | int | クリアタイム（ミリ秒・小さいほど上位）。`min_clear_time_ms(department)` 以上 600000 以下（CHECK 制約。`hidden` の行は対象外） |
| `played_at` | timestamptz | 登録日時 |
| `run_id` | uuid | どのプレイの記録か（`runs.id`・一意） |
| `misses` | int | ミス回数 |
| `hidden` | bool | `true` でランキング・シェアページから消える（運営が不適切な名前を隠す用）。一度隠したニックネームは、以後の登録も最初から隠れる |

ランキング・順位の対象は「`hidden` でなく、学科の最短タイム以上の記録」（`is_ranked_clear()`）。旧APIで入った不可能なタイムは表示されない。

RLS：SELECT は誰でも可。INSERT は `with check (false)`（直接は不可・`submit_clear()` 経由のみ）。UPDATE / DELETE はポリシーなし＝不可。

### `runs`（1プレイ＝1行。プレイ記録・分析にも使う）

| 列 | 説明 |
|----|------|
| `id` | runId（スタート時に発行し、クリア登録に1回だけ使える） |
| `department` | 学科 |
| `client_key` | 来場者のIPのハッシュ（API が渡す。連続開始の制限用。生のIPは保存しない） |
| `source_key` | DB に直接つないできた接続元のIPのハッシュ（API 経由なら Vercel のサーバー） |
| `device` | `mobile` / `tablet` / `desktop` / `unknown`（User-Agent から推定） |
| `started_at` / `finished_at` | 開始（サーバー時刻から、ゲーム開始〜リクエストまでの遅れ（最大30秒）をさかのぼった時刻）／クリア登録した時刻（未クリアなら null） |
| `clear_time_ms` / `misses` | クリア時の値 |

RLS 有効・ポリシーなし、anon / authenticated の権限も剥奪（DB関数からのみ触れる）。

### `ng_words`（ニックネームの禁止語）

`word`（小文字）。ニックネームを NFKC 正規化・小文字化・空白や記号を除いた上で**部分一致**で判定する。
短すぎる語（例：`kill` は `skill` に含まれる）は入れない。当日でも SQL で追加できる（[doc/operations.md](operations.md)）。

## DB関数（RPC）

すべて `SECURITY DEFINER`・`search_path = ''`。エラーは `raise exception '<code>' using errcode = 'PTxxx'`（PostgREST が HTTP ステータス xxx に変換）。

| 関数 | 呼べる人 | 内容 |
|------|---------|------|
| `start_run(p_department, p_client_key, p_device, p_started_ago_ms) → uuid` | anon | プレイ開始。同じ `client_key` は1分に300回まで、同じ接続元（`source_key`）は1分に1200回まで（`rate_limited` / 429）。`p_client_key` を渡さない直接呼び出しは接続元IPで数える |
| `submit_clear(p_run_id, p_nickname, p_clear_time_ms, p_misses)` | anon | クリア登録。下の検証をすべて通ったら `stage_clears` に追加し、`clear_id, rank, best_ms, is_personal_best, total_players` を返す。`rank` は「今回のタイムなら何位か」（自分以外のプレイヤーの自己ベストと比べる）。自己ベスト更新なら ランキングの順位と同じ |
| `get_leaderboard(p_department, p_limit = 10)` | anon | ランキング。同じニックネームは最速1件（`distinct on`）。`hidden` を除く |
| `get_clear(p_id)` | anon | 1件＋順位（シェアページ用。`submit_clear` の `rank` と同じ数え方） |
| `min_clear_time_ms(p_department)` | — | 学科ごとの最短タイム（`lib/game/limits.ts` と同じ値。テストで一致を確認） |
| `rank_of(...)` / `is_nickname_allowed(...)` / `is_ranked_clear(...)` | 内部用 | API からは呼べない |
| `start_run_legacy` / `rank_of_legacy` | 旧版 | 引数を変えたときに改名して残したもの（誰も呼べない。不要なら drop してよい） |

> Supabase の Security Advisor は「anon が SECURITY DEFINER 関数を実行できる」「RLS が有効でポリシーがない」（`runs` / `ng_words`）と表示するが、
> どちらも意図した設計（ゲームが呼ぶ4関数だけを公開し、テーブルは関数経由でしか触らせない）。

### `submit_clear()` の検証

| チェック | エラー |
|---------|-------|
| run が存在する | `run_not_found`（404） |
| run がまだ使われていない（1プレイ1登録） | `run_already_finished`（409） |
| run の開始から30分以内 | `run_expired`（410） |
| ニックネームが1〜20文字 | `invalid_nickname`（400） |
| ニックネームに禁止語を含まない | `nickname_rejected`（422） |
| タイムが学科の最短タイム以上・10分以下 | `invalid_time`（422） |
| **サーバーで測った開始からの経過時間 + 10秒 ≥ タイム** | `time_mismatch`（422） |

最後のチェックで「開始直後に好タイムを送る」不正ができない（好タイムを出すには少なくともそのタイムぶん待つ必要があり、
そのタイムも物理的な最短タイム以上でなければならない）。10秒は登録時の通信の遅れの余裕。
スタート時の通信の遅れは、クライアントが「ゲーム開始から何ms後に送ったか」を `start_run` に渡し、開始時刻をそのぶん（最大30秒）さかのぼって補正する。
ゲーム内時間は一時停止中に進まないので、正しいプレイでは経過時間 ≥ ゲーム内時間になる。

### 学科ごとの最短タイム

`lib/game/limits.ts` の `theoreticalMinClearMs()`（ミスなし・加速ギミックを常に最大で受け続けた場合）から約3%引いた値。

| 学科 | 理論最短 | 下限 |
|------|---------|------|
| 1 機械 | 約104.8秒 | 100.0秒 |
| 2 電気電子 | 約104.8秒 | 100.0秒 |
| 3 電子情報（ずっとデバッグモード） | 約61.7秒 | 59.0秒 |
| 4 生物応化 | 約149.0秒 | 144.0秒 |
| 5 材料（フルコンボボーナス適用時） | 約88.0秒 | 80.0秒 |

ステージの長さ・速度・加速倍率を変えたら、`limits.ts` と `min_clear_time_ms()` の両方を直す（`npm test` が不一致を検出する）。

## 分析（analytics スキーマ）

API には公開しない。Supabase ダッシュボードの SQL エディタで見る。

```sql
select * from analytics.department_summary;  -- 学科ごとの開始数・クリア数・クリア率・中央値・平均ミス・スマホ比率
select * from analytics.hourly limit 48;       -- 1時間ごとの開始数・クリア数（日本時間）
```

## 退避（archive スキーマ）

API には公開しない。

| テーブル | 中身 |
|---------|------|
| `archive.scores_20261013` | 旧仕様の `scores`（本番61件） |
| `archive.stage_clears_20261013` | 本番 `stage_clears` の 2026-10-13 時点のコピー（テストデータ15件。本番の元の行は hidden・名前を `reset-…` に変更済み） |

## Supabase クライアント

APIルート（`app/api/*`）とシェアページだけが `lib/supabase-server.ts` の `createServerClient()` で DB に接続する。ブラウザから DB には直接アクセスしない。

- キーは `NEXT_PUBLIC_SUPABASE_ANON_KEY`（anon キー）。書き込みは DB関数経由なので service_role キーは不要
- 値の検証は DB関数が行う（API ルートは形式だけを見る）。anon キーで直接 RPC を呼ばれても同じ検証がかかる

## 自動停止対策（Cron ウォームアップ）

Supabase Free は約7日アクセスがないと自動で一時停止し、停止中は API が 500 になる（ゲーム本体は動く）。対策として `app/api/cron/warmup/route.ts` を Vercel Cron で1日1回（`vercel.json`、UTC 0:00）呼び、本番・開発の両DBに軽い SELECT を発行している。

停止してしまった場合は、Supabase ダッシュボードの Restore で復旧する（数分かかる）。

## テスト

`supabase/tests/rpc_test.sql` を開発DBの SQL エディタで実行する（最後に ROLLBACK するのでデータは残らない）。結果の `ok` がすべて `true` なら合格。
