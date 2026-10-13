-- コードレビューで見つかった問題の修正（2026-10-13）
--
-- 1. 順位の数え方を統一：「自分以外のプレイヤーの自己ベストのうち、このタイムより速いものの数 + 1」。
--    リザルト・シェア文・シェアページ（get_clear）が同じ値になる（自己ベスト更新でないプレイでも食い違わない）
-- 2. ランキング・順位の対象は「hidden でなく、学科の最短タイム以上の記録」だけ（旧APIで入った不可能なタイムを除く）
-- 3. CHECK 制約は hidden の行を対象外にする（不可能なタイムの古い行も hidden = true にできるように）
-- 4. 運営が隠したニックネームで再登録しても、その記録は最初から hidden（隠したはずの名前が復活しない）
-- 5. start_run：
--    ・スタートの通信が遅れても正しい記録が弾かれないよう、クライアントが「ゲーム開始から何ms後に送ったか」
--      （最大30秒）だけ開始時刻をさかのぼる
--    ・p_client_key を渡さずに直接呼ばれても、接続元IP（PostgREST のリクエストヘッダー）で数えて制限する
--
-- 関数の引数・名前を変えるものは、旧版を *_legacy に改名してから作り直す（削除はしない）。

-- ── 共通：ランキングの対象になる記録か ─────────────────────────────────────
create or replace function public.is_ranked_clear(p_department integer, p_clear_time_ms integer, p_hidden boolean)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select not p_hidden and p_clear_time_ms >= public.min_clear_time_ms(p_department)
$$;

-- ── 3. CHECK 制約：hidden の行は対象外 ───────────────────────────────────────
alter table public.stage_clears drop constraint if exists stage_clears_time_range;
alter table public.stage_clears
  add constraint stage_clears_time_range
  check (hidden or (clear_time_ms >= public.min_clear_time_ms(department) and clear_time_ms <= 600000)) not valid;

-- ── 1. 順位 ─────────────────────────────────────────────────────────────────
do $$
begin
  if to_regprocedure('public.rank_of(integer, integer)') is not null then
    alter function public.rank_of(integer, integer) rename to rank_of_legacy;
  end if;
end $$;

create or replace function public.rank_of(p_department integer, p_clear_time_ms integer, p_nickname text)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select 1 + count(*)::integer from (
    select sc.nickname, min(sc.clear_time_ms) as best
    from public.stage_clears sc
    where sc.department = p_department
      and public.is_ranked_clear(sc.department, sc.clear_time_ms, sc.hidden)
      and sc.nickname is distinct from p_nickname
    group by sc.nickname
  ) b
  where b.best < p_clear_time_ms
$$;

-- ── 5. プレイ開始 ───────────────────────────────────────────────────────────
alter table public.runs add column if not exists source_key text;  -- 接続元IPのハッシュ（直接呼び出しの制限用）
create index if not exists idx_runs_source_started on public.runs (source_key, started_at desc);

do $$
begin
  if to_regprocedure('public.start_run(integer, text, text)') is not null then
    alter function public.start_run(integer, text, text) rename to start_run_legacy;
  end if;
end $$;

create or replace function public.start_run(
  p_department integer, p_client_key text, p_device text, p_started_ago_ms integer
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_headers json := nullif(current_setting('request.headers', true), '')::json;
  v_ip text;
  v_source text;
  v_key text;
begin
  if p_department is null or p_department not between 1 and 5 then
    raise exception 'invalid_department' using errcode = 'PT400';
  end if;

  -- 接続元IP（API 経由なら Vercel のサーバー、直接呼び出しならその人）。生のIPは保存しない
  v_ip := nullif(btrim(split_part(coalesce(
    v_headers->>'cf-connecting-ip', v_headers->>'x-real-ip', v_headers->>'x-forwarded-for', ''), ',', 1)), '');
  v_source := case when v_ip is not null then md5('kosendash:' || v_ip) end;
  v_key := left(coalesce(p_client_key, v_source), 64);

  -- 同じクライアント（API が渡す来場者IPのハッシュ）は1分に120回まで。
  -- 会場の Wi-Fi などで大勢が同じ IP を共有しても引っかからないよう、緩めにしている
  if v_key is not null and (
    select count(*) from public.runs where client_key = v_key and started_at > now() - interval '1 minute'
  ) >= 120 then
    raise exception 'rate_limited' using errcode = 'PT429';
  end if;
  -- 同じ接続元からは1分に600回まで（API 経由の全来場者の合計もここに入るので、高専祭の規模より十分大きく）
  if v_source is not null and (
    select count(*) from public.runs where source_key = v_source and started_at > now() - interval '1 minute'
  ) >= 600 then
    raise exception 'rate_limited' using errcode = 'PT429';
  end if;

  insert into public.runs (department, client_key, source_key, device, started_at)
  values (
    p_department, v_key, v_source,
    case when p_device in ('mobile', 'tablet', 'desktop') then p_device else 'unknown' end,
    -- ゲーム開始からこのリクエストまでの遅れ（最大30秒）だけ開始時刻をさかのぼる
    now() - make_interval(secs => least(greatest(coalesce(p_started_ago_ms, 0), 0), 30000) / 1000.0)
  )
  returning id into v_id;
  return v_id;
end;
$$;

-- ── クリア登録（1・2・4）──────────────────────────────────────────────────────
create or replace function public.submit_clear(
  p_run_id uuid, p_nickname text, p_clear_time_ms integer, p_misses integer default null
)
returns table (
  clear_id uuid, rank integer, best_ms integer, is_personal_best boolean, total_players integer
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_run public.runs%rowtype;
  v_nick text := btrim(coalesce(p_nickname, ''));
  v_prev_best integer;
  v_hidden boolean;
  v_id uuid;
  v_elapsed_ms double precision;
begin
  select * into v_run from public.runs where id = p_run_id for update;
  if not found then
    raise exception 'run_not_found' using errcode = 'PT404';
  end if;
  if v_run.finished_at is not null then
    raise exception 'run_already_finished' using errcode = 'PT409';
  end if;
  if v_run.started_at < now() - interval '30 minutes' then
    raise exception 'run_expired' using errcode = 'PT410';
  end if;
  if char_length(v_nick) = 0 or char_length(v_nick) > 20 then
    raise exception 'invalid_nickname' using errcode = 'PT400';
  end if;
  if not public.is_nickname_allowed(v_nick) then
    raise exception 'nickname_rejected' using errcode = 'PT422';
  end if;
  if p_clear_time_ms is null
     or p_clear_time_ms < public.min_clear_time_ms(v_run.department)
     or p_clear_time_ms > 600000 then
    raise exception 'invalid_time' using errcode = 'PT422';
  end if;
  -- サーバーで測った開始からの経過時間（通信の遅れぶん10秒の余裕）より長いタイムは受け付けない
  v_elapsed_ms := extract(epoch from (now() - v_run.started_at)) * 1000;
  if v_elapsed_ms + 10000 < p_clear_time_ms then
    raise exception 'time_mismatch' using errcode = 'PT422';
  end if;

  -- 運営が隠したニックネームなら、新しい記録も最初から隠す
  v_hidden := exists (select 1 from public.stage_clears sc where sc.nickname = v_nick and sc.hidden);

  select min(sc.clear_time_ms) into v_prev_best
  from public.stage_clears sc
  where sc.department = v_run.department and sc.nickname = v_nick
    and public.is_ranked_clear(sc.department, sc.clear_time_ms, sc.hidden);

  update public.runs
  set finished_at = now(), clear_time_ms = p_clear_time_ms,
      misses = case when p_misses between 0 and 10000 then p_misses end
  where id = v_run.id;

  insert into public.stage_clears (nickname, department, clear_time_ms, run_id, misses, hidden)
  values (v_nick, v_run.department, p_clear_time_ms, v_run.id,
          case when p_misses between 0 and 10000 then p_misses end, v_hidden)
  returning id into v_id;

  return query
  select
    v_id,
    public.rank_of(v_run.department, p_clear_time_ms, v_nick),
    least(p_clear_time_ms, coalesce(v_prev_best, p_clear_time_ms)),
    v_prev_best is null or p_clear_time_ms < v_prev_best,
    (select count(distinct sc.nickname)::integer from public.stage_clears sc
      where sc.department = v_run.department
        and public.is_ranked_clear(sc.department, sc.clear_time_ms, sc.hidden));
end;
$$;

-- ── ランキング（2）─────────────────────────────────────────────────────────────
create or replace function public.get_leaderboard(p_department integer, p_limit integer default 10)
returns table (id uuid, nickname text, department integer, clear_time_ms integer, played_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select b.id, b.nickname, b.department, b.clear_time_ms, b.played_at
  from (
    select distinct on (sc.nickname) sc.id, sc.nickname, sc.department, sc.clear_time_ms, sc.played_at
    from public.stage_clears sc
    where sc.department = p_department
      and public.is_ranked_clear(sc.department, sc.clear_time_ms, sc.hidden)
    order by sc.nickname, sc.clear_time_ms asc, sc.played_at asc
  ) b
  order by b.clear_time_ms asc, b.played_at asc
  limit least(greatest(coalesce(p_limit, 10), 1), 100)
$$;

-- ── シェアページ（1）──────────────────────────────────────────────────────────
create or replace function public.get_clear(p_id uuid)
returns table (id uuid, nickname text, department integer, clear_time_ms integer, played_at timestamptz, rank integer)
language sql
stable
security definer
set search_path = ''
as $$
  select sc.id, sc.nickname, sc.department, sc.clear_time_ms, sc.played_at,
         public.rank_of(sc.department, sc.clear_time_ms, sc.nickname)
  from public.stage_clears sc
  where sc.id = p_id and public.is_ranked_clear(sc.department, sc.clear_time_ms, sc.hidden)
$$;

-- ── 権限 ─────────────────────────────────────────────────────────────────────
revoke execute on function public.rank_of(integer, integer, text) from public, anon, authenticated;
do $$
begin
  if to_regprocedure('public.rank_of_legacy(integer, integer)') is not null then
    revoke execute on function public.rank_of_legacy(integer, integer) from public, anon, authenticated;
  end if;
  if to_regprocedure('public.start_run_legacy(integer, text, text)') is not null then
    revoke execute on function public.start_run_legacy(integer, text, text) from public, anon, authenticated;
  end if;
end $$;
grant execute on function public.start_run(integer, text, text, integer) to anon, authenticated;
