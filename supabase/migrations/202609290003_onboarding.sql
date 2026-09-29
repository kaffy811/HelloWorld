begin;
alter table public.profiles
 add column display_name text check(display_name is null or char_length(trim(display_name)) between 1 and 40),
 add column native_language_code text check(native_language_code in ('zh-Hans','zh-Hant-HK','zh-Hant-TW','en','hi','es','ko','ja','fr','ru')),
 add column preferred_language_code text check(preferred_language_code in ('zh-Hans','zh-Hant-HK','zh-Hant-TW','en','hi','es','ko','ja','fr','ru')),
 add column english_confidence integer check(english_confidence between 1 and 4),
 add column learning_goals text[] not null default '{}' check(learning_goals <@ array['business','metrics','statements','news','risks']::text[] and array_position(learning_goals,null) is null),
 add column onboarding_completed_at timestamptz,
 add constraint completed_profile_has_names check(onboarding_completed_at is null or (display_name is not null and first_name is not null and last_name is not null));
-- Preserve legacy free-text responses; copy only unambiguous existing choices.
update public.profiles set
 english_confidence=case financial_english when 'beginner' then 1 when 'basic' then 2 when 'comfortable' then 3 else null end,
 learning_goals=case when learning_goal is not null then array[learning_goal] else '{}'::text[] end;
-- Existing users who already completed the original name form remain onboarded.
update public.profiles set display_name=left(trim(first_name),40), onboarding_completed_at=now()
where first_name is not null and last_name is not null;
grant update(display_name,native_language_code,preferred_language_code,english_confidence,learning_goals,onboarding_completed_at) on public.profiles to authenticated;
commit;
