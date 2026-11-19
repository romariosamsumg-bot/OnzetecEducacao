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
