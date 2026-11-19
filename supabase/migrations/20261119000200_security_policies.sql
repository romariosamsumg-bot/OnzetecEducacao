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
