-- ==============================================================================
-- 本番リリース直後（main デプロイ完了後）に本番DB（kosendash）で実行する SQL
-- ==============================================================================
-- 注意: 必ず main ブランチの Vercel デプロイが「Ready」になってから実行すること。
-- （先に適用すると旧コードからのクリア登録が失敗します）
-- ==============================================================================

-- 1. stage_clears への直接 INSERT を禁止（submit_clear() 経由のみに限定）
alter policy "API can insert stage_clears" on public.stage_clears with check (false);
alter policy "API can insert stage_clears" on public.stage_clears rename to "No direct insert (use submit_clear)";

-- 2. 材料工学科（学科ID=5）の最短下限タイムを 80秒（80,000ms）に更新
create or replace function public.min_clear_time_ms(p_department int)
returns int
language sql
immutable
parallel safe
as $$
  select case p_department
    when 1 then 100000
    when 2 then 100000
    when 3 then 59000
    when 4 then 144000
    when 5 then 80000
    else 60000
  end;
$$;

-- 3. 反映確認
select polname, polcmd from pg_policy where polrelid = 'public.stage_clears'::regclass;
select public.min_clear_time_ms(5); -- 80000 が返ることを確認
