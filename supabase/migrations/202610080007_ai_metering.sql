begin;
create table public.ai_usage_ledger (
 run_id uuid primary key references public.generation_runs(id) on delete cascade,
 provider text not null default 'google', model text not null,
 billing_mode text not null check(billing_mode in ('free','paid')),
 price_version text not null, input_per_million numeric not null check(input_per_million>=0),
 cached_per_million numeric not null check(cached_per_million>=0), output_per_million numeric not null check(output_per_million>=0),
 reserved_cost_usd numeric(16,9) not null check(reserved_cost_usd>=0),
 estimated_cost_usd numeric(16,9) check(estimated_cost_usd>=0),
 input_tokens bigint, cached_tokens bigint, output_tokens bigint, thinking_tokens bigint,
 state text not null default 'reserved' check(state in ('reserved','recorded','unknown','not_charged')),
 http_status integer, usage jsonb not null default '{}',
 created_at timestamptz not null default now(), recorded_at timestamptz
);
create index ai_usage_day on public.ai_usage_ledger(created_at);
alter table public.ai_usage_ledger enable row level security;
revoke all on public.ai_usage_ledger from public,anon,authenticated;
grant all on public.ai_usage_ledger to service_role;

create function public.reserve_metered_generation(p_owner uuid,p_kind text,p_key text,p_prompt jsonb,
 p_limit integer,p_user_limit integer,p_minute_limit integer,p_daily_budget numeric,p_total_budget numeric,
 p_reserve_cost numeric,p_prices jsonb)
returns table(run_id uuid,cached_run uuid,state text) language plpgsql security definer set search_path='' as $$
declare d timestamptz:=date_trunc('day',now() at time zone 'America/Los_Angeles') at time zone 'America/Los_Angeles';
 r public.generation_runs%rowtype;new_id uuid;daily_cost numeric;total_cost numeric;
begin
 perform pg_advisory_xact_lock(716031);
 if p_kind not in ('reader','chat','daily','news','material','followup')
 or (p_owner is null and p_kind<>'news') or (p_owner is not null and p_kind='news')
 or p_limit not between 1 and 10000 or p_user_limit not between 1 and 10000 or p_minute_limit not between 1 and 100
 or p_daily_budget is null or p_daily_budget not between 0 and 100 or p_total_budget is null or p_total_budget not between 0 and 1000
 or p_reserve_cost is null or p_reserve_cost not between 0 and 10 or length(p_key)<>64 or pg_column_size(p_prompt)>80000
 or coalesce(p_prompt->>'model','')='' or coalesce(p_prices->>'billing_mode','') not in ('free','paid')
 or coalesce(p_prices->>'price_version','')='' then raise exception 'invalid reservation';end if;
 update public.generation_runs set status='failed',error_code='lease_expired' where dedupe_key=p_key and status='reserved' and created_at<now()-interval '2 minutes';
 select * into r from public.generation_runs where dedupe_key=p_key and status in ('reserved','completed') order by created_at desc limit 1;
 if found then return query select null::uuid,case when r.status='completed' then r.id else null::uuid end,
 case when r.status='completed' then 'cached' else 'busy' end;return;end if;
 if (select count(*) from public.generation_runs where created_at>=d)>=p_limit then return query select null::uuid,null::uuid,'global_quota'::text;return;end if;
 if p_owner is not null and (select count(*) from public.generation_runs where owner_id=p_owner and created_at>=d)>=p_user_limit then return query select null::uuid,null::uuid,'user_quota'::text;return;end if;
 if (select count(*) from public.generation_runs where dedupe_key=p_key)>=2 then return query select null::uuid,null::uuid,'retry_limit'::text;return;end if;
 if (select count(*) from public.generation_runs where created_at>now()-interval '1 minute')>=p_minute_limit
 or exists(select 1 from public.generation_runs where owner_id=p_owner and created_at>now()-interval '5 seconds') then return query select null::uuid,null::uuid,'rate_limit'::text;return;end if;
 select coalesce(sum(coalesce(estimated_cost_usd,reserved_cost_usd)),0),
 coalesce(sum(coalesce(estimated_cost_usd,reserved_cost_usd)) filter(where created_at>=d),0)
 into total_cost,daily_cost from public.ai_usage_ledger;
 if total_cost+p_reserve_cost>p_total_budget then return query select null::uuid,null::uuid,'total_budget'::text;return;end if;
 if daily_cost+p_reserve_cost>p_daily_budget then return query select null::uuid,null::uuid,'daily_budget'::text;return;end if;
 insert into public.generation_runs(owner_id,kind,dedupe_key,prompt) values(p_owner,p_kind,p_key,p_prompt) returning id into new_id;
 insert into public.ai_usage_ledger(run_id,model,billing_mode,price_version,input_per_million,cached_per_million,output_per_million,reserved_cost_usd)
 values(new_id,p_prompt->>'model',p_prices->>'billing_mode',p_prices->>'price_version',
 (p_prices->>'input_per_million')::numeric,(p_prices->>'cached_per_million')::numeric,(p_prices->>'output_per_million')::numeric,p_reserve_cost);
 return query select new_id,null::uuid,'reserved'::text;
end;$$;

create function public.settle_ai_usage(p_run uuid,p_usage jsonb,p_dispatched boolean,p_http_status integer)
returns void language plpgsql security definer set search_path='' as $$
declare l public.ai_usage_ledger%rowtype;ip bigint;ca bigint;ou bigint;th bigint;tt bigint;cost numeric;
begin
 perform pg_advisory_xact_lock(716031);
 select * into l from public.ai_usage_ledger where run_id=p_run for update;
 if not found then raise exception 'missing usage reservation';end if;
 if l.state in ('recorded','not_charged') then return;end if;
 if coalesce(p_usage->>'promptTokenCount','')~'^\d+$' and coalesce(p_usage->>'candidatesTokenCount','')~'^\d+$'
 and coalesce(p_usage->>'cachedContentTokenCount','0')~'^\d+$' and coalesce(p_usage->>'thoughtsTokenCount','0')~'^\d+$' then
 ip:=(p_usage->>'promptTokenCount')::bigint;ou:=(p_usage->>'candidatesTokenCount')::bigint;
 ca:=coalesce((p_usage->>'cachedContentTokenCount')::bigint,0);th:=coalesce((p_usage->>'thoughtsTokenCount')::bigint,0);
 if coalesce(p_usage->>'totalTokenCount','')~'^\d+$' then tt:=(p_usage->>'totalTokenCount')::bigint;th:=greatest(th,tt-ip-ou);end if;
 if ca>ip then raise exception 'invalid cached token count';end if;
 cost:=ceil(((ip-ca)*l.input_per_million+ca*l.cached_per_million+(ou+th)*l.output_per_million)/1000000*1000000000)/1000000000;
 update public.ai_usage_ledger set state='recorded',input_tokens=ip,cached_tokens=ca,output_tokens=ou,thinking_tokens=th,
 estimated_cost_usd=cost,usage=p_usage,http_status=p_http_status,recorded_at=now() where run_id=p_run;
 elsif not p_dispatched or p_http_status in (400,401,402,403,404,429,500) then
 update public.ai_usage_ledger set state='not_charged',estimated_cost_usd=0,usage=p_usage,http_status=p_http_status,recorded_at=now() where run_id=p_run;
 else
 update public.ai_usage_ledger set state='unknown',usage=p_usage,http_status=p_http_status,recorded_at=now() where run_id=p_run;
 end if;
end;$$;
revoke all on function public.reserve_metered_generation(uuid,text,text,jsonb,integer,integer,integer,numeric,numeric,numeric,jsonb),public.settle_ai_usage(uuid,jsonb,boolean,integer) from public,anon,authenticated;
grant execute on function public.reserve_metered_generation(uuid,text,text,jsonb,integer,integer,integer,numeric,numeric,numeric,jsonb),public.settle_ai_usage(uuid,jsonb,boolean,integer) to service_role;
commit;
