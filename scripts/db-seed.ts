/**
 * Popula o banco com CONTEÚDO DE DEMONSTRAÇÃO (is_demo = true).
 *
 *   npm run db:seed                -> categorias, sinônimos, planos (sem preço) e conteúdos demo
 *   npm run db:seed -- --dev-users -> também cria usuários de desenvolvimento (SOMENTE banco local)
 *
 * Idempotente: pode ser executado mais de uma vez.
 */
import postgres from "postgres";
import { articles, books, categories, courses, guides, shorts, synonyms } from "./seed-data";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Defina DATABASE_URL.");
  process.exit(1);
}
const devUsers = process.argv.includes("--dev-users");
if (devUsers && process.env.NODE_ENV === "production") {
  console.error("--dev-users não pode ser usado em produção.");
  process.exit(1);
}

const sql = postgres(url, { max: 1, onnotice: () => {} });
const today = new Date().toISOString().slice(0, 10);

async function main() {
  await sql.begin(async (tx) => {
    // Categorias
    for (const [i, c] of categories.entries()) {
      await tx`
        insert into public.categories (slug, name, description, icon, sort_order)
        values (${c.slug}, ${c.name}, ${c.description}, ${c.icon}, ${i})
        on conflict (slug) do update set name = excluded.name, description = excluded.description,
          icon = excluded.icon, sort_order = excluded.sort_order`;
    }
    const catRows = await tx<{ id: string; slug: string }[]>`select id, slug from public.categories`;
    const cat = Object.fromEntries(catRows.map((r) => [r.slug, r.id]));

    // Sinônimos
    for (const [term, expansions] of synonyms) {
      await tx`insert into public.search_synonyms (term, expansions) values (${term}, ${expansions})
        on conflict (term) do update set expansions = excluded.expansions`;
    }

    // Planos: SEM preço e inativos. O proprietário define os valores no painel.
    await tx`insert into public.plans (slug, name, description, interval, sort_order)
      values ('mensal', 'Plano mensal', 'Acesso a todos os cursos, guias e dicas. Renovação automática todo mês.', 'month', 1),
             ('anual', 'Plano anual', 'Acesso a todos os cursos, guias e dicas por 12 meses.', 'year', 2)
      on conflict (slug) do nothing`;

    // Vídeos de demonstração (arquivos estáticos locais — apenas para demonstração)
    const [lessonVideo] = await tx<{ id: string }[]>`
      insert into public.video_assets (provider, provider_asset_id, duration_seconds, poster_url, captions)
      values ('file', '/demo/media/aula-demo.mp4', 30, '/demo/media/aula-demo.jpg',
        ${sql.json([{ lang: "pt-BR", label: "Português", url: "/demo/media/aula-demo.pt-BR.vtt" }])})
      on conflict (provider, provider_asset_id) do update set duration_seconds = excluded.duration_seconds
      returning id`;
    const [shortVideo] = await tx<{ id: string }[]>`
      insert into public.video_assets (provider, provider_asset_id, duration_seconds, poster_url, captions)
      values ('file', '/demo/media/dica-demo.mp4', 15, '/demo/media/dica-demo.jpg',
        ${sql.json([{ lang: "pt-BR", label: "Português", url: "/demo/media/dica-demo.pt-BR.vtt" }])})
      on conflict (provider, provider_asset_id) do update set duration_seconds = excluded.duration_seconds
      returning id`;

    const publishedAt = new Date(Date.now() - 86400_000).toISOString();

    async function upsertItem(item: {
      type: "video" | "short" | "article" | "guide";
      slug: string;
      title: string;
      summary: string;
      category: string;
      access: "free" | "premium";
      app?: string;
      phrases?: string[];
      courseId?: string | null;
      moduleId?: string | null;
      position?: number;
      duration?: number | null;
    }) {
      const [row] = await tx<{ id: string }[]>`
        insert into public.content_items (type, slug, title, summary, category_id, access, status, published_at,
          app_name, os_name, last_reviewed_at, editorial_status, search_phrases, course_id, module_id, position,
          duration_seconds, is_demo)
        values (${item.type}, ${item.slug}, ${item.title}, ${item.summary}, ${cat[item.category]}, ${item.access},
          'published', ${publishedAt}, ${item.app ?? null}, ${"Android"}, ${today}, 'review_soon',
          ${item.phrases ?? []}, ${item.courseId ?? null}, ${item.moduleId ?? null}, ${item.position ?? 0},
          ${item.duration ?? null}, true)
        on conflict (slug) do update set title = excluded.title, summary = excluded.summary,
          category_id = excluded.category_id, access = excluded.access, search_phrases = excluded.search_phrases,
          course_id = excluded.course_id, module_id = excluded.module_id, position = excluded.position
        returning id`;
      return row.id;
    }

    // Cursos, módulos e aulas
    for (const course of courses) {
      const [c] = await tx<{ id: string }[]>`
        insert into public.courses (slug, title, summary, description, category_id, access, status, published_at,
          app_name, os_name, last_reviewed_at, editorial_status, is_demo)
        values (${course.slug}, ${course.title}, ${course.summary}, ${course.description}, ${cat[course.category]},
          'premium', 'published', ${publishedAt}, ${course.app ?? null}, 'Android', ${today}, 'review_soon', true)
        on conflict (slug) do update set title = excluded.title, summary = excluded.summary,
          description = excluded.description
        returning id`;
      await tx`delete from public.course_modules where course_id = ${c.id}`;
      for (const [mi, mod] of course.modules.entries()) {
        const [m] = await tx<{ id: string }[]>`
          insert into public.course_modules (course_id, title, position) values (${c.id}, ${mod.title}, ${mi})
          returning id`;
        for (const [li, lesson] of mod.lessons.entries()) {
          const id = await upsertItem({
            type: "video", slug: lesson.slug, title: lesson.title, summary: lesson.summary,
            category: course.category, access: lesson.access, app: course.app,
            courseId: c.id, moduleId: m.id, position: li, duration: 30,
          });
          await tx`insert into public.content_bodies (content_id, transcript, video_asset_id)
            values (${id}, ${lesson.transcript}, ${lessonVideo.id})
            on conflict (content_id) do update set transcript = excluded.transcript, video_asset_id = excluded.video_asset_id`;
        }
      }
    }

    // Dicas rápidas
    for (const s of shorts) {
      const id = await upsertItem({ type: "short", ...s, duration: 15 });
      await tx`insert into public.content_bodies (content_id, video_asset_id, materials)
        values (${id}, ${shortVideo.id}, ${sql.json([{ label: "Ver o curso completo", url: `/cursos/${s.related}` }])})
        on conflict (content_id) do update set video_asset_id = excluded.video_asset_id, materials = excluded.materials`;
    }

    // Artigos
    for (const a of articles) {
      const id = await upsertItem({ type: "article", ...a });
      await tx`insert into public.content_bodies (content_id, blocks) values (${id}, ${sql.json(a.blocks)})
        on conflict (content_id) do update set blocks = excluded.blocks`;
    }

    // Guias de solução
    for (const g of guides) {
      const id = await upsertItem({ type: "guide", ...g });
      const guide = {
        causes: g.causes,
        steps: g.steps.map((text) => ({ text, image_url: null, image_alt: null })),
        cautions: g.cautions,
        if_not_working: g.ifNotWorking,
      };
      await tx`insert into public.content_bodies (content_id, guide) values (${id}, ${sql.json(guide)})
        on conflict (content_id) do update set guide = excluded.guide`;
    }

    // Livros (sem preço: o proprietário define no painel)
    for (const b of books) {
      await tx`insert into public.books (slug, title, author, synopsis, table_of_contents, pages, format,
          included_in_subscription, status, published_at, is_demo)
        values (${b.slug}, ${b.title}, ${b.author}, ${b.synopsis}, ${b.toc}, ${b.pages}, 'pdf', ${b.included},
          'published', ${publishedAt}, true)
        on conflict (slug) do update set title = excluded.title, synopsis = excluded.synopsis`;
    }

    if (devUsers) {
      const users = [
        { email: "admin@onzetec.local", name: "Administrador (dev)", role: "admin" },
        { email: "assinante@onzetec.local", name: "Maria Assinante (dev)", role: "member" },
        { email: "visitante@onzetec.local", name: "João Cadastrado (dev)", role: "member" },
      ];
      for (const u of users) {
        await tx`insert into auth.users (email, raw_user_meta_data)
          values (${u.email}, ${sql.json({ display_name: u.name })}) on conflict (email) do nothing`;
        await tx`update public.profiles set role = ${u.role}, display_name = ${u.name}
          where id = (select id from auth.users where email = ${u.email})`;
      }
      const [plan] = await tx<{ id: string }[]>`select id from public.plans where slug = 'mensal'`;
      await tx`insert into public.subscriptions (user_id, plan_id, status, provider, current_period_start, current_period_end)
        select u.id, ${plan.id}, 'active', 'grant', now(), now() + interval '30 days'
        from auth.users u where u.email = 'assinante@onzetec.local'
          and not exists (select 1 from public.subscriptions s where s.user_id = u.id)`;
      console.log("✓ usuários de desenvolvimento");
    }
  });
  console.log("✓ conteúdo de demonstração");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
