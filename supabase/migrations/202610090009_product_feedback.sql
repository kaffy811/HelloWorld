begin;
create table public.product_feedback (
 id uuid primary key,
 owner_id uuid not null references auth.users(id) on delete cascade,
 body text not null check(length(trim(body)) between 5 and 2000),
 preference text check(preference in ('simpler','examples','deeper','related')),
 created_at timestamptz not null default now()
);
create index product_feedback_owner_created on public.product_feedback(owner_id,created_at desc);
alter table public.product_feedback enable row level security;
revoke all on public.product_feedback from public,anon,authenticated;
grant select on public.product_feedback to authenticated;
grant insert(id,owner_id,body,preference) on public.product_feedback to authenticated;
grant all on public.product_feedback to service_role;
create policy feedback_owner_read on public.product_feedback for select to authenticated using(owner_id=auth.uid() and not coalesce((auth.jwt()->>'is_anonymous')::boolean,false));
create policy feedback_owner_insert on public.product_feedback for insert to authenticated with check(owner_id=auth.uid() and not coalesce((auth.jwt()->>'is_anonymous')::boolean,false));
create function public.limit_product_feedback() returns trigger language plpgsql set search_path='' as $$
begin
 perform pg_advisory_xact_lock(hashtextextended(new.owner_id::text,8122));
 if (select count(*) from public.product_feedback where owner_id=new.owner_id and created_at>now()-interval '24 hours')>=5 then
  raise exception 'feedback_daily_limit';
 end if;
 return new;
end;$$;
revoke all on function public.limit_product_feedback() from public,anon,authenticated;
create trigger bounded_product_feedback before insert on public.product_feedback for each row execute function public.limit_product_feedback();
commit;
