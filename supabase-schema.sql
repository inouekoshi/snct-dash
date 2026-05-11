-- 高専ダッシュ！スコアテーブル
CREATE TABLE scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nickname TEXT NOT NULL CHECK (length(nickname) <= 20 AND length(trim(nickname)) > 0),
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 999999),
  distance INTEGER NOT NULL CHECK (distance >= 0),
  max_area INTEGER NOT NULL CHECK (max_area BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ランキング取得を高速化するインデックス
CREATE INDEX idx_scores_score ON scores(score DESC);
CREATE INDEX idx_scores_created_at ON scores(created_at DESC);

-- スコアの読み取りは誰でもできるが、書き込みはAPIのみ（service role key使用）
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read scores" ON scores FOR SELECT USING (true);
