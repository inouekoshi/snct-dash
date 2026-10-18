-- DB関数（start_run / submit_clear / get_leaderboard / get_clear）の動作テスト。
-- Supabase ダッシュボードの SQL エディタ（または MCP の execute_sql）で丸ごと実行する。
-- 最後に ROLLBACK するので、テストデータは残らない。結果の ok 列がすべて true なら合格。
begin;
create temp table t_results(name text, ok boolean, detail text) on commit drop;
do $$
declare r uuid; r2 uuid; res record; res2 record; v_started timestamptz;
begin
  -- 正常系: 120秒前に開始した run を 105秒で登録
  r := public.start_run(1, 'test-key', 'mobile', 0);
  update public.runs set started_at = now() - interval '120 seconds' where id = r;
  select * into res from public.submit_clear(r, 'テスト太郎', 105000, 2);
  insert into t_results values ('submit ok', res.clear_id is not null and res.rank >= 1 and res.is_personal_best, row_to_json(res)::text);
  -- 同じ run での二重登録
  begin perform public.submit_clear(r, 'テスト太郎', 105000, 2); insert into t_results values ('double submit rejected', false, '');
  exception when others then insert into t_results values ('double submit rejected', sqlerrm = 'run_already_finished', sqlstate || ' ' || sqlerrm); end;
  -- 学科の最短タイム未満
  r2 := public.start_run(1, 'test-key', 'desktop', 0);
  update public.runs set started_at = now() - interval '120 seconds' where id = r2;
  begin perform public.submit_clear(r2, 'テスト太郎', 50000, 0); insert into t_results values ('too fast rejected', false, '');
  exception when others then insert into t_results values ('too fast rejected', sqlerrm = 'invalid_time', sqlerrm); end;
  -- 開始からの経過時間より長いタイム（開始直後に登録）
  r2 := public.start_run(2, 'test-key', 'desktop', 0);
  begin perform public.submit_clear(r2, 'テスト太郎', 105000, 0); insert into t_results values ('time mismatch rejected', false, '');
  exception when others then insert into t_results values ('time mismatch rejected', sqlerrm = 'time_mismatch', sqlerrm); end;
  -- スタートの通信が遅れた分（p_started_ago_ms）は開始時刻をさかのぼる。上限は30秒
  r2 := public.start_run(2, 'test-key', 'desktop', 12000);
  select started_at into v_started from public.runs where id = r2;
  insert into t_results values ('started_ago backdates', abs(extract(epoch from (now() - v_started)) - 12) < 1, v_started::text);
  r2 := public.start_run(2, 'test-key', 'desktop', 999999);
  select started_at into v_started from public.runs where id = r2;
  insert into t_results values ('started_ago capped at 30s', abs(extract(epoch from (now() - v_started)) - 30) < 1, v_started::text);
  -- NGワード（全角・空白まじりでも弾く）
  update public.runs set started_at = now() - interval '120 seconds' where id = r2;
  begin perform public.submit_clear(r2, 'Ｆ ｕ ｃ ｋ太郎', 105000, 0); insert into t_results values ('ng word rejected', false, '');
  exception when others then insert into t_results values ('ng word rejected', sqlerrm = 'nickname_rejected', sqlerrm); end;
  -- 普通の名前（kill を含む skill）は通る
  select * into res from public.submit_clear(r2, 'skill', 106000, 0);
  insert into t_results values ('skill allowed', res.clear_id is not null, '');
  -- 同名で遅いタイム → 自己ベストは更新されず、順位は「今回のタイム」で数える。シェアページの順位と一致する
  r2 := public.start_run(1, 'test-key', 'desktop', 0);
  update public.runs set started_at = now() - interval '200 seconds' where id = r2;
  select * into res from public.submit_clear(r2, 'テスト太郎', 150000, 5);
  insert into t_results values ('slower not PB, best kept', not res.is_personal_best and res.best_ms = 105000, row_to_json(res)::text);
  select * into res2 from public.get_clear(res.clear_id);
  insert into t_results values ('share page rank = result rank', res2.rank = res.rank, res2.rank || ' vs ' || res.rank);
  -- ランキングは同名1件だけ
  insert into t_results select 'leaderboard dedup', count(*) filter (where nickname = 'テスト太郎') = 1, string_agg(nickname || ':' || clear_time_ms, ',') from public.get_leaderboard(1, 100);
  -- 運営が隠した名前で再登録しても、最初から隠れている
  update public.stage_clears set hidden = true where nickname = 'テスト太郎';
  r2 := public.start_run(1, 'test-key', 'desktop', 0);
  update public.runs set started_at = now() - interval '200 seconds' where id = r2;
  select * into res from public.submit_clear(r2, 'テスト太郎', 104000, 0);
  insert into t_results values ('hidden nickname stays hidden',
    (select hidden from public.stage_clears where id = res.clear_id)
    and not exists (select 1 from public.get_leaderboard(1, 100) where nickname = 'テスト太郎'), '');
end $$;
do $$
begin
  -- 不可能なタイムの行（旧APIで入ったもの）は hidden にできる（CHECK 制約は hidden の行を対象外にしている）。
  -- 隠していない状態には戻せない
  begin
    insert into public.stage_clears (nickname, department, clear_time_ms, hidden) values ('legacy-cheat', 1, 1, true);
    insert into t_results values ('impossible time allowed when hidden', true, '');
  exception when others then insert into t_results values ('impossible time allowed when hidden', false, sqlerrm); end;
  begin
    update public.stage_clears set hidden = false where nickname = 'legacy-cheat';
    insert into t_results values ('impossible time cannot be unhidden', false, '');
  exception when others then insert into t_results values ('impossible time cannot be unhidden', sqlstate = '23514', sqlerrm); end;
  insert into t_results values ('impossible time not ranked', not exists (select 1 from public.get_leaderboard(1, 100) where nickname = 'legacy-cheat'), '');
  begin
    insert into public.stage_clears (nickname, department, clear_time_ms) values ('x', 1, 1);
    insert into t_results values ('check constraint', false, '');
  exception when others then insert into t_results values ('check constraint', sqlstate in ('23514', '42501'), sqlerrm); end;
  -- 存在しない run
  begin perform public.submit_clear(gen_random_uuid(), 'a', 105000, 0); insert into t_results values ('unknown run rejected', false, '');
  exception when others then insert into t_results values ('unknown run rejected', sqlerrm = 'run_not_found', sqlerrm); end;
  -- レート制限：同じクライアントは1分に300回まで
  begin
    for i in 1..310 loop perform public.start_run(3, 'flood-key', null, 0); end loop;
    insert into t_results values ('rate limit (client key)', false, '');
  exception when others then insert into t_results values ('rate limit (client key)', sqlerrm = 'rate_limited', sqlerrm); end;
  -- 直接呼び出し（client_key なし・毎回違う key）でも接続元IPで制限する
  perform set_config('request.headers', '{"x-real-ip":"203.0.113.77"}', true);
  begin
    for i in 1..310 loop perform public.start_run(3, null, null, 0); end loop;
    insert into t_results values ('rate limit (no key → source ip)', false, '');
  exception when others then insert into t_results values ('rate limit (no key → source ip)', sqlerrm = 'rate_limited', sqlerrm); end;
  begin
    for i in 1..1210 loop perform public.start_run(3, 'random-' || i, null, 0); end loop;
    insert into t_results values ('rate limit (random keys → source ip)', false, '');
  exception when others then insert into t_results values ('rate limit (random keys → source ip)', sqlerrm = 'rate_limited', sqlerrm); end;
  perform set_config('request.headers', '', true);
  -- 学科IDの範囲外
  begin perform public.start_run(9, null, null, 0); insert into t_results values ('bad dept', false, '');
  exception when others then insert into t_results values ('bad dept', sqlerrm = 'invalid_department', sqlerrm); end;
end $$;
select * from t_results;
rollback;
