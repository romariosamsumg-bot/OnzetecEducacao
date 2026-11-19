import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { as, createUser, sql, userId } from "../support/db";

let admin: string, subscriber: string, visitor: string;
let freeLesson: string, premiumLesson: string, premiumGuide: string;

beforeAll(async () => {
  admin = await userId("admin@onzetec.local");
  subscriber = await userId("assinante@onzetec.local");
  visitor = await userId("visitante@onzetec.local");
  const ids = await sql<{ id: string; slug: string }[]>`select id, slug from public.content_items`;
  const by = (s: string) => ids.find((i) => i.slug === s)!.id;
  freeLesson = by("ligar-desligar-e-reiniciar");
  premiumLesson = by("botoes-e-gestos-da-tela");
  premiumGuide = by("celular-lento");
});
afterAll(() => sql.end());

describe("conteúdo pago protegido no banco", () => {
  it("visitante anônimo vê metadados públicos, mas não o corpo pago", async () => {
    const meta = await as(null, (tx) => tx`select title from public.content_items where id = ${premiumLesson}`);
    expect(meta).toHaveLength(1);
    const body = await as(null, (tx) => tx`select * from public.content_bodies where content_id in (${premiumLesson}, ${premiumGuide})`);
    expect(body).toHaveLength(0);
    const video = await as(null, (tx) => tx`select va.* from public.video_assets va join public.content_bodies b on b.video_asset_id = va.id where b.content_id = ${premiumLesson}`);
    expect(video).toHaveLength(0);
  });
  it("conta gratuita também não vê o corpo pago, mas vê o gratuito", async () => {
    expect(await as(visitor, (tx) => tx`select 1 from public.content_bodies where content_id = ${premiumGuide}`)).toHaveLength(0);
    expect(await as(visitor, (tx) => tx`select 1 from public.content_bodies where content_id = ${freeLesson}`)).toHaveLength(1);
  });
  it("assinante ativo vê o corpo pago", async () => {
    expect(await as(subscriber, (tx) => tx`select 1 from public.content_bodies where content_id = ${premiumGuide}`)).toHaveLength(1);
  });
  it("assinatura cancelada com período vencido perde o acesso", async () => {
    const u = await createUser("vencido@teste.local");
    const [plan] = await sql<{ id: string }[]>`select id from public.plans limit 1`;
    await sql`insert into public.subscriptions (user_id, plan_id, status, provider, price_cents, current_period_end)
      values (${u}, ${plan.id}, 'canceled', 'mercadopago', 1000, now() - interval '1 day')`;
    expect(await as(u, (tx) => tx`select 1 from public.content_bodies where content_id = ${premiumGuide}`)).toHaveLength(0);
  });
  it("rascunho não aparece para ninguém além do administrador", async () => {
    await sql`update public.content_items set status = 'draft' where id = ${premiumGuide}`;
    try {
      expect(await as(subscriber, (tx) => tx`select 1 from public.content_items where id = ${premiumGuide}`)).toHaveLength(0);
      expect(await as(admin, (tx) => tx`select 1 from public.content_items where id = ${premiumGuide}`)).toHaveLength(1);
    } finally {
      await sql`update public.content_items set status = 'published' where id = ${premiumGuide}`;
    }
  });
  it("conteúdo agendado para o futuro fica oculto até a data", async () => {
    await sql`update public.content_items set status = 'scheduled', published_at = now() + interval '1 day' where id = ${freeLesson}`;
    try {
      expect(await as(null, (tx) => tx`select 1 from public.content_items where id = ${freeLesson}`)).toHaveLength(0);
    } finally {
      await sql`update public.content_items set status = 'published', published_at = now() - interval '1 day' where id = ${freeLesson}`;
    }
  });
});

describe("permissões administrativas", () => {
  it("usuário comum não consegue se tornar administrador", async () => {
    await expect(as(visitor, (tx) => tx`update public.profiles set role = 'admin' where id = ${visitor}`)).rejects.toThrow(/permission denied/);
  });
  it("usuário comum não cria nem altera conteúdo oficial", async () => {
    const r = await as(subscriber, (tx) => tx`update public.content_items set title = 'Hackeado' where id = ${freeLesson} returning id`);
    expect(r).toHaveLength(0);
    await expect(
      as(subscriber, (tx) => tx`insert into public.content_items (type, slug, title) values ('article', 'falso', 'Falso')`),
    ).rejects.toThrow(/row-level security/);
  });
  it("usuário comum não concede assinatura a si mesmo", async () => {
    const [plan] = await sql<{ id: string }[]>`select id from public.plans limit 1`;
    await expect(
      as(visitor, (tx) => tx`insert into public.subscriptions (user_id, plan_id, status, provider) values (${visitor}, ${plan.id}, 'active', 'grant')`),
    ).rejects.toThrow(/permission denied/);
  });
  it("administrador edita conteúdo", async () => {
    const r = await as(admin, (tx) => tx`update public.content_items set summary = summary where id = ${freeLesson} returning id`);
    expect(r).toHaveLength(1);
  });
  it("ninguém além do admin lê eventos de cobrança e registros administrativos", async () => {
    expect(await as(subscriber, (tx) => tx`select * from public.billing_events`)).toHaveLength(0);
    expect(await as(subscriber, (tx) => tx`select * from public.admin_audit_log`)).toHaveLength(0);
    await expect(as(subscriber, (tx) => tx`select * from public.rate_limits`)).rejects.toThrow(/permission denied/);
  });
});

describe("privacidade entre usuários", () => {
  it("cada pessoa só vê o próprio perfil, assinatura e progresso", async () => {
    const profiles = await as(visitor, (tx) => tx<{ id: string }[]>`select id from public.profiles`);
    expect(profiles.map((p) => p.id)).toEqual([visitor]);
    expect(await as(visitor, (tx) => tx`select * from public.subscriptions where user_id = ${subscriber}`)).toHaveLength(0);
  });
  it("não é possível curtir ou salvar em nome de outra pessoa", async () => {
    await expect(as(visitor, (tx) => tx`insert into public.likes (user_id, content_id) values (${subscriber}, ${freeLesson})`)).rejects.toThrow(/row-level security/);
  });
  it("progresso em aula paga exige acesso", async () => {
    await expect(
      as(visitor, (tx) => tx`insert into public.progress (user_id, content_id, position_seconds) values (${visitor}, ${premiumLesson}, 10)`),
    ).rejects.toThrow(/row-level security/);
  });
});

describe("comunidade", () => {
  it("assinante comenta; comentário comum é publicado", async () => {
    const [c] = await as(subscriber, (tx) => tx<{ status: string; isOfficial: boolean }[]>`
      insert into public.comments (content_id, user_id, body) values (${freeLesson}, ${subscriber}, 'Muito boa a aula!') returning status, is_official`);
    expect(c).toEqual({ status: "published", isOfficial: false });
  });
  it("links, CPF e códigos ficam retidos para moderação", async () => {
    for (const body of ["veja www.golpe-site.com", "meu cpf 123.456.789-00", "o código é 482 913"]) {
      const [c] = await as(subscriber, (tx) => tx<{ status: string }[]>`
        insert into public.comments (content_id, user_id, body) values (${freeLesson}, ${subscriber}, ${body}) returning status`);
      expect(c.status).toBe("pending");
    }
  });
  it("conta sem assinatura não comenta", async () => {
    await expect(
      as(visitor, (tx) => tx`insert into public.comments (content_id, user_id, body) values (${freeLesson}, ${visitor}, 'Olá')`),
    ).rejects.toThrow(/row-level security/);
  });
  it("ninguém se passa por professor nem altera o status do próprio comentário", async () => {
    const [c] = await as(subscriber, (tx) => tx<{ isOfficial: boolean }[]>`
      insert into public.comments (content_id, user_id, body, is_official, status) values (${freeLesson}, ${subscriber}, 'Sou o professor', true, 'published') returning is_official`);
    expect(c.isOfficial).toBe(false);
    await expect(
      as(subscriber, async (tx) => {
        const [x] = await tx<{ id: string }[]>`insert into public.comments (content_id, user_id, body) values (${freeLesson}, ${subscriber}, 'veja www.x.com') returning id`;
        await tx`update public.comments set status = 'published' where id = ${x.id}`;
      }),
    ).rejects.toThrow(/moderação/);
  });
  it("resposta do administrador é marcada como oficial", async () => {
    const [c] = await as(admin, (tx) => tx<{ isOfficial: boolean }[]>`
      insert into public.comments (content_id, user_id, body) values (${freeLesson}, ${admin}, 'Resposta do professor') returning is_official`);
    expect(c.isOfficial).toBe(true);
  });
  it("limita comentários em sequência (anti-spam)", async () => {
    await expect(
      as(subscriber, async (tx) => {
        for (let i = 0; i < 6; i++) await tx`insert into public.comments (content_id, user_id, body) values (${freeLesson}, ${subscriber}, ${"Comentário " + i})`;
      }),
    ).rejects.toThrow(/Muitos comentários/);
  });
});

describe("progresso", () => {
  it("abrir/gravar posição não marca como concluída; conclusão não é desfeita por nova posição", async () => {
    await as(subscriber, async (tx) => {
      const [p] = await tx<{ completedAt: Date | null }[]>`insert into public.progress (user_id, content_id, position_seconds)
        values (${subscriber}, ${premiumLesson}, 3) returning completed_at`;
      expect(p.completedAt).toBeNull();
      await tx`update public.progress set completed_at = now() where user_id = ${subscriber} and content_id = ${premiumLesson}`;
      const [q] = await tx<{ completedAt: Date | null; maxPositionSeconds: number }[]>`update public.progress set position_seconds = 1, completed_at = null
        where user_id = ${subscriber} and content_id = ${premiumLesson} returning completed_at, max_position_seconds`;
      expect(q.completedAt).not.toBeNull();
      expect(q.maxPositionSeconds).toBe(3);
    });
  });
});

describe("livros", () => {
  it("arquivo do livro só é legível com direito de acesso", async () => {
    const [book] = await sql<{ id: string }[]>`select id from public.books where slug = 'guia-de-bolso-do-whatsapp'`;
    await sql`insert into public.book_files (book_id, storage_path) values (${book.id}, 'books/teste.pdf') on conflict do nothing`;
    expect(await as(subscriber, (tx) => tx`select * from public.book_files where book_id = ${book.id}`)).toHaveLength(0);
    await sql`insert into public.book_entitlements (user_id, book_id, source) values (${visitor}, ${book.id}, 'grant')`;
    expect(await as(visitor, (tx) => tx`select * from public.book_files where book_id = ${book.id}`)).toHaveLength(1);
  });
  it("livro incluído na assinatura é acessível ao assinante", async () => {
    const [book] = await sql<{ id: string }[]>`select id from public.books where slug = 'seguranca-digital-para-a-familia'`;
    await sql`insert into public.book_files (book_id, storage_path) values (${book.id}, 'books/familia.pdf') on conflict do nothing`;
    expect(await as(subscriber, (tx) => tx`select * from public.book_files where book_id = ${book.id}`)).toHaveLength(1);
    expect(await as(visitor, (tx) => tx`select * from public.book_files where book_id = ${book.id}`)).toHaveLength(0);
  });
});

describe("busca", () => {
  it("encontra o guia com linguagem do dia a dia", async () => {
    const rows = await as(null, (tx) => tx<{ slug: string }[]>`
      select slug from public.content_items where search_vector @@ to_tsquery('public.pt_unaccent', 'whatsapp:* | mudo:* | som:*')`);
    expect(rows.map((r) => r.slug)).toContain("whatsapp-nao-toca");
  });
});

describe("planos", () => {
  it("assinante vê o plano contratado mesmo fora de venda; visitante não vê planos inativos", async () => {
    const own = await as(subscriber, (tx) => tx`select p.name from public.subscriptions s join public.plans p on p.id = s.plan_id where s.user_id = ${subscriber}`);
    expect(own.length).toBeGreaterThan(0);
    expect(await as(null, (tx) => tx`select 1 from public.plans where not is_active`)).toHaveLength(0);
  });
});
