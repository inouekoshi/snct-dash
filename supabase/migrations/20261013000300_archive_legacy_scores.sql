-- 旧仕様（エンドレスランナー）の scores テーブルを API から外して退避する（Issue #13）。
-- 削除（DROP）ではなく、API に公開しない archive スキーマへ移す。データは残るので、
-- 不要と判断できたら Supabase ダッシュボードの SQL エディタで drop table archive.scores_20261013; する。

create schema if not exists archive;
revoke all on schema archive from public, anon, authenticated;

alter table if exists public.scores set schema archive;
alter table if exists archive.scores rename to scores_20261013;
