-- SpeakUp AI V2.0: durable exercise scores. Does not alter existing tables.
create table if not exists public.exercise_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_id text not null,
  score integer not null check (score between 0 and 100),
  created_at timestamptz not null default now()
);
create index if not exists exercise_attempts_user_created_idx
  on public.exercise_attempts (user_id, created_at desc);
alter table public.exercise_attempts enable row level security;
drop policy if exists "Users can read own exercise attempts" on public.exercise_attempts;
create policy "Users can read own exercise attempts" on public.exercise_attempts
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Users can insert own exercise attempts" on public.exercise_attempts;
create policy "Users can insert own exercise attempts" on public.exercise_attempts
  for insert to authenticated with check (auth.uid() = user_id);
