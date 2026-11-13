-- ELOQIA: historique des lectures analysées. Migration additive.
create table if not exists public.reading_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  text_id text not null,
  title text not null check (char_length(title) between 1 and 180),
  duration_seconds integer not null check (duration_seconds between 1 and 300),
  total_score integer check (total_score between 0 and 100),
  reading_accuracy_score integer check (reading_accuracy_score between 0 and 100),
  pacing_score integer check (pacing_score between 0 and 100),
  articulation_score integer check (articulation_score between 0 and 100),
  expression_score integer check (expression_score between 0 and 100),
  xp_earned integer not null default 0 check (xp_earned between 0 and 100),
  summary text not null,
  created_at timestamptz not null default now()
);
create index if not exists reading_attempts_user_created_idx on public.reading_attempts(user_id, created_at desc);
alter table public.reading_attempts enable row level security;
revoke all on table public.reading_attempts from anon, public;
grant select, insert on table public.reading_attempts to authenticated;
drop policy if exists "Users can read their own reading attempts" on public.reading_attempts;
create policy "Users can read their own reading attempts" on public.reading_attempts for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Users can insert their own reading attempts" on public.reading_attempts;
create policy "Users can insert their own reading attempts" on public.reading_attempts for insert to authenticated with check (auth.uid() = user_id);
