-- DB関数（start_run / submit_clear / get_leaderboard）の動作テスト。
-- Supabase ダッシュボードの SQL エディタ（または MCP の execute_sql）で開発DBに対して丸ごと実行する。
-- 最後に ROLLBACK するので、テストデータは残らない。結果の ok 列がすべて true なら合格。
begin;
create temp table t_results(name text, ok boolean, detail text) on commit drop;
do $$
declare r uuid; r2 uuid; res record;
begin
  -- 正常系: 120秒前に開始した run を 105秒で登録
  r := public.start_run(1, 'test-key', 'mobile');
  update public.runs set started_at = now() - interval '120 seconds' where id = r;
  select * into res from public.submit_clear(r, 'テスト太郎', 105000, 2);
  insert into t_results values ('submit ok', res.clear_id is not null and res.rank >= 1 and res.is_personal_best, row_to_json(res)::text);
  -- 同じ run での二重登録
  begin perform public.submit_clear(r, 'テスト太郎', 105000, 2); insert into t_results values ('double submit rejected', false, '');
  exception when others then insert into t_results values ('double submit rejected', sqlerrm = 'run_already_finished', sqlstate || ' ' || sqlerrm); end;
  -- 学科の最短タイム未満
  r2 := public.start_run(1, 'test-key', 'desktop');
  update public.runs set started_at = now() - interval '120 seconds' where id = r2;
  begin perform public.submit_clear(r2, 'テスト太郎', 50000, 0); insert into t_results values ('too fast rejected', false, '');
  exception when others then insert into t_results values ('too fast rejected', sqlerrm = 'invalid_time', sqlerrm); end;
  -- 開始からの経過時間より長いタイム（開始直後に登録）
  r2 := public.start_run(2, 'test-key', 'desktop');
  begin perform public.submit_clear(r2, 'テスト太郎', 105000, 0); insert into t_results values ('time mismatch rejected', false, '');
  exception when others then insert into t_results values ('time mismatch rejected', sqlerrm = 'time_mismatch', sqlerrm); end;
  -- NGワード（全角・空白まじりでも弾く）
  update public.runs set started_at = now() - interval '120 seconds' where id = r2;
  begin perform public.submit_clear(r2, 'Ｆ ｕ ｃ ｋ太郎', 105000, 0); insert into t_results values ('ng word rejected', false, '');
  exception when others then insert into t_results values ('ng word rejected', sqlerrm = 'nickname_rejected', sqlerrm); end;
  -- 普通の名前（kill を含む skill）は通る
  select * into res from public.submit_clear(r2, 'skill', 106000, 0);
  insert into t_results values ('skill allowed', res.clear_id is not null, '');
  -- 同名で遅いタイム → 自己ベストは更新されない
  r2 := public.start_run(1, 'test-key', 'desktop');
  update public.runs set started_at = now() - interval '200 seconds' where id = r2;
  select * into res from public.submit_clear(r2, 'テスト太郎', 150000, 5);
  insert into t_results values ('slower not PB, best kept', not res.is_personal_best and res.best_ms = 105000, row_to_json(res)::text);
  -- ランキングは同名1件だけ
  insert into t_results select 'leaderboard dedup', count(*) filter (where nickname = 'テスト太郎') = 1, string_agg(nickname || ':' || clear_time_ms, ',') from public.get_leaderboard(1, 100);
  -- 存在しない run
  begin perform public.submit_clear(gen_random_uuid(), 'a', 105000, 0); insert into t_results values ('unknown run rejected', false, '');
  exception when others then insert into t_results values ('unknown run rejected', sqlerrm = 'run_not_found', sqlerrm); end;
  -- レート制限：同じクライアントは1分に30回まで
  begin
    for i in 1..40 loop perform public.start_run(3, 'flood-key', null); end loop;
    insert into t_results values ('rate limit', false, '');
  exception when others then insert into t_results values ('rate limit', sqlerrm = 'rate_limited', sqlerrm); end;
  -- 学科IDの範囲外
  begin perform public.start_run(9, null, null); insert into t_results values ('bad dept', false, '');
  exception when others then insert into t_results values ('bad dept', sqlerrm = 'invalid_department', sqlerrm); end;
  -- 直接 INSERT の不正タイムは CHECK 制約で弾く
  begin insert into public.stage_clears(nickname, department, clear_time_ms) values ('x', 1, 1); insert into t_results values ('check constraint', false, '');
  exception when others then insert into t_results values ('check constraint', sqlstate in ('23514', '42501'), sqlerrm); end;
end $$;
select * from t_results;
rollback;
