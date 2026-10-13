-- 高専ダッシュ！ 不正タイム対策・ランキング集約・プレイ記録（アナリティクス）
--
-- このマイグレーションは「今の本番コード（stage_clears へ直接 INSERT する旧API）」とも互換。
-- 直接 INSERT を禁止するのは次の 20261013000200_lockdown_direct_insert.sql で行う。
--
-- 追加するもの
--   runs                 : 1プレイ = 1行。スタート時に作り、クリア時に1回だけ使える（プレイ記録・分析にも使う）
--   ng_words             : ニックネームの禁止語（当日でも SQL で追加できる）
--   stage_clears 列追加  : run_id / misses / hidden（運営が不適切な名前を非表示にする）
--   min_clear_time_ms()  : 学科ごとの物理的な最短タイム（lib/game/limits.ts と同じ値）
--   start_run()          : プレイ開始（RPC）。同一クライアントの連続開始を制限
--   submit_clear()       : クリア登録（RPC）。タイム・経過時間・ニックネームを検証して登録し、順位を返す
--   get_leaderboard()    : 学科別ランキング（同じニックネームは最速1件だけ）
--   get_clear()          : シェアページ用に1件取得（順位つき）
--   analytics スキーマ   : 集計ビュー（API には公開しない。ダッシュボードの SQL エディタで見る）

-- ── 最短タイム ───────────────────────────────────────────────────────────────
create or replace function public.min_clear_time_ms(p_department integer)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case p_department
    when 1 then 100000  -- 機械（理論値 約104.8秒）
    when 2 then 100000  -- 電気電子（理論値 約104.8秒）
    when 3 then 59000   -- 電子情報（ずっとデバッグモードでも 約61.7秒）
    when 4 then 144000  -- 生物応化（理論値 約149.0秒）
    when 5 then 72000   -- 材料（ずっと板バネ加速でも 約74.9秒）
  end
$$;

-- ── stage_clears の拡張 ─────────────────────────────────────────────────────
alter table public.stage_clears
  add column if not exists run_id uuid,
  add column if not exists misses integer check (misses is null or misses between 0 and 10000),
  add column if not exists hidden boolean not null default false;

-- 不可能なタイムを DB で弾く（旧APIの直接 INSERT にも効く）。既存行は検証しない（NOT VALID）
alter table public.stage_clears drop constraint if exists stage_clears_time_range;
alter table public.stage_clears
  add constraint stage_clears_time_range
  check (clear_time_ms >= public.min_clear_time_ms(department) and clear_time_ms <= 600000) not valid;

-- ランキング集約（ニックネームごとの最速）用
create index if not exists idx_stage_clears_dept_nick_time
  on public.stage_clears (department, nickname, clear_time_ms);

-- ── runs（1プレイ）────────────────────────────────────────────────────────────
create table if not exists public.runs (
  id uuid primary key default gen_random_uuid(),
  department integer not null check (department between 1 and 5),
  client_key text,                                   -- IP のハッシュ（連続開始の制限用。生の IP は保存しない）
  device text check (device in ('mobile', 'tablet', 'desktop', 'unknown')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  clear_time_ms integer,
  misses integer
);
create index if not exists idx_runs_client_started on public.runs (client_key, started_at desc);
create index if not exists idx_runs_started on public.runs (started_at desc);
alter table public.runs enable row level security;  -- ポリシーなし＝RPC（SECURITY DEFINER）経由でしか触れない
revoke all on public.runs from anon, authenticated;

alter table public.stage_clears drop constraint if exists stage_clears_run_id_fkey;
alter table public.stage_clears
  add constraint stage_clears_run_id_fkey foreign key (run_id) references public.runs (id) on delete set null;
create unique index if not exists uq_stage_clears_run_id on public.stage_clears (run_id) where run_id is not null;

-- ── NGワード ──────────────────────────────────────────────────────────────────
create table if not exists public.ng_words (
  word text primary key check (word = lower(word) and length(word) > 0)
);
alter table public.ng_words enable row level security;
revoke all on public.ng_words from anon, authenticated;

insert into public.ng_words (word) values
  -- 部分一致で判定するので、普通の名前に含まれやすい短い語（例: skill の kill）は入れない
  ('ちんこ'), ('ちんぽ'), ('まんこ'), ('うんこ'), ('せっくす'), ('おっぱい'),
  ('死ね'), ('殺す'), ('ころしてやる'), ('ガイジ'), ('がいじ'), ('めくら'), ('つんぼ'),
  ('きちがい'), ('キチガイ'), ('基地外'), ('池沼'), ('レイプ'), ('れいぷ'), ('セックス'),
  ('チンコ'), ('チンポ'), ('マンコ'), ('ウンコ'), ('オッパイ'),
  ('fuck'), ('shit'), ('bitch'), ('pussy'), ('penis'), ('vagina'), ('nigger'), ('nigga'),
  ('porn'), ('asshole'), ('cunt')
on conflict do nothing;

-- ニックネームの正規化（全角→半角・大文字→小文字・空白除去）
create or replace function public.normalize_nickname(p text)
returns text
language sql
immutable
set search_path = ''
as $$
  select regexp_replace(lower(normalize(coalesce(p, ''), NFKC)), '[[:space:]_\-・.。、,]+', '', 'g')
$$;

create or replace function public.is_nickname_allowed(p_nickname text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (
    select 1 from public.ng_words w
    where position(public.normalize_nickname(w.word) in public.normalize_nickname(p_nickname)) > 0
  )
$$;

-- ── プレイ開始 ────────────────────────────────────────────────────────────────
-- エラーの errcode 'PTxxx' は PostgREST が HTTP ステータス xxx に変換する。
create or replace function public.start_run(p_department integer, p_client_key text default null, p_device text default null)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if p_department is null or p_department not between 1 and 5 then
    raise exception 'invalid_department' using errcode = 'PT400';
  end if;
  -- 同じクライアントからの開始は1分に30回まで（通常のリトライ連打でも届かない回数）
  if p_client_key is not null and (
    select count(*) from public.runs
    where client_key = p_client_key and started_at > now() - interval '1 minute'
  ) >= 30 then
    raise exception 'rate_limited' using errcode = 'PT429';
  end if;
  insert into public.runs (department, client_key, device)
  values (
    p_department,
    left(p_client_key, 64),
    case when p_device in ('mobile', 'tablet', 'desktop') then p_device else 'unknown' end
  )
  returning id into v_id;
  return v_id;
end;
$$;

-- ── 順位（同じニックネームは最速1件で数える）─────────────────────────────────
create or replace function public.rank_of(p_department integer, p_clear_time_ms integer)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select 1 + count(*)::integer from (
    select nickname, min(clear_time_ms) as best
    from public.stage_clears
    where department = p_department and not hidden
    group by nickname
  ) b
  where b.best < p_clear_time_ms
$$;

-- ── クリア登録 ────────────────────────────────────────────────────────────────
-- 検証：run が存在・未使用・30分以内／学科の最短タイム以上・10分以下／
--       サーバーで計った経過時間がクリアタイムより短くない（通信の遅れぶん10秒の余裕）／ニックネーム
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
  v_elapsed_ms := extract(epoch from (now() - v_run.started_at)) * 1000;
  if v_elapsed_ms + 10000 < p_clear_time_ms then
    raise exception 'time_mismatch' using errcode = 'PT422';
  end if;

  select min(sc.clear_time_ms) into v_prev_best
  from public.stage_clears sc
  where sc.department = v_run.department and sc.nickname = v_nick and not sc.hidden;

  update public.runs
  set finished_at = now(), clear_time_ms = p_clear_time_ms,
      misses = case when p_misses between 0 and 10000 then p_misses end
  where id = v_run.id;

  insert into public.stage_clears (nickname, department, clear_time_ms, run_id, misses)
  values (v_nick, v_run.department, p_clear_time_ms, v_run.id,
          case when p_misses between 0 and 10000 then p_misses end)
  returning id into v_id;

  return query
  select
    v_id,
    public.rank_of(v_run.department, least(p_clear_time_ms, coalesce(v_prev_best, p_clear_time_ms))),
    least(p_clear_time_ms, coalesce(v_prev_best, p_clear_time_ms)),
    v_prev_best is null or p_clear_time_ms < v_prev_best,
    (select count(distinct nickname)::integer from public.stage_clears
      where department = v_run.department and not hidden);
end;
$$;

-- ── ランキング（ニックネームごとの最速1件）────────────────────────────────────
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
    where sc.department = p_department and not sc.hidden
    order by sc.nickname, sc.clear_time_ms asc, sc.played_at asc
  ) b
  order by b.clear_time_ms asc, b.played_at asc
  limit least(greatest(coalesce(p_limit, 10), 1), 100)
$$;

-- ── 1件取得（シェアページ用）────────────────────────────────────────────────
create or replace function public.get_clear(p_id uuid)
returns table (id uuid, nickname text, department integer, clear_time_ms integer, played_at timestamptz, rank integer)
language sql
stable
security definer
set search_path = ''
as $$
  select sc.id, sc.nickname, sc.department, sc.clear_time_ms, sc.played_at,
         public.rank_of(sc.department, sc.clear_time_ms)
  from public.stage_clears sc
  where sc.id = p_id and not sc.hidden
$$;

-- 内部用の関数は API から呼べないようにする
revoke execute on function public.is_nickname_allowed(text) from public, anon, authenticated;
revoke execute on function public.rank_of(integer, integer) from public, anon, authenticated;
grant execute on function public.start_run(integer, text, text) to anon, authenticated;
grant execute on function public.submit_clear(uuid, text, integer, integer) to anon, authenticated;
grant execute on function public.get_leaderboard(integer, integer) to anon, authenticated;
grant execute on function public.get_clear(uuid) to anon, authenticated;

-- ── 分析用ビュー（analytics スキーマは API に公開しない）──────────────────────
create schema if not exists analytics;
revoke all on schema analytics from public, anon, authenticated;

create or replace view analytics.department_summary as
select
  r.department,
  count(*)                                                        as starts,
  count(r.finished_at)                                            as clears,
  round(100.0 * count(r.finished_at) / nullif(count(*), 0), 1)    as clear_rate_pct,
  round((percentile_cont(0.5) within group (order by r.clear_time_ms) / 1000.0)::numeric, 1) as median_clear_sec,
  round(avg(r.misses)::numeric, 1)                                as avg_misses,
  count(*) filter (where r.device = 'mobile')                     as mobile_starts
from public.runs r
group by r.department
order by r.department;

create or replace view analytics.hourly as
select
  date_trunc('hour', r.started_at at time zone 'Asia/Tokyo') as hour_jst,
  r.department,
  count(*)              as starts,
  count(r.finished_at)  as clears
from public.runs r
group by 1, 2
order by 1 desc, 2;
