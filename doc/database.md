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

-- RLS: 誰でも読み書き可（バリデーションはAPIルート側で実施）
ALTER TABLE stage_clears ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read stage_clears" ON stage_clears FOR SELECT USING (true);
CREATE POLICY "API can insert stage_clears" ON stage_clears FOR INSERT WITH CHECK (true);
```

`supabase-schema.sql` に同じ内容があります。Supabase の SQL エディタで実行して適用してください。

### Supabase クライアントの使い分け

| ファイル | キー | 用途 |
|---------|------|------|
| `lib/supabase.ts` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | クライアントサイド（読み取り専用） |
| `lib/supabase-server.ts` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | APIルート（INSERT/SELECT） |

INSERT ポリシーで anon キーからの書き込みを許可しているため、SERVICE_ROLE_KEY は不要。
データの整合性は `app/api/stage-clears/route.ts` のバリデーションで担保する。

## バリデーション

クライアントからは任意の数値を送信できるため、`app/api/stage-clears/route.ts` でサーバーサイドバリデーションを行います。

- `clear_time_ms`: 1以上の整数であること（最大値は `STAGE_LENGTH / SPEED_START` から導出する合理的な上限を設定）
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

旧 `scores` テーブル（スコア・距離・max_area を持つ旧仕様）は廃止。
ゲームデザインがタイムアタック制に変わったため、全データを削除して `stage_clears` を新規作成する。
