create or replace function public.ban_voter(p_user_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin_id uuid;
  v_inserted_count integer;
begin
  v_admin_id := auth.uid();
  if v_admin_id is null then
    raise exception using errcode = 'VOT01', message = 'vote integrity requires an authenticated user';
  end if;
  if not exists (select 1 from public.admins where user_id = v_admin_id) then
    raise exception using errcode = 'VOT20', message = 'only admins can ban voters';
  end if;
  if p_user_id is null or not exists (select 1 from auth.users where id = p_user_id) then
    raise exception using errcode = 'VOT08', message = 'voter not found';
  end if;
  if p_reason is null or pg_catalog.btrim(p_reason) = '' or pg_catalog.char_length(p_reason) > 500 then
    raise exception using errcode = 'VOT21', message = 'a reason is required and must be at most 500 characters';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text, 0));
  insert into public.banned_voters (user_id, reason)
  values (p_user_id, pg_catalog.btrim(p_reason))
  on conflict (user_id) do nothing;
  get diagnostics v_inserted_count = row_count;
  if v_inserted_count = 0 then
    return;
  end if;

  insert into public.submission_events (actor_id, kind, detail)
  values (
    v_admin_id,
    'voter_banned',
    pg_catalog.jsonb_build_object('user_id', p_user_id, 'reason', pg_catalog.btrim(p_reason))
  );
  perform public.void_votes(p_user_id, pg_catalog.btrim(p_reason));
end;
$$;
