-- Keep the shared daily model cap; allow an active reader to use its remaining pool.
begin;
create or replace function public.reserve_reader_generation(p_owner uuid,p_kind text,p_key text,p_prompt jsonb,p_limit integer)
returns table(run_id uuid,cached_run uuid,state text) language plpgsql security definer set search_path='' as $$
declare d timestamptz:=date_trunc('day',now() at time zone 'America/Los_Angeles') at time zone 'America/Los_Angeles';r public.generation_runs%rowtype;new_id uuid;
begin
 perform pg_advisory_xact_lock(716031);
 if p_owner is null or p_kind not in ('reader','chat','daily') or p_limit not between 1 and 200 or length(p_key)<>64 or pg_column_size(p_prompt)>80000 then raise exception 'invalid reservation';end if;
 update public.generation_runs set status='failed',error_code='lease_expired' where dedupe_key=p_key and status='reserved' and created_at<now()-interval '2 minutes';
 select * into r from public.generation_runs where dedupe_key=p_key and status in ('reserved','completed') order by created_at desc limit 1;
 if found then return query select null::uuid,case when r.status='completed' then r.id else null::uuid end,case when r.status='completed' then 'cached' else 'busy' end;return;end if;
 if (select count(*) from public.generation_runs where created_at>=d)>=p_limit or (select count(*) from public.generation_runs where owner_id=p_owner and created_at>=d)>=20 then return query select null::uuid,null::uuid,'quota'::text;return;end if;
 if (select count(*) from public.generation_runs where dedupe_key=p_key)>=2 then return query select null::uuid,null::uuid,'retry_limit'::text;return;end if;
 if (select count(*) from public.generation_runs where created_at>now()-interval '1 minute')>=5 or exists(select 1 from public.generation_runs where owner_id=p_owner and created_at>now()-interval '5 seconds') then return query select null::uuid,null::uuid,'rate_limit'::text;return;end if;
 insert into public.generation_runs(owner_id,kind,dedupe_key,prompt) values(p_owner,p_kind,p_key,p_prompt) returning id into new_id;
 return query select new_id,null::uuid,'reserved'::text;
end;$$;
commit;
