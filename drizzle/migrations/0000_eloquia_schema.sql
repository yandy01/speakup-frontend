create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  level text not null default 'beginner',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "own profile select" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "own profile insert" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "own profile update" on public.profiles for update to authenticated using (auth.uid() = id);

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name) values (new.id, coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)))
  on conflict (id) do nothing;
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null default 'Conversation',
  language text not null default 'fr',
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.conversations to authenticated;
grant all on public.conversations to service_role;
alter table public.conversations enable row level security;
create policy "own conv" on public.conversations for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null,
  role text not null check (role in ('user','assistant')),
  content text not null,
  created_at timestamptz not null default now()
);
create index on public.messages (conversation_id, created_at);
grant select, insert, delete on public.messages to authenticated;
grant all on public.messages to service_role;
alter table public.messages enable row level security;
create policy "own msgs" on public.messages for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.exercise_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  exercise_id text not null,
  score integer not null check (score between 0 and 100),
  xp_earned integer not null default 0,
  created_at timestamptz not null default now()
);
grant select, insert on public.exercise_attempts to authenticated;
grant all on public.exercise_attempts to service_role;
alter table public.exercise_attempts enable row level security;
create policy "own ex select" on public.exercise_attempts for select to authenticated using (auth.uid() = user_id);
create policy "own ex insert" on public.exercise_attempts for insert to authenticated with check (auth.uid() = user_id);

create table public.speaking_challenge_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  topic text not null,
  duration_seconds integer not null,
  total_score integer not null,
  relevance_score integer not null,
  structure_score integer not null,
  clarity_score integer not null,
  fluency_score integer not null,
  xp_earned integer not null default 0,
  summary text not null,
  created_at timestamptz not null default now()
);
grant select, insert on public.speaking_challenge_attempts to authenticated;
grant all on public.speaking_challenge_attempts to service_role;
alter table public.speaking_challenge_attempts enable row level security;
create policy "own ch select" on public.speaking_challenge_attempts for select to authenticated using (auth.uid() = user_id);
create policy "own ch insert" on public.speaking_challenge_attempts for insert to authenticated with check (auth.uid() = user_id);

create table public.reading_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  text_id text not null,
  title text not null,
  duration_seconds integer not null,
  total_score integer,
  reading_accuracy_score integer,
  pacing_score integer,
  articulation_score integer,
  expression_score integer,
  xp_earned integer not null default 0,
  summary text not null,
  created_at timestamptz not null default now()
);
grant select, insert on public.reading_attempts to authenticated;
grant all on public.reading_attempts to service_role;
alter table public.reading_attempts enable row level security;
create policy "own rd select" on public.reading_attempts for select to authenticated using (auth.uid() = user_id);
create policy "own rd insert" on public.reading_attempts for insert to authenticated with check (auth.uid() = user_id);