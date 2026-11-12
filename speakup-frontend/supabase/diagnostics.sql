-- DIAGNOSTIC UNIQUEMENT : cette requête ne modifie aucune table ni aucune donnée.

-- 1) Colonnes réelles des cinq tables existantes.
select
  table_name,
  ordinal_position,
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name in ('profiles', 'conversations', 'messages', 'exercises', 'user_progress')
order by table_name, ordinal_position;

-- 2) État RLS des cinq tables.
select
  n.nspname as schema_name,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as force_rls
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('profiles', 'conversations', 'messages', 'exercises', 'user_progress')
order by c.relname;

-- 3) Politiques RLS existantes.
select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('profiles', 'conversations', 'messages', 'exercises', 'user_progress')
order by tablename, policyname;

-- 4) Triggers liés à la création des profils.
select
  trigger_name,
  event_manipulation,
  event_object_schema,
  event_object_table,
  action_timing,
  action_statement
from information_schema.triggers
where event_object_schema = 'auth'
  and event_object_table = 'users'
order by trigger_name;

-- 5) État de la migration de protection du coach (si elle a été installée).
select
  to_regclass('public.ai_chat_rate_events') as ai_chat_rate_events_table,
  to_regprocedure('public.consume_ai_chat_quota(integer,integer)') as consume_ai_chat_quota_function;
