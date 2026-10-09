begin;
-- Refuse the wrong baseline or a repeated run before making any changes.
do $$
begin
 if to_regclass('public.companies') is null or to_regclass('public.profiles') is null then
  raise exception 'Use the existing hello-world-db project with companies and profiles.';
 end if;
 if to_regclass('public.news_items') is not null then
  raise exception 'US news migration is already present. Do not run it twice; inspect the schema first.';
 end if;
end;
$$;
-- Existing company introductions remain available. US scope is explicit.
alter table public.companies add column market text not null default 'US' check (market = 'US');
alter table public.companies add column cik text check (cik ~ '^[0-9]{10}$');
update public.companies set cik = case ticker when 'AAPL' then '0000320193' when 'MSFT' then '0000789019' when 'COST' then '0000909832' when 'SBUX' then '0000829224' when 'NKE' then '0000320187' when 'NFLX' then '0001065280' end where ticker in ('AAPL','MSFT','COST','SBUX','NKE','NFLX');
create table public.news_items (
 id uuid primary key default gen_random_uuid(), ticker text not null references public.companies(ticker),
 source_key text not null unique, title text not null, event_type text not null,
 source_url text not null check (source_url like 'https://www.sec.gov/Archives/%'),
 published_at timestamptz not null, evidence jsonb not null check(jsonb_typeof(evidence)='array'),
 collected_at timestamptz not null default now()
);
create table public.learning_uploads (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
 ticker text not null references public.companies(ticker), storage_path text unique,
 mime_type text, public_material_confirmed boolean not null default false,
 created_at timestamptz not null default now(),
 check(storage_path is null or storage_path like owner_id::text || '/%')
);
create table public.generation_runs (
 id uuid primary key default gen_random_uuid(), owner_id uuid references auth.users(id) on delete cascade,
 kind text not null check(kind in ('news','material','followup')), dedupe_key text not null,
 prompt jsonb not null, status text not null default 'reserved' check(status in ('reserved','completed','failed')),
 usage jsonb not null default '{}', error_code text, created_at timestamptz not null default now(), completed_at timestamptz,
 check((kind='news' and owner_id is null) or (kind in ('material','followup') and owner_id is not null))
);
create unique index active_generation_key on public.generation_runs(dedupe_key) where status in ('reserved','completed');
create index generation_daily on public.generation_runs(created_at);
create index generation_user_daily on public.generation_runs(owner_id,created_at);
create table public.analysis_versions (
 id uuid primary key default gen_random_uuid(), run_id uuid not null unique references public.generation_runs(id),
 ticker text not null references public.companies(ticker), news_id uuid references public.news_items(id),
 owner_id uuid references auth.users(id) on delete cascade,
 kind text not null check(kind in ('news','material','followup')),
 parent_id uuid references public.analysis_versions(id), upload_id uuid references public.learning_uploads(id),
 content jsonb not null check(jsonb_typeof(content)='object'), evidence jsonb not null check(jsonb_typeof(evidence)='array'),
 language text not null check(language in ('en','zh-Hans')), data_as_of timestamptz not null,
 is_public boolean not null default false, created_at timestamptz not null default now(),
 check((kind='news' and owner_id is null and news_id is not null and parent_id is null and upload_id is null and is_public) or
       (kind='material' and owner_id is not null and news_id is null and parent_id is null and upload_id is not null) or
       (kind='followup' and owner_id is not null and news_id is null and parent_id is not null and upload_id is null and not is_public))
);
create index analysis_feed on public.analysis_versions(is_public,created_at desc);
create index analysis_company on public.analysis_versions(ticker,created_at desc);
create index analysis_owner on public.analysis_versions(owner_id,created_at desc);
create table public.ratings (
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 analysis_id uuid not null references public.analysis_versions(id) on delete cascade,
 value smallint not null check(value in (-1,1)),
 reason text check(reason in ('jargon','too_long','connection','unanswered','factual_error')),
 created_at timestamptz not null default now(), primary key(user_id,analysis_id),
 check(reason is null or value=-1)
);
create index ratings_analysis on public.ratings(analysis_id);
create table public.watchlist (
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 ticker text not null references public.companies(ticker), created_at timestamptz not null default now(),
 primary key(user_id,ticker)
);
alter table public.news_items enable row level security;
alter table public.learning_uploads enable row level security;
alter table public.generation_runs enable row level security;
alter table public.analysis_versions enable row level security;
alter table public.ratings enable row level security;
alter table public.watchlist enable row level security;
revoke all on public.news_items, public.learning_uploads, public.generation_runs, public.analysis_versions, public.ratings, public.watchlist from anon, authenticated;
grant select on public.news_items, public.analysis_versions to anon, authenticated;
grant select on public.learning_uploads, public.generation_runs, public.ratings, public.watchlist to authenticated;
grant insert(user_id,analysis_id,value,reason) on public.ratings to authenticated;
grant insert(user_id,ticker),delete on public.watchlist to authenticated;
grant all on public.news_items, public.learning_uploads, public.generation_runs, public.analysis_versions, public.ratings, public.watchlist to service_role;
create policy "Published explanations or own work" on public.analysis_versions for select to anon,authenticated using(is_public or owner_id=(select auth.uid()));
create policy "Only analyzed news is visible" on public.news_items for select to anon,authenticated using(exists(select 1 from public.analysis_versions a where a.news_id=news_items.id and a.is_public));
create policy "Read own uploads" on public.learning_uploads for select to authenticated using(owner_id=(select auth.uid()));
create policy "Read own generation prompts" on public.generation_runs for select to authenticated using(owner_id=(select auth.uid()));
create policy "Read own ratings" on public.ratings for select to authenticated using(user_id=(select auth.uid()));
create policy "Vote as self on accessible explanation" on public.ratings for insert to authenticated with check(user_id=(select auth.uid()) and not coalesce((auth.jwt()->>'is_anonymous')::boolean,false) and exists(select 1 from public.analysis_versions a where a.id=analysis_id and (a.is_public or a.owner_id=(select auth.uid()))));
create policy "Read own watchlist" on public.watchlist for select to authenticated using(user_id=(select auth.uid()));
create policy "Add own watchlist" on public.watchlist for insert to authenticated with check(user_id=(select auth.uid()) and not coalesce((auth.jwt()->>'is_anonymous')::boolean,false));
create policy "Remove own watchlist" on public.watchlist for delete to authenticated using(user_id=(select auth.uid()));
-- Narrow aggregation reveals counts, never voter identities. No privileged view.
create function public.learning_rating_totals(p_ids uuid[]) returns table(analysis_id uuid,helpful bigint,unhelpful bigint)
language sql stable security definer set search_path='' as $$
 select a.id,count(r.user_id) filter(where r.value=1),count(r.user_id) filter(where r.value=-1)
 from public.analysis_versions a left join public.ratings r on r.analysis_id=a.id
 where cardinality(p_ids)<=50 and a.id=any(p_ids) and (a.is_public or a.owner_id=auth.uid()) group by a.id;
$$;
revoke all on function public.learning_rating_totals(uuid[]) from public;
grant execute on function public.learning_rating_totals(uuid[]) to anon,authenticated;
-- Serialize quota reservations in the database, including failed attempts and all workers.
create function public.reserve_learning_generation(p_owner uuid,p_kind text,p_key text,p_prompt jsonb,p_limit integer)
returns table(run_id uuid,existing_id uuid) language plpgsql security definer set search_path='' as $$
declare v_day timestamptz := date_trunc('day',now() at time zone 'America/Los_Angeles') at time zone 'America/Los_Angeles'; v_run public.generation_runs%rowtype; v_id uuid;
begin
 perform pg_advisory_xact_lock(716031);
 if p_limit not between 1 and 200 or p_kind not in ('news','material','followup') or length(p_key)<>64 or pg_column_size(p_prompt)>80000 then raise exception 'invalid reservation'; end if;
 if (p_kind='news')<>(p_owner is null) then raise exception 'invalid owner'; end if;
 select * into v_run from public.generation_runs where dedupe_key=p_key and status in ('reserved','completed') order by created_at desc limit 1;
 if found then
  select a.id into v_id from public.analysis_versions a where a.run_id=v_run.id;
  return query select null::uuid,v_id; return;
 end if;
 if (select count(*) from public.generation_runs where created_at>=v_day)>=p_limit then return; end if;
 if (select count(*) from public.generation_runs where dedupe_key=p_key)>=2 then return; end if;
 if p_owner is not null and ((select count(*) from public.generation_runs where owner_id=p_owner and created_at>=v_day)>=3 or exists(select 1 from public.generation_runs where owner_id=p_owner and created_at>now()-interval '1 minute')) then return; end if;
 insert into public.generation_runs(owner_id,kind,dedupe_key,prompt) values(p_owner,p_kind,p_key,p_prompt) returning id into v_id;
 return query select v_id,null::uuid;
end;
$$;
revoke all on function public.reserve_learning_generation(uuid,text,text,jsonb,integer) from public,anon,authenticated;
grant execute on function public.reserve_learning_generation(uuid,text,text,jsonb,integer) to service_role;
-- Publication and run completion are atomic. Only the background service can execute.
create function public.complete_learning_generation(p_run uuid,p_ticker text,p_news uuid,p_parent uuid,p_upload uuid,p_content jsonb,p_evidence jsonb,p_language text,p_as_of timestamptz,p_usage jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare r public.generation_runs%rowtype; v_id uuid;
begin
 select * into r from public.generation_runs where id=p_run for update;
 if not found or r.status<>'reserved' then raise exception 'invalid generation state'; end if;
 if jsonb_typeof(p_content)<>'object' or jsonb_typeof(p_evidence)<>'array' or jsonb_array_length(p_evidence)=0 then raise exception 'invalid output'; end if;
 if r.kind='news' and not exists(select 1 from public.news_items where id=p_news and ticker=p_ticker) then raise exception 'invalid news'; end if;
 if r.kind='material' and not exists(select 1 from public.learning_uploads where id=p_upload and owner_id=r.owner_id and ticker=p_ticker and public_material_confirmed) then raise exception 'invalid material'; end if;
 if r.kind='followup' and not exists(select 1 from public.analysis_versions where id=p_parent and ticker=p_ticker and (is_public or owner_id=r.owner_id)) then raise exception 'invalid parent'; end if;
 insert into public.analysis_versions(run_id,ticker,news_id,parent_id,upload_id,owner_id,kind,content,evidence,language,data_as_of,is_public)
 values(r.id,p_ticker,p_news,p_parent,p_upload,r.owner_id,r.kind,p_content,p_evidence,p_language,p_as_of,r.kind='news') returning id into v_id;
 update public.generation_runs set status='completed',usage=p_usage,completed_at=now() where id=r.id;
 return v_id;
end;
$$;
revoke all on function public.complete_learning_generation(uuid,text,uuid,uuid,uuid,jsonb,jsonb,text,timestamptz,jsonb) from public,anon,authenticated;
grant execute on function public.complete_learning_generation(uuid,text,uuid,uuid,uuid,jsonb,jsonb,text,timestamptz,jsonb) to service_role;
create function public.publish_own_learning(p_id uuid) returns boolean language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then return false; end if;
 update public.analysis_versions a set is_public=true where a.id=p_id and a.owner_id=auth.uid() and a.kind='material' and exists(select 1 from public.learning_uploads u where u.id=a.upload_id and u.owner_id=auth.uid() and u.public_material_confirmed);
 return found;
end;
$$;
revoke all on function public.publish_own_learning(uuid) from public,anon;
grant execute on function public.publish_own_learning(uuid) to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('learning-materials','learning-materials',false,2097152,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
create policy "Read registered own learning files" on storage.objects for select to authenticated using(bucket_id='learning-materials' and exists(select 1 from public.learning_uploads u where u.owner_id=(select auth.uid()) and u.storage_path=name));
-- No client object writes; the authenticated server reserves and writes the object.
commit;
