begin;
alter table public.profiles
  add column first_language text check (first_language is null or char_length(trim(first_language)) between 1 and 80),
  add column reading_language text check (reading_language is null or char_length(trim(reading_language)) between 1 and 80),
  add column investing_experience text check (investing_experience in ('never','under_1','1_3','3_5','5_plus')),
  add column financial_english text check (financial_english in ('beginner','basic','comfortable')),
  add column explanation_depth text check (explanation_depth in ('brief','guided','detailed')),
  add column learning_goal text check (learning_goal in ('business','statements','news','risks')),
  add column reading_minutes integer check (reading_minutes in (5,10,20));
grant update(first_language,reading_language,investing_experience,financial_english,explanation_depth,learning_goal,reading_minutes) on public.profiles to authenticated;
commit;
