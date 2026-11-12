-- SpeakUp AI: limite persistante du coach conversationnel.
-- Migration additive et non destructive : ne modifie aucune des 5 tables existantes.
-- À exécuter une seule fois dans Supabase > SQL Editor.

create table if not exists public.ai_chat_rate_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default pg_catalog.now()
);

create index if not exists ai_chat_rate_events_user_created_idx
  on public.ai_chat_rate_events (user_id, created_at desc);

alter table public.ai_chat_rate_events enable row level security;

-- Les clients ne peuvent ni lire ni écrire directement les événements de quota.
revoke all on table public.ai_chat_rate_events from public, anon, authenticated;

create or replace function public.consume_ai_chat_quota(
  p_window_seconds integer default 60,
  p_max_requests integer default 8
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_count integer;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if p_window_seconds < 1 or p_window_seconds > 3600
     or p_max_requests < 1 or p_max_requests > 100 then
    raise exception 'invalid quota parameters' using errcode = '22023';
  end if;

  -- Serialize quota checks for the same user to prevent concurrent bypasses.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::text, 0)
  );

  select pg_catalog.count(*)::integer
    into v_count
    from public.ai_chat_rate_events
   where user_id = v_user_id
     and created_at >= pg_catalog.now() - pg_catalog.make_interval(secs => p_window_seconds);

  if v_count >= p_max_requests then
    return false;
  end if;

  insert into public.ai_chat_rate_events (user_id)
  values (v_user_id);

  -- Small bounded cleanup; keeps this table from growing indefinitely.
  delete from public.ai_chat_rate_events
   where created_at < pg_catalog.now() - interval '7 days';

  return true;
end;
$$;

revoke all on function public.consume_ai_chat_quota(integer, integer) from public, anon;
grant execute on function public.consume_ai_chat_quota(integer, integer) to authenticated;

comment on table public.ai_chat_rate_events is
  'Private server-side rate-limit events for SpeakUp AI coach requests.';
comment on function public.consume_ai_chat_quota(integer, integer) is
  'Atomically consumes one AI chat request for auth.uid(); returns false when the rolling quota is exhausted.';
