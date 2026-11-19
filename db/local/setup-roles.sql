-- Executar UMA vez como superusuário no PostgreSQL local (ex.: sudo -u postgres psql -f db/local/setup-roles.sql)
-- Cria o usuário de desenvolvimento e os papéis que o Supabase já possui.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'onzetec') then
    create role onzetec login password 'onzetec_local_dev' createrole createdb;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
end $$;
grant anon, authenticated, service_role to onzetec;
