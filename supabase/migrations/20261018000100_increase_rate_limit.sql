-- 高専祭当日の同時接続対策：start_run のレート制限を緩和（2026-10-18）
--
-- 背景：
-- 当日最大100人規模の同時アクセス時、会場 Wi-Fi 経由で同一IPを共有する来場者が
-- 一斉にゲームを開始したりリトライしたりすると、現行の 120回/分（毎秒2回）の
-- 同一IP制限に引っかかるリスクがある。
-- 負荷試験によりインフラ（Supabase/Vercel）は秒間20リクエスト（1200回/分）以上を
-- 安定して処理できる能力を確認したため、安全マージンを確保して制限値を引き上げる。
--
-- 変更内容：
-- ・同一クライアント（client_key）：1分間に 120回 → 300回（毎秒5回ペースまで許容）
-- ・全体・同一接続元（source_key）：1分間に 600回 → 1200回（毎秒20回ペースまで許容）

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

  -- 同じクライアント（API が渡す来場者IPのハッシュ）は1分に300回まで。
  -- 会場の Wi-Fi などで大勢が同じ IP を共有しても引っかからないよう、高専祭の同時100人規模に合わせて緩和
  if v_key is not null and (
    select count(*) from public.runs where client_key = v_key and started_at > now() - interval '1 minute'
  ) >= 300 then
    raise exception 'rate_limited' using errcode = 'PT429';
  end if;
  -- 同じ接続元からは1分に1200回まで（API 経由の全来場者の合計もここに入るので、高専祭の規模より十分大きく）
  if v_source is not null and (
    select count(*) from public.runs where source_key = v_source and started_at > now() - interval '1 minute'
  ) >= 1200 then
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
