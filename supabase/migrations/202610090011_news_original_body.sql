-- Source bodies are provider text, never executable HTML. Existing public-read / server-write RLS remains unchanged.
alter table public.market_articles add column if not exists body_text text;
alter table public.market_articles add constraint market_article_body_length check(body_text is null or length(body_text) between 1 and 200000);
