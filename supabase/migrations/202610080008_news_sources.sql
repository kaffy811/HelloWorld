-- Add sources without changing existing rows, ownership or RLS policies.
begin;
alter table public.market_articles drop constraint market_articles_source_check;
alter table public.market_articles drop constraint market_articles_source_url_check;
alter table public.market_articles add constraint market_articles_source_check
 check (source in ('SEC','Federal Reserve','BLS','BEA','Benzinga via Alpaca'));
alter table public.market_articles add constraint market_articles_source_url_check check (
 (source='SEC' and source_url ~ '^https://www\.sec\.gov/Archives/') or
 (source='Federal Reserve' and source_url ~ '^https://www\.federalreserve\.gov/') or
 (source='BLS' and source_url ~ '^https://www\.bls\.gov/') or
 (source='BEA' and source_url ~ '^https://(www|apps)\.bea\.gov/') or
 (source='Benzinga via Alpaca' and source_url ~ '^https://(www\.)?benzinga\.com/')
);
create index if not exists market_articles_source_date_idx on public.market_articles(source,published_at desc);
commit;
