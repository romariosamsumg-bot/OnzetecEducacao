#!/usr/bin/env bash
# Backup criptografado do banco (usado diariamente pelo GitHub Actions).
#
#   DATABASE_URL=... BACKUP_AGE_RECIPIENT=age1... bash scripts/backup-db.sh [pasta_de_saida]
#
# Gera um único arquivo .tar.gz.age com:
#   public.dump      — esquema + dados da aplicação (pg_dump formato custom)
#   auth-users.dump  — somente dados das contas (auth.users / auth.identities)
# O arquivo é criptografado com a CHAVE PÚBLICA "age": só quem tem a chave
# privada (guardada fora da internet pelo proprietário) consegue abrir.
# Restauração: docs/05-publicacao.md § Backup.
set -euo pipefail

OUT_DIR="${1:-backup}"
: "${DATABASE_URL:?Defina DATABASE_URL}"
: "${BACKUP_AGE_RECIPIENT:?Defina BACKUP_AGE_RECIPIENT (chave pública age1...)}"
command -v age >/dev/null || { echo "Instale o 'age' (https://age-encryption.org)"; exit 1; }

mkdir -p "$OUT_DIR"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

# pg_dump local ou dentro de um contêiner (para casar a versão do servidor: PG_DOCKER_IMAGE=postgres:17)
dump() {
  if [ -n "${PG_DOCKER_IMAGE:-}" ]; then
    docker run --rm -i --network host -e DATABASE_URL "$PG_DOCKER_IMAGE" sh -c 'pg_dump "$DATABASE_URL" "$@"' sh "$@"
  else
    pg_dump "$DATABASE_URL" "$@"
  fi
}

# Esquema completo (tabelas, funções, políticas RLS e permissões) + dados
dump --format=custom --no-owner --schema=public > "$WORK/public.dump"
dump --format=custom --no-owner --no-privileges --data-only --table=auth.users --table=auth.identities > "$WORK/auth-users.dump"

STAMP="$(date -u +%Y%m%dT%H%MZ)"
FILE="$OUT_DIR/onzetec-$STAMP.tar.gz.age"
tar -C "$WORK" -czf - public.dump auth-users.dump | age -r "$BACKUP_AGE_RECIPIENT" > "$FILE"
echo "Backup criado: $FILE ($(du -h "$FILE" | cut -f1))"
