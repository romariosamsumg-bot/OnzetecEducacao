/**
 * Torna uma conta EXISTENTE administradora (o único jeito de criar um admin).
 *   DATABASE_URL=... npm run admin:grant -- email@dominio.com
 * Use a conexão direta do banco (credenciais do proprietário); nunca exponha isso na aplicação.
 */
import postgres from "postgres";

const email = process.argv[2]?.trim().toLowerCase();
if (!process.env.DATABASE_URL || !email) {
  console.error("Uso: DATABASE_URL=... npm run admin:grant -- email@dominio.com");
  process.exit(1);
}
const sql = postgres(process.env.DATABASE_URL, { max: 1 });
sql`update public.profiles set role = 'admin' where id = (select id from auth.users where lower(email) = ${email}) returning id`
  .then((rows) => {
    if (rows.length === 0) {
      console.error("Conta não encontrada. A pessoa precisa se cadastrar primeiro.");
      process.exitCode = 1;
    } else console.log(`✓ ${email} agora é administrador(a).`);
  })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
