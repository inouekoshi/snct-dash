-- 高専ダッシュ！クリアタイムテーブル
-- 本番DB（kosendash）・開発DB（kosendash-dev）とも同じスキーマ。
-- 旧仕様の scores テーブルはコードからは使っていない（DB からの削除は Issue #13）。

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

-- RLS：読み取り・書き込みとも public に許可する。
-- APIルート（lib/supabase-server.ts）は anon キーで接続し、このポリシーに従って INSERT する。
-- 値の妥当性は app/api/stage-clears/route.ts のバリデーションと上の CHECK 制約で担保する。
ALTER TABLE stage_clears ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read stage_clears" ON stage_clears FOR SELECT USING (true);
CREATE POLICY "API can insert stage_clears" ON stage_clears FOR INSERT WITH CHECK (true);
