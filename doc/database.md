# データベース設計

## スキーマ

```sql
CREATE TABLE stage_clears (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- プレイヤー名（最大20文字、空白のみ不可）
  nickname TEXT NOT NULL CHECK (length(nickname) <= 20 AND length(trim(nickname)) > 0),

  -- 学科ID（1=機械, 2=電気電子, 3=電子情報, 4=生物応用化学, 5=材料工学）
  department INTEGER NOT NULL CHECK (department BETWEEN 1 AND 5),

  -- クリアタイム（ミリ秒。小さいほど上位）
  clear_time_ms INTEGER NOT NULL CHECK (clear_time_ms > 0),

  played_at TIMESTAMPTZ DEFAULT now()
);

-- 学科別ランキング取得を高速化
CREATE INDEX idx_stage_clears_dept_time ON stage_clears(department, clear_time_ms ASC);

-- RLS：読み取り・書き込みとも public に許可（APIルートは anon キーで INSERT する）
ALTER TABLE stage_clears ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read stage_clears" ON stage_clears FOR SELECT USING (true);
CREATE POLICY "API can insert stage_clears" ON stage_clears FOR INSERT WITH CHECK (true);
```

`supabase-schema.sql` に同じ内容があります。

## DB環境

| 環境 | Supabase プロジェクト | 使う Vercel 環境 |
|------|----------------------|-----------------|
| 本番 | `kosendash`（東京） | Production（main） |
| 開発 | `kosendash-dev`（東京） | Preview（dev）・Development・ローカル（`.env.local`） |

2つのDBは同じスキーマ。スキーマを変えるときは両方に適用する。

## Supabase クライアント

APIルート（`app/api/*`）だけが `lib/supabase-server.ts` の `createServerClient()` で DB に接続する。クライアント（ブラウザ）から DB に直接はアクセスしない。

- キーは `NEXT_PUBLIC_SUPABASE_ANON_KEY`（anon キー）を使い、RLS ポリシーに従って SELECT / INSERT する
- service_role キーは使わない（`SUPABASE_SERVICE_ROLE_KEY` は不要）
- データの妥当性は `app/api/stage-clears/route.ts` のバリデーションで担保する

> 注意：RLS は INSERT を public に許可しているため、anon / publishable キーを知っていれば API を通さずに直接書き込める（publishable キーは `app/api/cron/warmup/route.ts` に記載があり、リポジトリは公開）。不正タイム対策は [Issue #3](https://github.com/inouekoshi/snct-dash/issues/3) で検討する。

## 自動停止対策（Cron ウォームアップ）

Supabase Free は約7日アクセスがないと自動で一時停止し、停止中は API が 500 になる（ゲーム本体は動く）。対策として `app/api/cron/warmup/route.ts` を Vercel Cron で1日1回（`vercel.json`、UTC 0:00）呼び、本番・開発の両DBに軽い SELECT を発行している。

停止してしまった場合は、Supabase ダッシュボードの Restore で復旧する（数分かかる）。

## バリデーション

クライアントからは任意の数値を送信できるため、`app/api/stage-clears/route.ts` でサーバーサイドバリデーションを行います。

- `clear_time_ms`: 1以上 600000（10分）以下の整数であること（下限が緩いので不正タイム対策が必要。[Issue #3](https://github.com/inouekoshi/snct-dash/issues/3)）
- `nickname`: 空でなく20文字以内であること
- `department`: 1〜5 の整数であること

## ランキング取得

```typescript
// 学科別 TOP10（クリアタイム昇順）
const { data } = await supabase
  .from('stage_clears')
  .select('nickname, clear_time_ms, played_at')
  .eq('department', departmentId)
  .order('clear_time_ms', { ascending: true })
  .limit(10)
```

## 旧テーブル（廃止）

旧 `scores` テーブル（スコア・距離・max_area を持つエンドレスランナー時代の仕様）は廃止。
コード（`/api/scores`）は削除済みだが、テーブルは本番・開発DBの両方に残っている（削除は [Issue #13](https://github.com/inouekoshi/snct-dash/issues/13)）。
