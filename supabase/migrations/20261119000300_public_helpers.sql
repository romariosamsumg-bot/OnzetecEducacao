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
