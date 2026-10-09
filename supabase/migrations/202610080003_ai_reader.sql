begin;
alter table public.generation_runs drop constraint generation_runs_kind_check;
alter table public.generation_runs drop constraint generation_runs_check;
alter table public.generation_runs add constraint generation_runs_owner_check check((kind='news' and owner_id is null) or (kind in ('material','followup','reader','chat','daily') and owner_id is not null));
alter table public.generation_runs add constraint generation_runs_kind_check check(kind in ('news','material','followup','reader','chat','daily'));
create table public.ai_conversations (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
 title text not null check(length(title) between 1 and 240), source_kind text not null, source_id text not null,
 source_snapshot jsonb not null check(jsonb_typeof(source_snapshot)='object'), language text not null check(language in ('en','zh-Hans')),
 saved boolean not null default false, revision integer not null default 0 check(revision>=0),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(owner_id,source_kind,source_id,language)
);
create table public.ai_outputs (
 id uuid primary key default gen_random_uuid(), run_id uuid not null references public.generation_runs(id), owner_id uuid not null references auth.users(id) on delete cascade,
 kind text not null check(kind in ('explain','translate','reply','lesson')), slot integer not null default 0,
 conversation_id uuid references public.ai_conversations(id), position integer, topic_key text,
 selected_text text, question text, content jsonb not null check(jsonb_typeof(content)='object'), source_snapshot jsonb not null,
 source_url text not null check(source_url like '/%'), language text not null check(language in ('en','zh-Hans')), created_at timestamptz not null default now(),
 unique(run_id,slot), unique(conversation_id,position),
 check((kind='reply')=(conversation_id is not null)), check((kind='lesson')=(topic_key is not null))
);
create index ai_outputs_owner on public.ai_outputs(owner_id,created_at desc);
create index ai_conversations_saved on public.ai_conversations(owner_id,saved,updated_at desc);
create table public.ai_daily_sets (
 owner_id uuid not null references auth.users(id) on delete cascade, day date not null, run_id uuid not null references public.generation_runs(id),
 language text not null, created_at timestamptz not null default now(),primary key(owner_id,day),unique(run_id)
);
create table public.ai_lesson_saves (
 owner_id uuid not null references auth.users(id) on delete cascade, output_id uuid not null references public.ai_outputs(id), created_at timestamptz not null default now(),primary key(owner_id,output_id)
);
create table public.ai_feedback (
 owner_id uuid not null references auth.users(id) on delete cascade,output_id uuid not null references public.ai_outputs(id),score smallint not null check(score between 1 and 5),
 reason text check(reason in ('jargon','too_long','connection','unanswered','factual_error')),updated_at timestamptz not null default now(),primary key(owner_id,output_id)
);
-- Snapshots and prompts are private, immutable from the browser, and never public feed items.
alter table public.ai_conversations enable row level security;
alter table public.ai_outputs enable row level security;
alter table public.ai_daily_sets enable row level security;
alter table public.ai_lesson_saves enable row level security;
alter table public.ai_feedback enable row level security;
revoke all on public.ai_conversations,public.ai_outputs,public.ai_daily_sets,public.ai_lesson_saves,public.ai_feedback from anon,authenticated;
grant select on public.ai_conversations,public.ai_outputs,public.ai_daily_sets,public.ai_lesson_saves,public.ai_feedback to authenticated;
grant insert,delete on public.ai_lesson_saves to authenticated;
grant insert,update on public.ai_feedback to authenticated;
grant all on public.ai_conversations,public.ai_outputs,public.ai_daily_sets,public.ai_lesson_saves,public.ai_feedback to service_role;
create policy ai_conversations_read on public.ai_conversations for select to authenticated using(owner_id=auth.uid() and not coalesce((auth.jwt()->>'is_anonymous')::boolean,false));
create policy ai_outputs_read on public.ai_outputs for select to authenticated using(owner_id=auth.uid() and not coalesce((auth.jwt()->>'is_anonymous')::boolean,false));
create policy ai_daily_read on public.ai_daily_sets for select to authenticated using(owner_id=auth.uid() and not coalesce((auth.jwt()->>'is_anonymous')::boolean,false));
create policy ai_saves_read on public.ai_lesson_saves for select to authenticated using(owner_id=auth.uid() and not coalesce((auth.jwt()->>'is_anonymous')::boolean,false));
create policy ai_saves_insert on public.ai_lesson_saves for insert to authenticated with check(owner_id=auth.uid() and not coalesce((auth.jwt()->>'is_anonymous')::boolean,false) and exists(select 1 from public.ai_outputs o where o.id=output_id and o.owner_id=auth.uid() and o.kind='lesson'));
create policy ai_saves_delete on public.ai_lesson_saves for delete to authenticated using(owner_id=auth.uid() and not coalesce((auth.jwt()->>'is_anonymous')::boolean,false));
create policy ai_feedback_read on public.ai_feedback for select to authenticated using(owner_id=auth.uid() and not coalesce((auth.jwt()->>'is_anonymous')::boolean,false));
create policy ai_feedback_insert on public.ai_feedback for insert to authenticated with check(owner_id=auth.uid() and not coalesce((auth.jwt()->>'is_anonymous')::boolean,false) and exists(select 1 from public.ai_outputs o where o.id=output_id and o.owner_id=auth.uid()));
create policy ai_feedback_update on public.ai_feedback for update to authenticated using(owner_id=auth.uid() and not coalesce((auth.jwt()->>'is_anonymous')::boolean,false)) with check(owner_id=auth.uid() and not coalesce((auth.jwt()->>'is_anonymous')::boolean,false) and exists(select 1 from public.ai_outputs o where o.id=output_id and o.owner_id=auth.uid()));
alter table public.knowledge_bookmarks add column ai_output_id uuid references public.ai_outputs(id);
-- Uses the SAME lock and generation_runs ledger as the original generation pipeline.
create function public.reserve_reader_generation(p_owner uuid,p_kind text,p_key text,p_prompt jsonb,p_limit integer)
returns table(run_id uuid,cached_run uuid,state text) language plpgsql security definer set search_path='' as $$
declare d timestamptz:=date_trunc('day',now() at time zone 'America/Los_Angeles') at time zone 'America/Los_Angeles';r public.generation_runs%rowtype;new_id uuid;
begin
 perform pg_advisory_xact_lock(716031);
 if p_owner is null or p_kind not in ('reader','chat','daily') or p_limit not between 1 and 200 or length(p_key)<>64 or pg_column_size(p_prompt)>80000 then raise exception 'invalid reservation';end if;
 update public.generation_runs set status='failed',error_code='lease_expired' where dedupe_key=p_key and status='reserved' and created_at<now()-interval '2 minutes';
 select * into r from public.generation_runs where dedupe_key=p_key and status in ('reserved','completed') order by created_at desc limit 1;
 if found then return query select null::uuid,case when r.status='completed' then r.id else null::uuid end,case when r.status='completed' then 'cached' else 'busy' end;return;end if;
 if (select count(*) from public.generation_runs where created_at>=d)>=p_limit or (select count(*) from public.generation_runs where owner_id=p_owner and created_at>=d)>=10 then return query select null::uuid,null::uuid,'quota'::text;return;end if;
 if (select count(*) from public.generation_runs where dedupe_key=p_key)>=2 then return query select null::uuid,null::uuid,'retry_limit'::text;return;end if;
 if (select count(*) from public.generation_runs where created_at>now()-interval '1 minute')>=5 or exists(select 1 from public.generation_runs where owner_id=p_owner and created_at>now()-interval '5 seconds') then return query select null::uuid,null::uuid,'rate_limit'::text;return;end if;
 insert into public.generation_runs(owner_id,kind,dedupe_key,prompt) values(p_owner,p_kind,p_key,p_prompt) returning id into new_id;
 return query select new_id,null::uuid,'reserved'::text;
end;$$;
create function public.complete_reader_generation(p_run uuid,p_outputs jsonb,p_usage jsonb,p_conversation uuid default null,p_revision integer default null,p_day date default null)
returns setof public.ai_outputs language plpgsql security definer set search_path='' as $$
declare r public.generation_runs%rowtype;o jsonb;c public.ai_conversations%rowtype;
begin
 select * into r from public.generation_runs where id=p_run for update;
 if not found or r.status<>'reserved' or r.kind not in ('reader','chat','daily') then raise exception 'invalid generation';end if;
 if jsonb_typeof(p_outputs)<>'array' or jsonb_array_length(p_outputs)<>(case when r.kind='daily' then 5 else 1 end) then raise exception 'invalid outputs';end if;
 if r.kind='chat' then
  select * into c from public.ai_conversations where id=p_conversation and owner_id=r.owner_id for update;
  if not found or c.revision<>p_revision then raise exception 'conversation changed';end if;
 elsif p_conversation is not null then raise exception 'unexpected conversation';end if;
 if r.kind='daily' then
  if p_day is null then raise exception 'missing day';end if;
  insert into public.ai_daily_sets(owner_id,day,run_id,language) values(r.owner_id,p_day,r.id,p_outputs->0->>'language');
 end if;
 for o in select value from jsonb_array_elements(p_outputs) loop
  if (r.kind='daily' and o->>'kind'<>'lesson') or (r.kind='chat' and o->>'kind'<>'reply') or (r.kind='reader' and o->>'kind' not in ('explain','translate')) then raise exception 'invalid kind';end if;
  insert into public.ai_outputs(run_id,owner_id,kind,slot,conversation_id,position,topic_key,selected_text,question,content,source_snapshot,source_url,language)
  values(r.id,r.owner_id,o->>'kind',(o->>'slot')::integer,p_conversation,case when r.kind='chat' then p_revision+1 else null end,o->>'topic_key',o->>'selected_text',o->>'question',o->'content',o->'source_snapshot',o->>'source_url',o->>'language');
 end loop;
 if r.kind='chat' then update public.ai_conversations set revision=revision+1,updated_at=now() where id=c.id;end if;
 update public.generation_runs set status='completed',usage=p_usage,completed_at=now() where id=r.id;
 return query select * from public.ai_outputs where run_id=r.id order by slot;
end;$$;
revoke all on function public.reserve_reader_generation(uuid,text,text,jsonb,integer),public.complete_reader_generation(uuid,jsonb,jsonb,uuid,integer,date) from public,anon,authenticated;
grant execute on function public.reserve_reader_generation(uuid,text,text,jsonb,integer),public.complete_reader_generation(uuid,jsonb,jsonb,uuid,integer,date) to service_role;
-- Shared cooldown prevents multiple web workers refreshing public sources together.
create table public.news_refresh_gate(id integer primary key check(id=1),lease_until timestamptz not null,last_started timestamptz not null);
alter table public.news_refresh_gate enable row level security;
revoke all on public.news_refresh_gate from public,anon,authenticated;
grant all on public.news_refresh_gate to service_role;
create function public.reserve_news_refresh() returns boolean language plpgsql security definer set search_path='' as $$
declare n integer;
begin
 insert into public.news_refresh_gate values(1,now()+interval '4 minutes',now()) on conflict(id) do update set lease_until=excluded.lease_until,last_started=excluded.last_started where news_refresh_gate.lease_until<=now() and news_refresh_gate.last_started<now()-interval '10 minutes';
 get diagnostics n=row_count;return n=1;
end;$$;
revoke all on function public.reserve_news_refresh() from public,anon,authenticated;
grant execute on function public.reserve_news_refresh() to service_role;
commit;
