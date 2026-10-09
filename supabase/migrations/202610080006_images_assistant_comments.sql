begin;
create table public.user_images (
 id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users(id) on delete cascade,
 storage_path text not null unique,sha256 text not null check(sha256 ~ '^[a-f0-9]{64}$'),
 mime_type text not null check(mime_type='image/webp'),byte_size integer not null check(byte_size between 1 and 1500000),
 width integer not null check(width between 1 and 1600),height integer not null check(height between 1 and 1600),
 status text not null default 'pending' check(status in ('pending','ready','failed')),created_at timestamptz not null default now(),
 check(storage_path=owner_id::text||'/'||id::text||'.webp')
);
alter table public.user_images enable row level security;
revoke all on public.user_images from public,anon,authenticated;
grant select on public.user_images to authenticated;
grant all on public.user_images to service_role;
create policy own_images_read on public.user_images for select to authenticated using(owner_id=auth.uid() and status='ready' and not coalesce((auth.jwt()->>'is_anonymous')::boolean,false));
create function public.reserve_user_image(p_id uuid,p_owner uuid,p_hash text,p_size integer,p_width integer,p_height integer) returns boolean language plpgsql security definer set search_path='' as $$
begin
 perform pg_advisory_xact_lock(hashtextextended(p_owner::text,8121));
 if (select count(*) from public.user_images where owner_id=p_owner and created_at>now()-interval '24 hours')>=20 or (select count(*) from public.user_images where owner_id=p_owner and status in ('pending','ready'))>=100 then return false;end if;
 insert into public.user_images(id,owner_id,storage_path,sha256,mime_type,byte_size,width,height) values(p_id,p_owner,p_owner::text||'/'||p_id::text||'.webp',p_hash,'image/webp',p_size,p_width,p_height);
 return true;
end;$$;
revoke all on function public.reserve_user_image(uuid,uuid,text,integer,integer,integer) from public,anon,authenticated;
grant execute on function public.reserve_user_image(uuid,uuid,text,integer,integer,integer) to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('notebook-images','notebook-images',false,1500000,array['image/webp']) on conflict(id) do nothing;
create policy registered_private_images on storage.objects for select to authenticated using(bucket_id='notebook-images' and not coalesce((auth.jwt()->>'is_anonymous')::boolean,false) and exists(select 1 from public.user_images i where i.owner_id=auth.uid() and i.status='ready' and i.storage_path=name));
alter table public.personal_notes add column image_ids uuid[] not null default '{}';
alter table public.personal_notes add constraint note_image_count check(cardinality(image_ids)<=3);
create function public.check_note_images() returns trigger language plpgsql set search_path='' as $$
begin
 if exists(select 1 from unnest(new.image_ids) v where not exists(select 1 from public.user_images i where i.id=v and i.owner_id=new.user_id and i.status='ready')) then raise exception 'image unavailable';end if;
 return new;
end;$$;
create trigger owned_note_images before insert or update of image_ids,user_id on public.personal_notes for each row execute function public.check_note_images();
create table public.ai_lesson_comments (
 owner_id uuid not null references auth.users(id) on delete cascade,output_id uuid not null references public.ai_outputs(id),
 body text not null check(length(trim(body)) between 1 and 1000),preference text check(preference in ('simpler','examples','deeper','related')),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),primary key(owner_id,output_id)
);
alter table public.ai_lesson_comments enable row level security;
revoke all on public.ai_lesson_comments from public,anon,authenticated;
grant select,insert,update on public.ai_lesson_comments to authenticated;
grant all on public.ai_lesson_comments to service_role;
create policy own_lesson_comments_read on public.ai_lesson_comments for select to authenticated using(owner_id=auth.uid() and not coalesce((auth.jwt()->>'is_anonymous')::boolean,false));
create policy own_lesson_comments_insert on public.ai_lesson_comments for insert to authenticated with check(owner_id=auth.uid() and not coalesce((auth.jwt()->>'is_anonymous')::boolean,false) and exists(select 1 from public.ai_outputs o where o.id=output_id and o.owner_id=auth.uid() and o.kind='lesson'));
create policy own_lesson_comments_update on public.ai_lesson_comments for update to authenticated using(owner_id=auth.uid() and not coalesce((auth.jwt()->>'is_anonymous')::boolean,false)) with check(owner_id=auth.uid() and not coalesce((auth.jwt()->>'is_anonymous')::boolean,false) and exists(select 1 from public.ai_outputs o where o.id=output_id and o.owner_id=auth.uid() and o.kind='lesson'));
alter table public.profiles alter column preferred_language_code set default 'en';
commit;
