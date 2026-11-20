/**
 * Gera db/supabase-setup.sql: TODAS as migrações + conteúdo base (categorias,
 * sinônimos de busca e planos sem preço), num único arquivo para colar no
 * SQL Editor do Supabase — sem precisar instalar nada no computador.
 * NÃO inclui conteúdos de demonstração nem contas de teste.
 *
 *   npm run db:setup-sql
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { categories, synonyms } from "./seed-data";

const q = (s: string) => `'${s.replace(/'/g, "''")}'`;
const arr = (a: string[]) => `array[${a.map(q).join(", ")}]::text[]`;

const dir = join("supabase", "migrations");
const migrations = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();

let out = `-- =====================================================================
-- Onzetec Educação — configuração completa do banco (Supabase)
-- Gerado por scripts/build-setup-sql.ts. Não edite à mão.
-- Como usar: Supabase > SQL Editor > New query > cole TODO o conteúdo > Run.
-- Use em um projeto NOVO (rodar duas vezes gera erro de "já existe").
-- =====================================================================

`;
for (const f of migrations) {
  out += `-- >>> ${f}\n${readFileSync(join(dir, f), "utf8").trim()}\n\n`;
}

out += `-- >>> Conteúdo base (sem demonstração)\n`;
categories.forEach((c, i) => {
  out += `insert into public.categories (slug, name, description, icon, sort_order) values (${q(c.slug)}, ${q(c.name)}, ${q(c.description)}, ${q(c.icon)}, ${i}) on conflict (slug) do nothing;\n`;
});
for (const [term, exp] of synonyms) {
  out += `insert into public.search_synonyms (term, expansions) values (${q(term)}, ${arr(exp)}) on conflict (term) do nothing;\n`;
}
out += `insert into public.plans (slug, name, description, interval, sort_order) values
  ('mensal', 'Plano mensal', 'Acesso a todos os cursos, guias e dicas. Renovação automática todo mês.', 'month', 1),
  ('anual', 'Plano anual', 'Acesso a todos os cursos, guias e dicas por 12 meses.', 'year', 2)
  on conflict (slug) do nothing;

-- Pronto. Próximo passo: criar sua conta pelo site e torná-la administradora (ver docs/05-publicacao.md).
`;

writeFileSync(join("db", "supabase-setup.sql"), out);
console.log(`✓ db/supabase-setup.sql (${migrations.length} migrações + conteúdo base)`);
