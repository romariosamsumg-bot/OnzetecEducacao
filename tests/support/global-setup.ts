import { execFileSync } from "node:child_process";
import postgres from "postgres";

/** Recria o banco de teste do zero: shim do Supabase + migrações + seed de demonstração. */
export default async function setup() {
  const url = process.env.TEST_DATABASE_URL ?? "postgres://onzetec:onzetec_local_dev@localhost:5432/onzetec_test";
  const sql = postgres(url, { max: 1, onnotice: () => {} });
  await sql.unsafe(`
    drop schema if exists public cascade; create schema public;
    drop schema if exists auth cascade; drop schema if exists extensions cascade;
    grant usage on schema public to anon, authenticated;
  `);
  await sql.end();
  const env = { ...process.env, DATABASE_URL: url };
  execFileSync("npx", ["tsx", "scripts/db-migrate.ts", "--local"], { env, stdio: "pipe" });
  execFileSync("npx", ["tsx", "scripts/db-seed.ts", "--dev-users"], { env, stdio: "pipe" });
}
