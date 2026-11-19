/**
 * Aplica as migrações versionadas de supabase/migrations em ordem.
 *
 *   npm run db:migrate            -> usa DATABASE_URL
 *   npm run db:migrate -- --local -> aplica antes o shim do Supabase (somente PostgreSQL local)
 *
 * Em produção no Supabase, prefira `supabase db push` (mesmos arquivos).
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Defina DATABASE_URL.");
  process.exit(1);
}

const local = process.argv.includes("--local");
const sql = postgres(url, { max: 1, onnotice: () => {} });

async function main() {
  if (local) {
    const shim = readFileSync(join("db", "local", "000_supabase_shim.sql"), "utf8");
    await sql.unsafe(shim);
    console.log("✓ shim local do Supabase");
  }

  await sql`create table if not exists public.schema_migrations (
    version text primary key,
    applied_at timestamptz not null default now()
  )`;
  await sql`revoke all on public.schema_migrations from public`;

  const dir = join("supabase", "migrations");
  const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
  const applied = new Set(
    (await sql<{ version: string }[]>`select version from public.schema_migrations`).map((r) => r.version),
  );

  for (const file of files) {
    const version = file.replace(/\.sql$/, "");
    if (applied.has(version)) continue;
    const body = readFileSync(join(dir, file), "utf8");
    await sql.begin(async (tx) => {
      await tx.unsafe(body);
      await tx`insert into public.schema_migrations (version) values (${version})`;
    });
    console.log(`✓ ${version}`);
  }
  console.log("Migrações em dia.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
