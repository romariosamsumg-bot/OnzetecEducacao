#!/usr/bin/env bash
# Restaura um backup criado por scripts/backup-db.sh num banco NOVO, com o esquema public vazio
# (ex.: um projeto Supabase recém-criado).
#
#   TARGET_DATABASE_URL=... AGE_KEY_FILE=chave-privada.txt bash scripts/restore-db.sh arquivo.tar.gz.age
#
# Ordem: extensões -> contas (auth.users) -> aplicação (esquema + dados + RLS) -> gatilho de novos cadastros.
set -euo pipefail

FILE="${1:?Informe o arquivo .tar.gz.age}"
: "${TARGET_DATABASE_URL:?Defina TARGET_DATABASE_URL}"
: "${AGE_KEY_FILE:?Defina AGE_KEY_FILE (chave privada age)}"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

age -d -i "$AGE_KEY_FILE" "$FILE" | tar -xzf - -C "$WORK"

psql "$TARGET_DATABASE_URL" -v ON_ERROR_STOP=1 -q <<'SQL'
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists unaccent with schema extensions;
create extension if not exists pg_trgm with schema extensions;
SQL

# 1) Contas: precisam existir antes das chaves estrangeiras de public.profiles
pg_restore --no-owner --data-only --exit-on-error -d "$TARGET_DATABASE_URL" "$WORK/auth-users.dump"

# 2) Aplicação (tabelas, dados, funções, políticas RLS, permissões).
#    O esquema "public" já existe no projeto novo: removemos só a entrada que o recriaria.
pg_restore -l "$WORK/public.dump" | grep -vE ' SCHEMA - public | COMMENT - SCHEMA public ' > "$WORK/lista.txt"
pg_restore --no-owner --exit-on-error -L "$WORK/lista.txt" -d "$TARGET_DATABASE_URL" "$WORK/public.dump"

# 3) O gatilho que cria o perfil de novos cadastros fica na tabela auth.users (fora do esquema public)
psql "$TARGET_DATABASE_URL" -v ON_ERROR_STOP=1 -q <<'SQL'
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
grant usage on schema public to anon, authenticated;
SQL

echo "Restauração concluída."
psql "$TARGET_DATABASE_URL" -At -c "select 'contas: ' || count(*) from auth.users union all select 'conteúdos: ' || count(*) from public.content_items union all select 'assinaturas: ' || count(*) from public.subscriptions"
