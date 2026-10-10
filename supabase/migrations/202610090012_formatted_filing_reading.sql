-- Parsed SEC reading pages are generated server-side; cache RLS remains service-only.
alter table public.filing_documents add column reading_pages jsonb;
alter table public.filing_documents add column reading_version text;
alter table public.filing_documents add constraint filing_reading_pages_bounded check (reading_pages is null or (jsonb_typeof(reading_pages)='array' and jsonb_array_length(reading_pages) between 1 and 300 and octet_length(reading_pages::text)<=8000000));
