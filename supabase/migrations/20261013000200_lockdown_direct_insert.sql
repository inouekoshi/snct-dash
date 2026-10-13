-- stage_clears への直接 INSERT を禁止し、登録を submit_clear()（検証つきRPC）だけにする。
--
-- ⚠ 本番DBに適用するのは「新しいAPI（/api/runs + submit_clear を使うコード）が main にデプロイされた後」。
--   旧コードは stage_clears へ直接 INSERT するので、先に適用すると本番のクリア登録が失敗する。
--   開発DB（kosendash-dev）には 2026-10-13 に適用済み。
--
-- ポリシーを消す代わりに WITH CHECK (false) に変える（UPDATE/DELETE はもともとポリシーが無いので不可）。
-- submit_clear() は SECURITY DEFINER（テーブル所有者の権限）で動くので RLS の影響を受けない。

alter policy "API can insert stage_clears" on public.stage_clears with check (false);
alter policy "API can insert stage_clears" on public.stage_clears rename to "No direct insert (use submit_clear)";

-- 読み取り（"Anyone can read stage_clears"）は旧コードのランキング表示と Cron ウォームアップのために残す。
