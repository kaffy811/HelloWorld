begin;
create table if not exists public.companies (
 ticker text primary key, name text not null, sector text not null,
 summary text not null, learning_question text not null, source_url text not null,
 created_at timestamptz not null default now()
);
alter table public.companies enable row level security;
create policy "Public company introductions" on public.companies for select to anon, authenticated using (true);
grant select on public.companies to anon, authenticated;
revoke insert, update, delete on public.companies from anon, authenticated;
insert into public.companies(ticker,name,sector,summary,learning_question,source_url) values
('AAPL','Apple','Consumer technology','Apple sells devices such as iPhone and Mac, alongside software and services. Start by separating its product business from its services business.','How does repeat spending on services differ from buying a new device?','https://investor.apple.com/'),
('MSFT','Microsoft','Software & cloud','Microsoft provides software, cloud services and business tools. Its customers include individuals, businesses and public institutions.','Why might a business keep paying for the same software each year?','https://www.microsoft.com/en-us/Investor/'),
('COST','Costco','Retail','Costco operates membership warehouses. To understand the business, look at both merchandise sales and membership fees.','What role do membership renewals play in this business?','https://investor.costco.com/'),
('SBUX','Starbucks','Food & beverage','Starbucks sells coffee, drinks and food through company-operated and licensed stores. These store models generate revenue in different ways.','How might store traffic and spending per visit affect sales?','https://investor.starbucks.com/'),
('NKE','Nike','Apparel & footwear','Nike designs and sells footwear, apparel and equipment through its own channels and wholesale partners.','How could selling directly differ from selling through a retailer?','https://investors.nike.com/'),
('NFLX','Netflix','Entertainment','Netflix provides entertainment through a streaming service. Examine how subscriptions, pricing and content spending connect.','Why is subscriber growth only one part of understanding the business?','https://ir.netflix.net/')
on conflict (ticker) do nothing;
create table if not exists public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 first_name text check (first_name is null or char_length(trim(first_name)) between 1 and 80),
 last_name text check (last_name is null or char_length(trim(last_name)) between 1 and 80),
 avatar_path text check (avatar_path is null or avatar_path like id::text || '/%'),
 created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "Read own profile" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "Update own profile" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update(first_name,last_name,avatar_path) on public.profiles to authenticated;
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin
 insert into public.profiles(id) values(new.id) on conflict(id) do nothing;
 return new;
end;
$$;
revoke all on function public.handle_new_user() from public, anon, authenticated;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
insert into public.profiles(id) select id from auth.users on conflict(id) do nothing;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values ('avatars','avatars',false,2097152,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
create policy "Read own avatar" on storage.objects for select to authenticated using(bucket_id='avatars' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "Upload own avatar" on storage.objects for insert to authenticated with check(bucket_id='avatars' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "Delete own avatar" on storage.objects for delete to authenticated using(bucket_id='avatars' and (storage.foldername(name))[1]=(select auth.uid())::text);
commit;
