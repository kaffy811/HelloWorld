begin;
-- Shared refresh lease: one provider batch for all viewers/workers.
create table public.market_refresh_state(
 id integer primary key check(id=1), payload jsonb not null default '{}',
 expires_at timestamptz not null default '-infinity', lease_until timestamptz not null default '-infinity',
 updated_at timestamptz
);
alter table public.market_refresh_state enable row level security;
revoke all on public.market_refresh_state from public,anon,authenticated;
grant all on public.market_refresh_state to service_role;
create function public.reserve_market_refresh() returns boolean language plpgsql security definer set search_path='' as $$
declare n integer;
begin
 insert into public.market_refresh_state(id,lease_until) values(1,now()+interval '25 seconds')
 on conflict(id) do update set lease_until=excluded.lease_until
 where market_refresh_state.expires_at<=now() and market_refresh_state.lease_until<=now();
 get diagnostics n=row_count;return n=1;
end;$$;
revoke all on function public.reserve_market_refresh() from public,anon,authenticated;
grant execute on function public.reserve_market_refresh() to service_role;
-- Official documents are cached by URL/hash. Browsers cannot overwrite sources.
create table public.filing_documents(
 source_url text primary key check(source_url ~ '^https://www[.]sec[.]gov/Archives/edgar/data/[0-9]+/[0-9]+/[A-Za-z0-9_.-]+[.]html?$'),
 full_text text not null check(length(full_text) between 200 and 2000000),
 content_sha256 text not null check(length(content_sha256)=64),
 retrieved_at timestamptz not null default now(),char_count integer not null check(char_count between 200 and 2000000)
);
alter table public.filing_documents enable row level security;
revoke all on public.filing_documents from public,anon,authenticated;
grant all on public.filing_documents to service_role;
-- A language/context change makes a new conversation; previous rated records stay intact.
alter table public.ai_conversations add column source_version text not null default 'legacy';
alter table public.ai_conversations drop constraint ai_conversations_owner_id_source_kind_source_id_language_key;
alter table public.ai_conversations add unique(owner_id,source_kind,source_id,language,source_version);
alter table public.ai_daily_sets drop constraint ai_daily_sets_pkey;
alter table public.ai_daily_sets add primary key(owner_id,day,language);
alter table public.ai_daily_sets add constraint ai_daily_language_check check(language in ('en','zh-Hans'));
commit;
