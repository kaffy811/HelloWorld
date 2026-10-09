begin;
-- Rolling deploy: old batches remain five; the new writer atomically upgrades to six.
alter table public.ai_daily_sets add column if not exists item_count smallint not null default 5 check(item_count in(5,6));
alter table public.ai_lesson_saves add column if not exists migrated_to_terms_at timestamptz;
-- Preserve earlier article favourites as Terms; originals, prompts and votes remain intact.
insert into public.knowledge_bookmarks(user_id,source_key,kind,ai_output_id,text,explanation,source_url,provenance,created_at)
select s.owner_id,'ai:'||o.id,'term',o.id,o.content->>'title',o.content->>'answer','/learn/ai/'||o.id,'AI explanation',s.created_at
from public.ai_lesson_saves s join public.ai_outputs o on o.id=s.output_id and o.owner_id=s.owner_id
where s.migrated_to_terms_at is null and o.kind='lesson' and length(o.content->>'title') between 1 and 2000 and length(o.content->>'answer') between 1 and 6000
on conflict(user_id,source_key) do nothing;
update public.ai_lesson_saves s set migrated_to_terms_at=now() where s.migrated_to_terms_at is null and exists(select 1 from public.knowledge_bookmarks b where b.user_id=s.owner_id and b.ai_output_id=s.output_id);
create or replace function public.complete_reader_generation(p_run uuid,p_outputs jsonb,p_usage jsonb,p_conversation uuid default null,p_revision integer default null,p_day date default null)
returns setof public.ai_outputs language plpgsql security definer set search_path='' as $$
declare r public.generation_runs%rowtype;o jsonb;c public.ai_conversations%rowtype;items integer;
begin
 select * into r from public.generation_runs where id=p_run for update;
 if not found or r.status<>'reserved' or r.kind not in ('reader','chat','daily') then raise exception 'invalid generation';end if;
 if jsonb_typeof(p_outputs)<>'array' then raise exception 'invalid outputs';end if;
 items:=jsonb_array_length(p_outputs);
 if (r.kind='daily' and items not in(5,6)) or (r.kind<>'daily' and items<>1) then raise exception 'invalid outputs';end if;
 if r.kind='daily' and (select count(distinct value->>'topic_key') from jsonb_array_elements(p_outputs))<>items then raise exception 'duplicate topics';end if;
 if r.kind='chat' then
  select * into c from public.ai_conversations where id=p_conversation and owner_id=r.owner_id for update;
  if not found or c.revision<>p_revision then raise exception 'conversation changed';end if;
 elsif p_conversation is not null then raise exception 'unexpected conversation';end if;
 if r.kind='daily' then
  if p_day is null then raise exception 'missing day';end if;
  insert into public.ai_daily_sets(owner_id,day,run_id,language,item_count) values(r.owner_id,p_day,r.id,p_outputs->0->>'language',items)
  on conflict(owner_id,day,language) do update set run_id=excluded.run_id,item_count=excluded.item_count,created_at=now()
  where ai_daily_sets.item_count=5 and excluded.item_count=6;
  if not found then raise exception 'daily set already exists';end if;
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
revoke all on function public.complete_reader_generation(uuid,jsonb,jsonb,uuid,integer,date) from public,anon,authenticated;
grant execute on function public.complete_reader_generation(uuid,jsonb,jsonb,uuid,integer,date) to service_role;
commit;
