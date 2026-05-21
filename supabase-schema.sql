-- 高専ダッシュ！クリアタイムテーブル
-- 旧 scores テーブルは廃止。全データ削除の上このスキーマを適用すること。

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

-- 読み取りは誰でもできる。書き込みはAPIルート（service_role）経由のみ
ALTER TABLE stage_clears ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read stage_clears" ON stage_clears FOR SELECT USING (true);
