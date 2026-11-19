import postgres from "postgres";

export const sql = postgres(process.env.TEST_DATABASE_URL!, { max: 2, onnotice: () => {}, transform: postgres.camel });

export async function userId(email: string): Promise<string> {
  const [u] = await sql<{ id: string }[]>`select id from auth.users where email = ${email}`;
  return u.id;
}

/** Executa como um papel do Supabase (anon/authenticated) com auth.uid() definido; sempre desfaz. */
export async function as<T>(uid: string | null, fn: (tx: postgres.TransactionSql) => Promise<T>): Promise<T> {
  let result: T;
  try {
    await sql.begin(async (tx) => {
      const claims = uid ? { sub: uid, role: "authenticated" } : { role: "anon" };
      await tx`select set_config('role', ${uid ? "authenticated" : "anon"}, true), set_config('request.jwt.claims', ${JSON.stringify(claims)}, true)`;
      result = await fn(tx);
      throw new Rollback();
    });
  } catch (e) {
    if (!(e instanceof Rollback)) throw e;
  }
  return result!;
}
class Rollback extends Error {}

export async function createUser(email: string, name = "Teste"): Promise<string> {
  const [u] = await sql<{ id: string }[]>`insert into auth.users (email, raw_user_meta_data) values (${email}, ${sql.json({ display_name: name })})
    on conflict (email) do update set email = excluded.email returning id`;
  return u.id;
}
