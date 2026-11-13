-- ELOQIA: historique des défis oratoires. Migration additive, sans toucher aux tables existantes.
create table if not exists public.speaking_challenge_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic text not null check (char_length(topic) between 3 and 400),
  duration_seconds integer not null check (duration_seconds between 1 and 90),
  total_score integer not null check (total_score between 0 and 100),
  relevance_score integer not null check (relevance_score between 0 and 100),
  structure_score integer not null check (structure_score between 0 and 100),
  clarity_score integer not null check (clarity_score between 0 and 100),
  fluency_score integer not null check (fluency_score between 0 and 100),
  xp_earned integer not null default 0 check (xp_earned between 0 and 100),
  summary text not null,
  created_at timestamptz not null default now()
);
create index if not exists speaking_challenge_user_created_idx
  on public.speaking_challenge_attempts (user_id, created_at desc);
alter table public.speaking_challenge_attempts enable row level security;
revoke all on table public.speaking_challenge_attempts from anon, public;
grant select, insert on table public.speaking_challenge_attempts to authenticated;
drop policy if exists "Users can read their own speaking challenges" on public.speaking_challenge_attempts;
create policy "Users can read their own speaking challenges"
  on public.speaking_challenge_attempts for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Users can insert their own speaking challenges"
  on public.speaking_challenge_attempts for insert to authenticated with check (auth.uid() = user_id);
