import "server-only";
import postgres from "postgres";
import { env } from "@/lib/env";

/**
 * Acesso ao PostgreSQL.
 *
 * - asUser(id, fn): executa como o papel `authenticated` (ou `anon` se id = null),
 *   com auth.uid() = id. As políticas RLS do banco valem integralmente.
 * - asSystem(fn): conexão privilegiada (ignora RLS). Uso restrito a rotinas do
 *   servidor que não agem em nome de um usuário: webhooks de pagamento,
 *   reconciliação, limites de taxa. Nunca a partir de dados vindos do cliente
 *   sem autorização prévia.
 */
type Sql = postgres.Sql<Record<string, never>>;
export type Db = postgres.TransactionSql<Record<string, never>>;

const globalForDb = globalThis as unknown as { __ozSql?: Sql };

function client(): Sql {
  if (!globalForDb.__ozSql) {
    globalForDb.__ozSql = postgres(env().DATABASE_URL, {
      max: env().NODE_ENV === "production" ? 5 : 3,
      idle_timeout: 20,
      // Compatível com o pooler do Supabase em modo transação (porta 6543)
      prepare: false,
      transform: postgres.camel,
      onnotice: () => {},
    }) as unknown as Sql;
  }
  return globalForDb.__ozSql;
}

export async function asUser<T>(userId: string | null, fn: (db: Db) => Promise<T>): Promise<T> {
  const claims = userId ? { sub: userId, role: "authenticated" } : { role: "anon" };
  return client().begin(async (tx) => {
    await tx`select set_config('role', ${userId ? "authenticated" : "anon"}, true),
                    set_config('request.jwt.claims', ${JSON.stringify(claims)}, true)`;
    return fn(tx as unknown as Db);
  }) as Promise<T>;
}

export async function asSystem<T>(fn: (db: Db) => Promise<T>): Promise<T> {
  return client().begin(async (tx) => fn(tx as unknown as Db)) as Promise<T>;
}

export function json(value: unknown) {
  return client().json(value as postgres.JSONValue);
}

/** Erro do PostgreSQL com código (ex.: '42501' permissão, '23505' duplicado, 'OZ429' limite). */
export function pgCode(err: unknown): string | undefined {
  return typeof err === "object" && err && "code" in err ? String((err as { code: unknown }).code) : undefined;
}
