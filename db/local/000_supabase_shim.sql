-- =====================================================================
-- SHIM LOCAL DO SUPABASE — NÃO EXECUTAR NO SUPABASE.
-- Reproduz apenas o mínimo que o Supabase já fornece (roles, schema auth,
-- auth.uid(), auth.users) para que as migrações e as políticas RLS possam
-- ser testadas em um PostgreSQL comum (desenvolvimento e CI).
-- =====================================================================

-- Papéis anon/authenticated/service_role: criados por db/local/setup-roles.sql (superusuário).

create schema if not exists extensions;
create schema if not exists auth;
grant usage on schema auth to anon, authenticated, service_role;
grant usage on schema extensions to anon, authenticated, service_role;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function auth.uid() returns uuid
language sql stable as $$
  select nullif(
    coalesce(
      current_setting('request.jwt.claim.sub', true),
      (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
    ), ''
  )::uuid
$$;

create or replace function auth.role() returns text
language sql stable as $$
  select coalesce(
    current_setting('request.jwt.claim.role', true),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  )::text
$$;

grant execute on function auth.uid() to anon, authenticated, service_role;
grant execute on function auth.role() to anon, authenticated, service_role;
