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
