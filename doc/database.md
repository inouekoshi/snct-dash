# データベース設計

## スキーマ

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

## 不正スコア対策

クライアントからは任意の数値を送信できるため、`app/api/scores/route.ts` でサーバーサイドバリデーションを行っています。

- `score`: 0〜999999 の整数であること
- `nickname`: 空でなく20文字以内であること
- `max_area`: 1〜5 の整数であること
- `distance`: 0以上の整数であること
