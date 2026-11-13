-- ELOQIA: persist XP earned on exercise attempts. Additive only; existing rows and policies are preserved.
alter table if exists public.exercise_attempts
  add column if not exists xp_earned integer not null default 0;

-- Guard the constraint for projects where the exercise_attempts table has not
-- yet been created by the earlier 20261112 migration.
do $$
begin
  if to_regclass('public.exercise_attempts') is not null and not exists (
    select 1
      from pg_constraint
     where conname = 'exercise_attempts_xp_earned_range'
       and conrelid = to_regclass('public.exercise_attempts')
  ) then
    execute 'alter table public.exercise_attempts add constraint exercise_attempts_xp_earned_range check (xp_earned between 0 and 100)';
  end if;
end $$;
