-- Additive migration: historical AI outputs and prompts are retained.
begin;
create table if not exists public.stock_data (
 ticker text not null check (ticker ~ '^[A-Z.]{1,12}$'),
 kind text not null check (kind in ('price','financials','filings')),
 payload jsonb not null check (jsonb_typeof(payload) = 'object'),
 source text not null check (source in ('SEC','Alpaca IEX')),
 as_of timestamptz not null,
 updated_at timestamptz not null default now(),
 primary key(ticker,kind)
);
create table if not exists public.market_articles (
 id uuid primary key default gen_random_uuid(),
 source_key text not null unique,
 title text not null check (length(title) between 1 and 500),
 excerpt text not null default '' check (length(excerpt)<=3000),
 source text not null check (source in ('SEC','Federal Reserve','BLS')),
 source_url text not null check (source_url ~ '^https://(www\.sec\.gov/Archives/|www\.federalreserve\.gov/|www\.bls\.gov/)'),
 category text not null check(category in ('market','industry','company')),
 tickers text[] not null default '{}',
 published_at timestamptz not null,
 collected_at timestamptz not null default now(),
 sec_news_id uuid references public.news_items(id) on delete set null
);
create index if not exists market_articles_date_idx on public.market_articles(published_at desc);
create index if not exists market_articles_tickers_idx on public.market_articles using gin(tickers);
create table if not exists public.data_sync_runs (
 id uuid primary key default gen_random_uuid(),
 started_at timestamptz not null default now(),
 finished_at timestamptz,
 status text not null check(status in ('running','completed','partial','failed')),
 report jsonb not null default '{}'
);
create table if not exists public.knowledge_bookmarks (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 source_key text not null check(length(source_key) between 1 and 200),
 kind text not null check(kind in ('concept','term','sentence')),
 analysis_id uuid references public.analysis_versions(id) on delete set null,
 ticker text references public.companies(ticker),
 text text not null check(length(text) between 1 and 2000),
 explanation text not null check(length(explanation) between 1 and 6000),
 source_url text not null check(source_url like '/%' and source_url not like '//%'),
 provenance text not null check(provenance in ('Learning library','AI explanation')),
 created_at timestamptz not null default now(),
 unique(user_id,source_key)
);
alter table public.stock_data enable row level security;
alter table public.market_articles enable row level security;
alter table public.data_sync_runs enable row level security;
alter table public.knowledge_bookmarks enable row level security;
revoke all on public.stock_data,public.market_articles,public.data_sync_runs,public.knowledge_bookmarks from anon,authenticated;
grant select on public.stock_data,public.market_articles to anon,authenticated;
grant select,delete on public.knowledge_bookmarks to authenticated;
grant all on public.stock_data,public.market_articles,public.data_sync_runs,public.knowledge_bookmarks to service_role;
-- No client inserts: server resolves and snapshots canonical explanations.
drop policy if exists stock_data_read on public.stock_data;
create policy stock_data_read on public.stock_data for select to anon,authenticated using(true);
drop policy if exists market_articles_read on public.market_articles;
create policy market_articles_read on public.market_articles for select to anon,authenticated using(true);
drop policy if exists bookmarks_read_own on public.knowledge_bookmarks;
create policy bookmarks_read_own on public.knowledge_bookmarks for select to authenticated
 using(user_id=auth.uid() and not coalesce((auth.jwt()->>'is_anonymous')::boolean,false));
drop policy if exists bookmarks_delete_own on public.knowledge_bookmarks;
create policy bookmarks_delete_own on public.knowledge_bookmarks for delete to authenticated
 using(user_id=auth.uid() and not coalesce((auth.jwt()->>'is_anonymous')::boolean,false));
commit;
