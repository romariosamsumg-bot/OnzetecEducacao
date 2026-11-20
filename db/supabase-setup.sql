-- =====================================================================
-- Onzetec Educação — configuração completa do banco (Supabase)
-- Gerado por scripts/build-setup-sql.ts. Não edite à mão.
-- Como usar: Supabase > SQL Editor > New query > cole TODO o conteúdo > Run.
-- Use em um projeto NOVO (rodar duas vezes gera erro de "já existe").
-- =====================================================================

-- >>> 20261119000100_core_schema.sql
-- =====================================================================
-- Onzetec Educação — esquema principal
-- Compatível com Supabase (schemas auth/extensions já existentes) e com
-- PostgreSQL 15+ local usando db/local/000_supabase_shim.sql.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;
create extension if not exists unaccent with schema extensions;
create extension if not exists pg_trgm with schema extensions;

-- ---------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------
create type public.app_role as enum ('member', 'admin');
create type public.content_type as enum ('video', 'short', 'article', 'guide');
create type public.access_level as enum ('free', 'premium');
create type public.publish_status as enum ('draft', 'scheduled', 'published', 'archived');
create type public.editorial_status as enum ('current', 'review_soon', 'outdated');
create type public.comment_status as enum ('published', 'pending', 'hidden', 'removed');
create type public.report_status as enum ('open', 'resolved', 'dismissed');
create type public.subscription_status as enum ('pending', 'active', 'past_due', 'paused', 'canceled', 'expired');
create type public.billing_interval as enum ('month', 'year');
create type public.order_status as enum ('pending', 'paid', 'failed', 'refunded', 'canceled');
create type public.video_provider as enum ('cloudflare_stream', 'mux', 'file');

-- Configuração de busca em português sem acentos ("não" = "nao").
create text search configuration public.pt_unaccent (copy = pg_catalog.portuguese);
alter text search configuration public.pt_unaccent
  alter mapping for hword, hword_part, word with extensions.unaccent, portuguese_stem;

create or replace function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------------------------------------------------------------------
-- Usuários
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 80),
  role public.app_role not null default 'member',
  text_scale smallint not null default 100 check (text_scale in (100, 115, 130)),
  reduce_motion boolean not null default false,
  learning_interest text check (learning_interest in ('celular', 'whatsapp', 'resolver', 'redes', 'seguranca')),
  onboarding_done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Cria o perfil automaticamente quando a conta é criada no Auth.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'display_name', split_part(coalesce(new.email, ''), '@', 1)), 80)
  )
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- Catálogo
-- ---------------------------------------------------------------------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 2 and 60),
  description text not null default '' check (char_length(description) <= 300),
  icon text not null default 'book-open' check (icon ~ '^[a-z0-9-]{2,40}$'),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger categories_updated_at before update on public.categories
  for each row execute function public.set_updated_at();

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 3 and 140),
  summary text not null default '' check (char_length(summary) <= 400),
  description text not null default '' check (char_length(description) <= 5000),
  cover_image_url text,
  category_id uuid references public.categories (id) on delete set null,
  access public.access_level not null default 'premium',
  status public.publish_status not null default 'draft',
  published_at timestamptz,
  level text not null default 'iniciante' check (level in ('iniciante', 'intermediario')),
  -- Metadados editoriais (tecnologia muda; registramos o contexto do tutorial)
  app_name text check (char_length(app_name) <= 60),
  os_name text check (char_length(os_name) <= 60),
  version_range text check (char_length(version_range) <= 60),
  last_reviewed_at date,
  editorial_status public.editorial_status not null default 'current',
  search_vector tsvector,
  is_demo boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index courses_category_idx on public.courses (category_id);
create index courses_status_idx on public.courses (status, published_at desc);
create index courses_search_idx on public.courses using gin (search_vector);
create trigger courses_updated_at before update on public.courses
  for each row execute function public.set_updated_at();

create table public.course_modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  title text not null check (char_length(title) between 2 and 140),
  description text not null default '' check (char_length(description) <= 600),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index course_modules_course_idx on public.course_modules (course_id, position);
create trigger course_modules_updated_at before update on public.course_modules
  for each row execute function public.set_updated_at();

-- Vídeos ficam no provedor de streaming; aqui só a referência.
create table public.video_assets (
  id uuid primary key default gen_random_uuid(),
  provider public.video_provider not null,
  provider_asset_id text not null check (char_length(provider_asset_id) between 1 and 300),
  status text not null default 'ready' check (status in ('processing', 'ready', 'error')),
  duration_seconds integer check (duration_seconds >= 0),
  poster_url text,
  -- [{ "lang": "pt-BR", "label": "Português", "url": "..." }]
  captions jsonb not null default '[]'::jsonb check (jsonb_typeof(captions) = 'array'),
  created_at timestamptz not null default now(),
  unique (provider, provider_asset_id)
);

-- Conteúdo unificado: videoaula, dica rápida, artigo e guia de solução.
create table public.content_items (
  id uuid primary key default gen_random_uuid(),
  type public.content_type not null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 3 and 140),
  -- Resumo público (aparece para visitantes e buscadores)
  summary text not null default '' check (char_length(summary) <= 600),
  cover_image_url text,
  category_id uuid references public.categories (id) on delete set null,
  course_id uuid references public.courses (id) on delete cascade,
  module_id uuid references public.course_modules (id) on delete set null,
  position integer not null default 0,
  access public.access_level not null default 'premium',
  status public.publish_status not null default 'draft',
  published_at timestamptz,
  comments_enabled boolean not null default true,
  duration_seconds integer check (duration_seconds >= 0),
  level text not null default 'iniciante' check (level in ('iniciante', 'intermediario')),
  app_name text check (char_length(app_name) <= 60),
  os_name text check (char_length(os_name) <= 60),
  version_range text check (char_length(version_range) <= 60),
  last_reviewed_at date,
  editorial_status public.editorial_status not null default 'current',
  -- Frases populares para a busca ("meu zap não toca")
  search_phrases text[] not null default '{}',
  search_vector tsvector,
  likes_count integer not null default 0 check (likes_count >= 0),
  is_demo boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_module_only_for_video check (module_id is null or type = 'video'),
  constraint content_module_requires_course check (module_id is null or course_id is not null)
);
create index content_items_type_status_idx on public.content_items (type, status, published_at desc);
create index content_items_category_idx on public.content_items (category_id);
create index content_items_course_idx on public.content_items (course_id, module_id, position);
create index content_items_search_idx on public.content_items using gin (search_vector);
create index content_items_title_trgm_idx on public.content_items using gin (title extensions.gin_trgm_ops);
create index content_items_review_idx on public.content_items (last_reviewed_at);
create trigger content_items_updated_at before update on public.content_items
  for each row execute function public.set_updated_at();

-- Corpo protegido: só é entregue a quem tem direito de acesso (RLS).
create table public.content_bodies (
  content_id uuid primary key references public.content_items (id) on delete cascade,
  -- Artigo: [{ "type": "paragraph|heading|image|tip|warning", "text": "...", "url": "...", "alt": "..." }]
  blocks jsonb not null default '[]'::jsonb check (jsonb_typeof(blocks) = 'array'),
  -- Guia: { "causes": [...], "steps": [{ "text", "image_url", "image_alt" }], "cautions": [...], "if_not_working": "..." }
  guide jsonb check (guide is null or jsonb_typeof(guide) = 'object'),
  transcript text check (char_length(transcript) <= 100000),
  -- [{ "label": "...", "url": "..." }]
  materials jsonb not null default '[]'::jsonb check (jsonb_typeof(materials) = 'array'),
  video_asset_id uuid references public.video_assets (id) on delete set null,
  updated_at timestamptz not null default now()
);
create index content_bodies_video_idx on public.content_bodies (video_asset_id);
create trigger content_bodies_updated_at before update on public.content_bodies
  for each row execute function public.set_updated_at();

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 2 and 40)
);

create table public.content_tags (
  content_id uuid not null references public.content_items (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  primary key (content_id, tag_id)
);
create index content_tags_tag_idx on public.content_tags (tag_id);

-- Sinônimos e termos populares: "zap" -> {"whatsapp"}
create table public.search_synonyms (
  id uuid primary key default gen_random_uuid(),
  term text not null unique check (term = lower(term) and char_length(term) between 2 and 40),
  expansions text[] not null check (cardinality(expansions) between 1 and 10),
  created_at timestamptz not null default now()
);

-- Buscas sem resultado (sem identificar o usuário) para orientar novos tutoriais.
create table public.search_misses (
  query text primary key check (char_length(query) between 2 and 120),
  hits integer not null default 1,
  last_seen_at timestamptz not null default now()
);

-- Índice de busca mantido por gatilho (evita funções não-imutáveis em índices).
create or replace function public.content_items_search_update() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.search_vector :=
    setweight(to_tsvector('public.pt_unaccent', coalesce(new.title, '')), 'A') ||
    setweight(to_tsvector('public.pt_unaccent', array_to_string(coalesce(new.search_phrases, '{}'), ' ')), 'A') ||
    setweight(to_tsvector('public.pt_unaccent', coalesce(new.app_name, '')), 'B') ||
    setweight(to_tsvector('public.pt_unaccent', coalesce(new.summary, '')), 'C');
  return new;
end $$;
create trigger content_items_search before insert or update of title, summary, search_phrases, app_name
  on public.content_items for each row execute function public.content_items_search_update();

create or replace function public.courses_search_update() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.search_vector :=
    setweight(to_tsvector('public.pt_unaccent', coalesce(new.title, '')), 'A') ||
    setweight(to_tsvector('public.pt_unaccent', coalesce(new.app_name, '')), 'B') ||
    setweight(to_tsvector('public.pt_unaccent', coalesce(new.summary, '')), 'C');
  return new;
end $$;
create trigger courses_search before insert or update of title, summary, app_name
  on public.courses for each row execute function public.courses_search_update();

-- ---------------------------------------------------------------------
-- Interações
-- ---------------------------------------------------------------------
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references public.content_items (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  parent_id uuid references public.comments (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  status public.comment_status not null default 'published',
  is_official boolean not null default false,
  moderation_reason text check (char_length(moderation_reason) <= 200),
  edited_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index comments_content_idx on public.comments (content_id, created_at);
create index comments_status_idx on public.comments (status, created_at desc);
create index comments_user_idx on public.comments (user_id, created_at desc);
create index comments_parent_idx on public.comments (parent_id);
create trigger comments_updated_at before update on public.comments
  for each row execute function public.set_updated_at();

create table public.comment_reports (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.comments (id) on delete cascade,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reason text not null check (reason in ('golpe', 'ofensivo', 'spam', 'dados_pessoais', 'outro')),
  details text check (char_length(details) <= 500),
  status public.report_status not null default 'open',
  resolved_by uuid references public.profiles (id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  unique (comment_id, reporter_id)
);
create index comment_reports_status_idx on public.comment_reports (status, created_at desc);

create table public.likes (
  user_id uuid not null references public.profiles (id) on delete cascade,
  content_id uuid not null references public.content_items (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, content_id)
);
create index likes_content_idx on public.likes (content_id);

create table public.saves (
  user_id uuid not null references public.profiles (id) on delete cascade,
  content_id uuid not null references public.content_items (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, content_id)
);

create table public.progress (
  user_id uuid not null references public.profiles (id) on delete cascade,
  content_id uuid not null references public.content_items (id) on delete cascade,
  position_seconds integer not null default 0 check (position_seconds >= 0),
  max_position_seconds integer not null default 0 check (max_position_seconds >= 0),
  duration_seconds integer check (duration_seconds >= 0),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, content_id)
);
create index progress_user_recent_idx on public.progress (user_id, updated_at desc);

-- "Esta solução funcionou?"
create table public.guide_feedback (
  user_id uuid not null references public.profiles (id) on delete cascade,
  content_id uuid not null references public.content_items (id) on delete cascade,
  helpful boolean not null,
  created_at timestamptz not null default now(),
  primary key (user_id, content_id)
);

-- ---------------------------------------------------------------------
-- Monetização
-- ---------------------------------------------------------------------
create table public.plans (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 2 and 60),
  description text not null default '' check (char_length(description) <= 400),
  interval public.billing_interval not null,
  interval_count smallint not null default 1 check (interval_count between 1 and 12),
  -- Preço em centavos. NULL = ainda não definido (plano não pode ser vendido).
  price_cents integer check (price_cents > 0),
  currency char(3) not null default 'BRL',
  is_active boolean not null default false,
  provider_plan_id text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint plan_active_requires_price check (not is_active or price_cents is not null)
);
create trigger plans_updated_at before update on public.plans
  for each row execute function public.set_updated_at();

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  plan_id uuid not null references public.plans (id),
  status public.subscription_status not null default 'pending',
  provider text not null,
  provider_subscription_id text,
  -- Valor contratado no momento da assinatura (o preço do plano pode mudar depois).
  -- provider = 'grant' representa acesso de cortesia concedido pelo administrador.
  price_cents integer check (price_cents > 0),
  currency char(3) not null default 'BRL',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  canceled_at timestamptz,
  last_payment_status text,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_subscription_id),
  constraint subscription_price_required check (provider = 'grant' or price_cents is not null)
);
create index subscriptions_user_idx on public.subscriptions (user_id, created_at desc);
create index subscriptions_status_idx on public.subscriptions (status);
-- No máximo uma assinatura vigente por pessoa.
create unique index subscriptions_one_live_per_user on public.subscriptions (user_id)
  where status in ('active', 'past_due', 'paused');
create trigger subscriptions_updated_at before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- Eventos recebidos do provedor (idempotência + auditoria).
create table public.billing_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_key text not null,
  topic text not null,
  resource_id text,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'received' check (status in ('received', 'processed', 'ignored', 'failed')),
  error text,
  attempts integer not null default 0,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (provider, event_key)
);
create index billing_events_status_idx on public.billing_events (status, received_at desc);

-- ---------------------------------------------------------------------
-- Livraria
-- ---------------------------------------------------------------------
create table public.books (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 2 and 160),
  author text not null check (char_length(author) between 2 and 120),
  synopsis text not null default '' check (char_length(synopsis) <= 4000),
  table_of_contents text[] not null default '{}',
  cover_image_url text,
  format text not null default 'pdf' check (format in ('pdf', 'epub')),
  pages integer check (pages > 0),
  price_cents integer check (price_cents > 0),
  currency char(3) not null default 'BRL',
  included_in_subscription boolean not null default false,
  sample_url text,
  status public.publish_status not null default 'draft',
  published_at timestamptz,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger books_updated_at before update on public.books
  for each row execute function public.set_updated_at();

-- Caminho do arquivo no armazenamento privado (separado para proteger via RLS).
create table public.book_files (
  book_id uuid primary key references public.books (id) on delete cascade,
  storage_path text not null check (char_length(storage_path) between 3 and 300),
  updated_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  status public.order_status not null default 'pending',
  total_cents integer not null check (total_cents > 0),
  currency char(3) not null default 'BRL',
  provider text not null,
  provider_checkout_id text,
  provider_payment_id text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index orders_user_idx on public.orders (user_id, created_at desc);
create unique index orders_provider_payment_idx on public.orders (provider, provider_payment_id)
  where provider_payment_id is not null;
create trigger orders_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

create table public.order_items (
  order_id uuid not null references public.orders (id) on delete cascade,
  book_id uuid not null references public.books (id),
  unit_price_cents integer not null check (unit_price_cents > 0),
  primary key (order_id, book_id)
);

-- Direito de acesso a um livro comprado ou concedido.
create table public.book_entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  book_id uuid not null references public.books (id) on delete cascade,
  source text not null check (source in ('purchase', 'grant')),
  order_id uuid references public.orders (id) on delete set null,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz
);
create unique index book_entitlements_active_idx on public.book_entitlements (user_id, book_id)
  where revoked_at is null;

-- ---------------------------------------------------------------------
-- Operação, privacidade e segurança
-- ---------------------------------------------------------------------
create table public.admin_audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null check (char_length(action) <= 80),
  entity_type text not null check (char_length(entity_type) <= 40),
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index admin_audit_log_created_idx on public.admin_audit_log (created_at desc);

create table public.data_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('deletion')),
  status text not null default 'open' check (status in ('open', 'done', 'rejected')),
  notes text check (char_length(notes) <= 1000),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create unique index data_requests_open_idx on public.data_requests (user_id, kind) where status = 'open';

create table public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  hits integer not null default 1,
  primary key (key, window_start)
);

-- >>> 20261119000200_security_policies.sql
-- =====================================================================
-- Onzetec Educação — funções de autorização, regras de comunidade e RLS
-- Princípio: o banco é a segunda barreira. Mesmo que uma rota do servidor
-- falhe, um usuário comum não lê conteúdo pago nem se torna administrador.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Funções auxiliares de autorização (SECURITY DEFINER com search_path vazio)
-- ---------------------------------------------------------------------
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
$$;

create or replace function public.is_live_now(p_status public.publish_status, p_published_at timestamptz)
returns boolean language sql stable set search_path = '' as $$
  select p_status in ('published', 'scheduled')
     and p_published_at is not null
     and p_published_at <= now()
$$;

-- Regras de acesso da assinatura (carências documentadas em docs/02-arquitetura.md):
--   active   -> acesso até o fim do período + 2 dias (atraso de processamento da renovação)
--   past_due -> acesso até o fim do período + 5 dias (novas tentativas de cobrança)
--   canceled -> acesso até o fim do período já pago
--   pending, paused, expired -> sem acesso
create or replace function public.subscription_grants_access(
  p_status public.subscription_status, p_period_end timestamptz
) returns boolean language sql stable set search_path = '' as $$
  select case p_status
    when 'active' then p_period_end is null or p_period_end + interval '2 days' > now()
    when 'past_due' then p_period_end is not null and p_period_end + interval '5 days' > now()
    when 'canceled' then p_period_end is not null and p_period_end > now()
    else false
  end
$$;

create or replace function public.has_active_subscription() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.subscriptions s
    where s.user_id = auth.uid()
      and public.subscription_grants_access(s.status, s.current_period_end)
  )
$$;

create or replace function public.course_is_visible(p_course_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.courses c
    where c.id = p_course_id and public.is_live_now(c.status, c.published_at)
  )
$$;

create or replace function public.content_is_visible(p_content_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.content_items ci
    where ci.id = p_content_id
      and public.is_live_now(ci.status, ci.published_at)
      and (ci.course_id is null or public.course_is_visible(ci.course_id))
  )
$$;

-- Pode ver o conteúdo completo (vídeo, passos, transcrição)?
create or replace function public.can_access_content(p_content_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_admin() or exists (
    select 1 from public.content_items ci
    where ci.id = p_content_id
      and public.content_is_visible(ci.id)
      and (ci.access = 'free' or public.has_active_subscription())
  )
$$;

create or replace function public.can_comment(p_content_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from public.content_items ci
    where ci.id = p_content_id
      and ci.comments_enabled
      and public.content_is_visible(ci.id)
      and (public.is_admin() or public.has_active_subscription())
  )
$$;

create or replace function public.can_access_book_file(p_book_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_admin() or exists (
    select 1 from public.books b
    where b.id = p_book_id
      and public.is_live_now(b.status, b.published_at)
      and (
        exists (
          select 1 from public.book_entitlements e
          where e.book_id = b.id and e.user_id = auth.uid() and e.revoked_at is null
        )
        or (b.included_in_subscription and public.has_active_subscription())
      )
  )
$$;

-- ---------------------------------------------------------------------
-- Regras de comunidade (gatilhos)
-- ---------------------------------------------------------------------
-- Mensagens com links, CPF, números de cartão ou códigos de 6 dígitos ficam
-- retidas para moderação (proteção contra golpes e exposição de dados).
create or replace function public.comment_needs_review(p_body text) returns text
language sql immutable set search_path = '' as $$
  select case
    when p_body ~* '(https?://|www\.|\m[a-z0-9-]+\.(com|net|org|br|app|io|me|ly|link|xyz|info|site|online|top|click)\M)'
      then 'link'
    when p_body ~ '\d{3}\.?\d{3}\.?\d{3}-?\d{2}' then 'possivel_cpf'
    when p_body ~ '(\d[ .-]?){13,19}' then 'possivel_cartao'
    when p_body ~ '(^|\D)\d{3}[ -]?\d{3}(\D|$)' then 'possivel_codigo'
    else null
  end
$$;

create or replace function public.comments_before_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_admin boolean := public.is_admin();
  v_reason text;
  v_recent integer;
  v_parent public.comments;
begin
  if new.user_id is distinct from auth.uid() then
    raise exception 'Autor inválido' using errcode = '42501';
  end if;

  new.body := btrim(new.body);
  new.is_official := v_admin;
  new.edited_at := null;
  new.deleted_at := null;
  new.moderation_reason := null;

  if new.parent_id is not null then
    select * into v_parent from public.comments where id = new.parent_id;
    if v_parent.id is null or v_parent.content_id <> new.content_id or v_parent.parent_id is not null then
      raise exception 'Resposta inválida' using errcode = '22023';
    end if;
  end if;

  if not v_admin then
    select count(*) into v_recent from public.comments
      where user_id = new.user_id and created_at > now() - interval '10 minutes';
    if v_recent >= 5 then
      raise exception 'Muitos comentários em pouco tempo' using errcode = 'OZ429';
    end if;

    v_reason := public.comment_needs_review(new.body);
    if v_reason is not null then
      new.status := 'pending';
      new.moderation_reason := v_reason;
    else
      new.status := 'published';
    end if;
  else
    new.status := 'published';
  end if;
  return new;
end $$;
create trigger comments_before_insert before insert on public.comments
  for each row execute function public.comments_before_insert();

create or replace function public.comments_before_update() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_reason text;
begin
  -- Campos estruturais nunca mudam.
  if new.content_id <> old.content_id or new.user_id <> old.user_id
     or new.parent_id is distinct from old.parent_id or new.is_official <> old.is_official
     or new.created_at <> old.created_at then
    raise exception 'Alteração não permitida' using errcode = '42501';
  end if;

  if public.is_admin() then
    if new.body <> old.body then
      new.edited_at := now();
    end if;
    return new;
  end if;

  -- Usuário comum: só edita o texto ou exclui o próprio comentário.
  if new.status <> old.status or new.moderation_reason is distinct from old.moderation_reason then
    raise exception 'Somente a moderação altera o status' using errcode = '42501';
  end if;
  if old.deleted_at is not null or old.status = 'removed' then
    raise exception 'Comentário indisponível' using errcode = '42501';
  end if;
  if new.deleted_at is not null and old.deleted_at is null then
    new.body := old.body;
    return new;
  end if;
  if new.body <> old.body then
    new.body := btrim(new.body);
    new.edited_at := now();
    v_reason := public.comment_needs_review(new.body);
    if v_reason is not null then
      new.status := 'pending';
      new.moderation_reason := v_reason;
    end if;
  end if;
  return new;
end $$;
create trigger comments_before_update before update on public.comments
  for each row execute function public.comments_before_update();

-- Contador de curtidas
create or replace function public.likes_counter() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    update public.content_items set likes_count = likes_count + 1 where id = new.content_id;
  elsif tg_op = 'DELETE' then
    update public.content_items set likes_count = greatest(likes_count - 1, 0) where id = old.content_id;
  end if;
  return null;
end $$;
create trigger likes_counter after insert or delete on public.likes
  for each row execute function public.likes_counter();

-- Progresso: a conclusão nunca é marcada só por abrir a aula.
create or replace function public.progress_before_write() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  if tg_op = 'UPDATE' then
    new.max_position_seconds := greatest(old.max_position_seconds, new.position_seconds, new.max_position_seconds);
    if old.completed_at is not null and new.completed_at is null then
      new.completed_at := old.completed_at; -- concluída continua concluída
    end if;
  else
    new.max_position_seconds := greatest(new.position_seconds, new.max_position_seconds);
  end if;
  if new.duration_seconds is not null and new.duration_seconds > 0 then
    new.position_seconds := least(new.position_seconds, new.duration_seconds);
  end if;
  return new;
end $$;
create trigger progress_before_write before insert or update on public.progress
  for each row execute function public.progress_before_write();

-- ---------------------------------------------------------------------
-- Funções de sistema (sem acesso direto de anon/authenticated)
-- ---------------------------------------------------------------------
create or replace function public.hit_rate_limit(p_key text, p_max integer, p_window_seconds integer)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_window timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_hits integer;
begin
  insert into public.rate_limits (key, window_start, hits) values (p_key, v_window, 1)
  on conflict (key, window_start) do update set hits = public.rate_limits.hits + 1
  returning hits into v_hits;
  if random() < 0.01 then
    delete from public.rate_limits where window_start < now() - interval '1 day';
  end if;
  return v_hits <= p_max; -- true = permitido
end $$;

create or replace function public.record_search_miss(p_query text) returns void
language sql security definer set search_path = '' as $$
  insert into public.search_misses (query) values (left(lower(btrim(p_query)), 120))
  on conflict (query) do update set hits = public.search_misses.hits + 1, last_seen_at = now()
$$;

-- ---------------------------------------------------------------------
-- Privilégios: nada é concedido por padrão; cada tabela recebe o mínimo.
-- (No Supabase, o schema public recebe privilégios amplos por padrão.)
-- ---------------------------------------------------------------------
revoke all on all tables in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;
grant usage on schema public to anon, authenticated;

grant execute on function
  public.is_admin(),
  public.is_live_now(public.publish_status, timestamptz),
  public.subscription_grants_access(public.subscription_status, timestamptz),
  public.has_active_subscription(), public.course_is_visible(uuid), public.content_is_visible(uuid),
  public.can_access_content(uuid), public.can_comment(uuid), public.can_access_book_file(uuid),
  public.comment_needs_review(text)
to anon, authenticated;

-- Funções de gatilho precisam ser executáveis pelos papéis que disparam o gatilho.
grant execute on function
  public.set_updated_at(), public.content_items_search_update(), public.courses_search_update(),
  public.comments_before_insert(), public.comments_before_update(), public.likes_counter(),
  public.progress_before_write()
to anon, authenticated;

-- Leitura pública de catálogo (linhas filtradas por RLS)
grant select on public.categories, public.courses, public.course_modules, public.content_items,
  public.tags, public.content_tags, public.search_synonyms, public.plans, public.books
to anon, authenticated;
grant select on public.content_bodies, public.video_assets, public.comments to anon, authenticated;

-- Escrita de administração (linhas filtradas por RLS: somente is_admin())
grant insert, update, delete on public.categories, public.courses, public.course_modules,
  public.content_items, public.content_bodies, public.video_assets, public.tags, public.content_tags,
  public.search_synonyms, public.plans, public.books, public.book_files
to authenticated;
grant select on public.book_files, public.search_misses, public.billing_events,
  public.admin_audit_log to authenticated;
grant insert on public.admin_audit_log to authenticated;
grant delete on public.search_misses to authenticated;

-- Perfil: leitura própria; atualização somente das preferências (nunca "role").
grant select on public.profiles to authenticated;
grant update (display_name, text_scale, reduce_motion, learning_interest, onboarding_done)
  on public.profiles to authenticated;

-- Interações do próprio usuário
grant select, insert, delete on public.likes, public.saves to authenticated;
grant select, insert, update, delete on public.progress, public.guide_feedback to authenticated;
grant insert on public.comments to authenticated;
grant update (body, deleted_at, status, moderation_reason) on public.comments to authenticated;
grant select, insert on public.comment_reports to authenticated;
grant update (status, resolved_by, resolved_at) on public.comment_reports to authenticated;

-- Comercial: somente leitura (escrita apenas pelo servidor via conexão de sistema)
grant select on public.subscriptions, public.orders, public.order_items, public.book_entitlements
  to authenticated;
grant select, insert on public.data_requests to authenticated;
grant update (status, notes, resolved_at) on public.data_requests to authenticated;

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.courses enable row level security;
alter table public.course_modules enable row level security;
alter table public.video_assets enable row level security;
alter table public.content_items enable row level security;
alter table public.content_bodies enable row level security;
alter table public.tags enable row level security;
alter table public.content_tags enable row level security;
alter table public.search_synonyms enable row level security;
alter table public.search_misses enable row level security;
alter table public.comments enable row level security;
alter table public.comment_reports enable row level security;
alter table public.likes enable row level security;
alter table public.saves enable row level security;
alter table public.progress enable row level security;
alter table public.guide_feedback enable row level security;
alter table public.plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.billing_events enable row level security;
alter table public.books enable row level security;
alter table public.book_files enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.book_entitlements enable row level security;
alter table public.admin_audit_log enable row level security;
alter table public.data_requests enable row level security;
alter table public.rate_limits enable row level security;

-- Perfis
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Catálogo: leitura do que está publicado; administração total para admin
create policy categories_read on public.categories for select to anon, authenticated
  using (is_active or (select public.is_admin()));
create policy categories_admin on public.categories for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy courses_read on public.courses for select to anon, authenticated
  using (public.is_live_now(status, published_at) or (select public.is_admin()));
create policy courses_admin on public.courses for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy course_modules_read on public.course_modules for select to anon, authenticated
  using (public.course_is_visible(course_id) or (select public.is_admin()));
create policy course_modules_admin on public.course_modules for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy content_items_read on public.content_items for select to anon, authenticated
  using (
    (public.is_live_now(status, published_at) and (course_id is null or public.course_is_visible(course_id)))
    or (select public.is_admin())
  );
create policy content_items_admin on public.content_items for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Corpo protegido: o ponto central do controle de acesso a conteúdo pago
create policy content_bodies_read on public.content_bodies for select to anon, authenticated
  using (public.can_access_content(content_id));
create policy content_bodies_admin on public.content_bodies for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy video_assets_read on public.video_assets for select to anon, authenticated
  using (
    (select public.is_admin()) or exists (
      select 1 from public.content_bodies b
      where b.video_asset_id = video_assets.id and public.can_access_content(b.content_id)
    )
  );
create policy video_assets_admin on public.video_assets for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy tags_read on public.tags for select to anon, authenticated using (true);
create policy tags_admin on public.tags for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy content_tags_read on public.content_tags for select to anon, authenticated using (true);
create policy content_tags_admin on public.content_tags for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy synonyms_read on public.search_synonyms for select to anon, authenticated using (true);
create policy synonyms_admin on public.search_synonyms for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy search_misses_admin on public.search_misses for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Comentários
create policy comments_read on public.comments for select to anon, authenticated
  using (
    (select public.is_admin())
    or (user_id = (select auth.uid()) and status <> 'removed')
    or (status = 'published' and deleted_at is null and public.content_is_visible(content_id))
  );
create policy comments_insert on public.comments for insert to authenticated
  with check (user_id = (select auth.uid()) and public.can_comment(content_id));
create policy comments_update on public.comments for update to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()))
  with check (user_id = (select auth.uid()) or (select public.is_admin()));

create policy reports_insert on public.comment_reports for insert to authenticated
  with check (
    reporter_id = (select auth.uid())
    and status = 'open' and resolved_by is null and resolved_at is null
    and exists (select 1 from public.comments c where c.id = comment_id)
  );
create policy reports_read on public.comment_reports for select to authenticated
  using (reporter_id = (select auth.uid()) or (select public.is_admin()));
create policy reports_admin_update on public.comment_reports for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Curtidas, salvos, progresso e feedback: somente as próprias linhas
create policy likes_own on public.likes for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and public.content_is_visible(content_id));
create policy saves_own on public.saves for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and public.content_is_visible(content_id));
create policy progress_own on public.progress for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and public.can_access_content(content_id));
create policy feedback_own on public.guide_feedback for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and public.content_is_visible(content_id));

-- Comercial
create policy plans_read on public.plans for select to anon, authenticated
  using (is_active or (select public.is_admin()));
create policy plans_admin on public.plans for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy subscriptions_read on public.subscriptions for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy billing_events_admin on public.billing_events for select to authenticated
  using ((select public.is_admin()));

create policy books_read on public.books for select to anon, authenticated
  using (public.is_live_now(status, published_at) or (select public.is_admin()));
create policy books_admin on public.books for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy book_files_read on public.book_files for select to authenticated
  using (public.can_access_book_file(book_id));
create policy book_files_admin on public.book_files for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy orders_read on public.orders for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy order_items_read on public.order_items for select to authenticated
  using (exists (
    select 1 from public.orders o
    where o.id = order_id and (o.user_id = (select auth.uid()) or (select public.is_admin()))
  ));
create policy entitlements_read on public.book_entitlements for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

create policy audit_admin_read on public.admin_audit_log for select to authenticated
  using ((select public.is_admin()));
create policy audit_admin_insert on public.admin_audit_log for insert to authenticated
  with check ((select public.is_admin()) and actor_id = (select auth.uid()));

create policy data_requests_own on public.data_requests for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy data_requests_insert on public.data_requests for insert to authenticated
  with check (user_id = (select auth.uid()) and status = 'open');
create policy data_requests_admin on public.data_requests for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- rate_limits: sem políticas => inacessível a anon/authenticated.

-- >>> 20261119000300_public_helpers.sql
-- Nome público de quem comentou: apenas o primeiro nome, e somente de quem
-- tem comentário visível. Perfis completos continuam privados (RLS).
create or replace function public.comment_author_name(p_user_id uuid) returns text
language sql stable security definer set search_path = '' as $$
  select split_part(p.display_name, ' ', 1)
  from public.profiles p
  where p.id = p_user_id
    and exists (
      select 1 from public.comments c
      where c.user_id = p_user_id and (c.status = 'published' or c.user_id = auth.uid() or public.is_admin())
    )
$$;
revoke all on function public.comment_author_name(uuid) from public;
grant execute on function public.comment_author_name(uuid) to anon, authenticated;

-- >>> 20261119000400_plans_visible_to_subscribers.sql
-- Quem tem (ou teve) uma assinatura precisa ver o plano contratado, mesmo que o
-- plano tenha saído de venda. Encontrado pelo teste E2E "situação da assinatura".
create or replace function public.has_subscribed_to_plan(p_plan_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from public.subscriptions s where s.plan_id = p_plan_id and s.user_id = auth.uid()
  )
$$;
revoke all on function public.has_subscribed_to_plan(uuid) from public;
grant execute on function public.has_subscribed_to_plan(uuid) to anon, authenticated;

drop policy if exists plans_read on public.plans;
create policy plans_read on public.plans for select to anon, authenticated
  using (is_active or (select public.is_admin()) or public.has_subscribed_to_plan(id));

-- >>> 20261120000100_bunny_stream_provider.sql
-- Bunny Stream como provedor de vídeo (opção de menor custo).
alter type public.video_provider add value if not exists 'bunny_stream';

-- >>> Conteúdo base (sem demonstração)
insert into public.categories (slug, name, description, icon, sort_order) values ('primeiros-passos', 'Primeiros passos no Android', 'Ligar, desligar, botões, tela e o básico para começar sem medo.', 'smartphone', 0) on conflict (slug) do nothing;
insert into public.categories (slug, name, description, icon, sort_order) values ('whatsapp', 'WhatsApp', 'Mensagens, áudios, fotos, chamadas e segurança no WhatsApp.', 'message-circle', 1) on conflict (slug) do nothing;
insert into public.categories (slug, name, description, icon, sort_order) values ('instagram', 'Instagram', 'Ver publicações, seguir pessoas e cuidar da privacidade.', 'camera', 2) on conflict (slug) do nothing;
insert into public.categories (slug, name, description, icon, sort_order) values ('facebook', 'Facebook', 'Reencontrar amigos, grupos e configurações de privacidade.', 'users', 3) on conflict (slug) do nothing;
insert into public.categories (slug, name, description, icon, sort_order) values ('youtube', 'YouTube', 'Encontrar vídeos, legendas e salvar para assistir depois.', 'play-circle', 4) on conflict (slug) do nothing;
insert into public.categories (slug, name, description, icon, sort_order) values ('seguranca', 'Segurança digital', 'Golpes, senhas, links falsos e como se proteger.', 'shield-check', 5) on conflict (slug) do nothing;
insert into public.categories (slug, name, description, icon, sort_order) values ('fotos-e-videos', 'Fotos e vídeos', 'Tirar, organizar, enviar e guardar suas fotos.', 'image', 6) on conflict (slug) do nothing;
insert into public.categories (slug, name, description, icon, sort_order) values ('configuracoes', 'Configurações do celular', 'Letras maiores, volume, bateria, espaço e ajustes úteis.', 'settings', 7) on conflict (slug) do nothing;
insert into public.categories (slug, name, description, icon, sort_order) values ('internet', 'Internet e Wi-Fi', 'Conectar no Wi-Fi, dados móveis e quando a internet não funciona.', 'wifi', 8) on conflict (slug) do nothing;
insert into public.categories (slug, name, description, icon, sort_order) values ('aplicativos', 'Aplicativos úteis', 'Instalar, atualizar e usar bem os aplicativos do dia a dia.', 'layout-grid', 9) on conflict (slug) do nothing;
insert into public.search_synonyms (term, expansions) values ('zap', array['whatsapp']::text[]) on conflict (term) do nothing;
insert into public.search_synonyms (term, expansions) values ('zapzap', array['whatsapp']::text[]) on conflict (term) do nothing;
insert into public.search_synonyms (term, expansions) values ('wpp', array['whatsapp']::text[]) on conflict (term) do nothing;
insert into public.search_synonyms (term, expansions) values ('whats', array['whatsapp']::text[]) on conflict (term) do nothing;
insert into public.search_synonyms (term, expansions) values ('uatsap', array['whatsapp']::text[]) on conflict (term) do nothing;
insert into public.search_synonyms (term, expansions) values ('insta', array['instagram']::text[]) on conflict (term) do nothing;
insert into public.search_synonyms (term, expansions) values ('face', array['facebook']::text[]) on conflict (term) do nothing;
insert into public.search_synonyms (term, expansions) values ('yt', array['youtube']::text[]) on conflict (term) do nothing;
insert into public.search_synonyms (term, expansions) values ('mudo', array['som', 'silencioso', 'notificacao']::text[]) on conflict (term) do nothing;
insert into public.search_synonyms (term, expansions) values ('toca', array['som', 'notificacao', 'toque']::text[]) on conflict (term) do nothing;
insert into public.search_synonyms (term, expansions) values ('barulho', array['som', 'notificacao']::text[]) on conflict (term) do nothing;
insert into public.search_synonyms (term, expansions) values ('silencioso', array['som', 'nao perturbe']::text[]) on conflict (term) do nothing;
insert into public.search_synonyms (term, expansions) values ('lento', array['devagar', 'travando', 'lentidao']::text[]) on conflict (term) do nothing;
insert into public.search_synonyms (term, expansions) values ('travando', array['lento', 'travado']::text[]) on conflict (term) do nothing;
insert into public.search_synonyms (term, expansions) values ('devagar', array['lento']::text[]) on conflict (term) do nothing;
insert into public.search_synonyms (term, expansions) values ('espaco', array['armazenamento', 'memoria', 'cheio']::text[]) on conflict (term) do nothing;
insert into public.search_synonyms (term, expansions) values ('memoria', array['armazenamento', 'espaco']::text[]) on conflict (term) do nothing;
insert into public.search_synonyms (term, expansions) values ('cheio', array['armazenamento', 'espaco']::text[]) on conflict (term) do nothing;
insert into public.search_synonyms (term, expansions) values ('letra', array['fonte', 'texto', 'tamanho']::text[]) on conflict (term) do nothing;
insert into public.search_synonyms (term, expansions) values ('letras', array['fonte', 'texto', 'tamanho']::text[]) on conflict (term) do nothing;
insert into public.search_synonyms (term, expansions) values ('fonte', array['letra', 'tamanho']::text[]) on conflict (term) do nothing;
insert into public.search_synonyms (term, expansions) values ('golpe', array['fraude', 'seguranca', 'falso']::text[]) on conflict (term) do nothing;
insert into public.search_synonyms (term, expansions) values ('fraude', array['golpe']::text[]) on conflict (term) do nothing;
insert into public.search_synonyms (term, expansions) values ('clonado', array['golpe', 'seguranca', 'whatsapp']::text[]) on conflict (term) do nothing;
insert into public.search_synonyms (term, expansions) values ('pirata', array['golpe']::text[]) on conflict (term) do nothing;
insert into public.search_synonyms (term, expansions) values ('senha', array['recuperar', 'acesso']::text[]) on conflict (term) do nothing;
insert into public.search_synonyms (term, expansions) values ('esqueci', array['senha', 'recuperar']::text[]) on conflict (term) do nothing;
insert into public.search_synonyms (term, expansions) values ('wifi', array['internet', 'conexao']::text[]) on conflict (term) do nothing;
insert into public.search_synonyms (term, expansions) values ('wi-fi', array['internet', 'wifi']::text[]) on conflict (term) do nothing;
insert into public.search_synonyms (term, expansions) values ('net', array['internet']::text[]) on conflict (term) do nothing;
insert into public.search_synonyms (term, expansions) values ('dados', array['internet', 'dados moveis']::text[]) on conflict (term) do nothing;
insert into public.search_synonyms (term, expansions) values ('foto', array['imagem', 'fotos']::text[]) on conflict (term) do nothing;
insert into public.search_synonyms (term, expansions) values ('fotos', array['foto', 'imagem']::text[]) on conflict (term) do nothing;
insert into public.search_synonyms (term, expansions) values ('imagem', array['foto']::text[]) on conflict (term) do nothing;
insert into public.search_synonyms (term, expansions) values ('print', array['captura', 'tela']::text[]) on conflict (term) do nothing;
insert into public.search_synonyms (term, expansions) values ('bateria', array['carga', 'energia']::text[]) on conflict (term) do nothing;
insert into public.plans (slug, name, description, interval, sort_order) values
  ('mensal', 'Plano mensal', 'Acesso a todos os cursos, guias e dicas. Renovação automática todo mês.', 'month', 1),
  ('anual', 'Plano anual', 'Acesso a todos os cursos, guias e dicas por 12 meses.', 'year', 2)
  on conflict (slug) do nothing;

-- Pronto. Próximo passo: criar sua conta pelo site e torná-la administradora (ver docs/05-publicacao.md).
