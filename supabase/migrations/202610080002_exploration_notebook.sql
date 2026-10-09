begin;
alter table public.market_articles add column if not exists topic text not null default 'other';
alter table public.market_articles add column if not exists sector text not null default 'all';
update public.market_articles set topic=case when source='SEC' and title ~* '10-[kq]' then 'earnings' when source='SEC' then 'corporate' when source='Federal Reserve' and category='industry' then 'regulation' when source='Federal Reserve' then 'rates' when source='BLS' and title ~* '(price|inflation|cpi|ppi)' then 'inflation' when source='BLS' then 'jobs' else 'other' end,
 sector=case when tickers && array['AAPL','MSFT'] then 'technology' when tickers && array['NFLX'] then 'communications' when cardinality(tickers)>0 then 'consumer' when source='Federal Reserve' and category='industry' then 'financials' else 'all' end;
create index if not exists market_articles_topic_date on public.market_articles(topic,published_at desc);
create index if not exists market_articles_sector_date on public.market_articles(sector,published_at desc);
create table public.personal_notes (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 title text not null check(length(trim(title)) between 1 and 160),body text not null check(length(trim(body)) between 1 and 12000),
 version integer not null default 1 check(version>0),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),archived_at timestamptz
);
create index personal_notes_owner on public.personal_notes(user_id,updated_at desc);
alter table public.personal_notes enable row level security;
revoke all on public.personal_notes from anon,authenticated;
grant select,insert,update on public.personal_notes to authenticated;
grant all on public.personal_notes to service_role;
create policy notes_read on public.personal_notes for select to authenticated using(user_id=auth.uid() and not coalesce((auth.jwt()->>'is_anonymous')::boolean,false));
create policy notes_insert on public.personal_notes for insert to authenticated with check(user_id=auth.uid() and not coalesce((auth.jwt()->>'is_anonymous')::boolean,false));
create policy notes_update on public.personal_notes for update to authenticated using(user_id=auth.uid() and not coalesce((auth.jwt()->>'is_anonymous')::boolean,false)) with check(user_id=auth.uid() and not coalesce((auth.jwt()->>'is_anonymous')::boolean,false));
create table public.content_feedback (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 target_key text not null check(length(target_key) between 1 and 100),analysis_id uuid references public.analysis_versions(id) on delete cascade,concept_key text,
 score smallint not null check(score between 1 and 5),reason text check(reason in ('jargon','too_long','connection','unanswered','factual_error')),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(user_id,target_key),
 check(num_nonnulls(analysis_id,concept_key)=1),
 check((analysis_id is not null and concept_key is null and target_key='analysis:'||analysis_id::text) or (analysis_id is null and concept_key in ('stock','revenue-profit','margin','price-value','market-order','limit-order','cash-flow','eps','annual-quarter') and target_key='concept:'||concept_key))
);
alter table public.content_feedback enable row level security;
revoke all on public.content_feedback from anon,authenticated;
grant select,insert,update on public.content_feedback to authenticated;
grant all on public.content_feedback to service_role;
create policy feedback_read on public.content_feedback for select to authenticated using(user_id=auth.uid() and not coalesce((auth.jwt()->>'is_anonymous')::boolean,false));
create policy feedback_insert on public.content_feedback for insert to authenticated with check(user_id=auth.uid() and not coalesce((auth.jwt()->>'is_anonymous')::boolean,false) and (concept_key is not null or exists(select 1 from public.analysis_versions a where a.id=analysis_id and (a.is_public or a.owner_id=auth.uid()))));
create policy feedback_update on public.content_feedback for update to authenticated using(user_id=auth.uid() and not coalesce((auth.jwt()->>'is_anonymous')::boolean,false)) with check(user_id=auth.uid() and not coalesce((auth.jwt()->>'is_anonymous')::boolean,false) and (concept_key is not null or exists(select 1 from public.analysis_versions a where a.id=analysis_id and (a.is_public or a.owner_id=auth.uid()))));
create table public.stock_chart_cache (
 ticker text not null references public.companies(ticker),range text not null check(range in ('live','5d')),
 payload jsonb not null default '{}' check(jsonb_typeof(payload)='object'),expires_at timestamptz not null default '-infinity',lease_until timestamptz not null default '-infinity',updated_at timestamptz,
 primary key(ticker,range)
);
alter table public.stock_chart_cache enable row level security;
revoke all on public.stock_chart_cache from anon,authenticated;
grant select on public.stock_chart_cache to anon,authenticated;
grant all on public.stock_chart_cache to service_role;
create policy chart_cache_read on public.stock_chart_cache for select to anon,authenticated using(true);
create function public.reserve_chart_refresh(p_ticker text,p_range text) returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare claimed integer;
begin
 if p_range not in ('live','5d') or not exists(select 1 from public.companies where ticker=p_ticker) then return false; end if;
 insert into public.stock_chart_cache(ticker,range,lease_until) values(p_ticker,p_range,now()+interval '40 seconds')
 on conflict(ticker,range) do update set lease_until=now()+interval '40 seconds' where stock_chart_cache.expires_at<=now() and stock_chart_cache.lease_until<=now();
 get diagnostics claimed=row_count;return claimed=1;
end;$$;
revoke all on function public.reserve_chart_refresh(text,text) from public,anon,authenticated;
grant execute on function public.reserve_chart_refresh(text,text) to service_role;
commit;
