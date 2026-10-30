create or replace function public.vote_report(p_submission_id uuid)
returns table (
  total_votes bigint,
  suspicious_votes bigint,
  suspicious_fraction numeric,
  hourly_votes jsonb,
  suspicious_accounts jsonb
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_admin_id uuid;
  v_total_votes bigint;
  v_suspicious_votes bigint;
begin
  v_admin_id := auth.uid();
  if v_admin_id is null then
    raise exception using errcode = 'VOT01', message = 'vote integrity requires an authenticated user';
  end if;
  if not exists (select 1 from public.admins where user_id = v_admin_id) then
    raise exception using errcode = 'VOT20', message = 'only admins can inspect vote integrity';
  end if;
  if not exists (select 1 from public.submissions where id = p_submission_id) then
    raise exception using errcode = 'VOT08', message = 'viewer not found';
  end if;

  select count(*)::bigint
  into v_total_votes
  from public.votes as vote
  where vote.submission_id = p_submission_id
    and vote.revoked_at is null
    and vote.voided_at is null;

  with suspicious as (
    select vote.user_id
    from public.votes as vote
    join auth.users as user_record on user_record.id = vote.user_id
    where vote.submission_id = p_submission_id
      and vote.revoked_at is null
      and vote.voided_at is null
      and vote.created_at >= user_record.created_at
      and vote.created_at < user_record.created_at + interval '24 hours'
      and not exists (
        select 1
        from public.votes as other_vote
        where other_vote.user_id = vote.user_id
          and other_vote.submission_id <> p_submission_id
          and other_vote.revoked_at is null
          and other_vote.voided_at is null
      )
  )
  select count(*)::bigint
  into v_suspicious_votes
  from suspicious;

  return query
  with hours as (
    select pg_catalog.generate_series(
      pg_catalog.date_trunc('hour', pg_catalog.now() - interval '30 days'),
      pg_catalog.date_trunc('hour', pg_catalog.now()),
      interval '1 hour'
    ) as hour
  ), hourly_counts as (
    select pg_catalog.date_trunc('hour', vote.created_at) as hour, count(*)::bigint as votes
    from public.votes as vote
    where vote.submission_id = p_submission_id
      and vote.revoked_at is null
      and vote.voided_at is null
      and vote.created_at >= pg_catalog.now() - interval '30 days'
    group by pg_catalog.date_trunc('hour', vote.created_at)
  ), suspicious_accounts as (
    select
      user_record.id as user_id,
      case
        when user_record.email is null then null
        when pg_catalog.strpos(user_record.email, '@') > 1 then
          pg_catalog.left(user_record.email, 1) || '***' || pg_catalog.substr(user_record.email, pg_catalog.strpos(user_record.email, '@'))
        else '***'
      end as email_hint,
      user_record.created_at,
      vote.created_at as voted_at
    from public.votes as vote
    join auth.users as user_record on user_record.id = vote.user_id
    where vote.submission_id = p_submission_id
      and vote.revoked_at is null
      and vote.voided_at is null
      and vote.created_at >= user_record.created_at
      and vote.created_at < user_record.created_at + interval '24 hours'
      and not exists (
        select 1
        from public.votes as other_vote
        where other_vote.user_id = vote.user_id
          and other_vote.submission_id <> p_submission_id
          and other_vote.revoked_at is null
          and other_vote.voided_at is null
      )
  )
  select
    v_total_votes,
    v_suspicious_votes,
    case when v_total_votes = 0 then 0::numeric else v_suspicious_votes::numeric / v_total_votes end,
    (
      select coalesce(
        pg_catalog.jsonb_agg(
          pg_catalog.jsonb_build_object('hour', hours.hour, 'votes', coalesce(hourly_counts.votes, 0))
          order by hours.hour
        ),
        '[]'::jsonb
      )
      from hours
      left join hourly_counts on hourly_counts.hour = hours.hour
    ),
    (
      select coalesce(
        pg_catalog.jsonb_agg(
          pg_catalog.jsonb_build_object(
            'user_id', suspicious_accounts.user_id,
            'email_hint', suspicious_accounts.email_hint,
            'created_at', suspicious_accounts.created_at,
            'voted_at', suspicious_accounts.voted_at
          )
          order by suspicious_accounts.voted_at, suspicious_accounts.user_id
        ),
        '[]'::jsonb
      )
      from suspicious_accounts
    );
end;
$$;

create or replace function public.void_votes(p_user_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin_id uuid;
  v_voided_count integer;
begin
  v_admin_id := auth.uid();
  if v_admin_id is null then
    raise exception using errcode = 'VOT01', message = 'vote integrity requires an authenticated user';
  end if;
  if not exists (select 1 from public.admins where user_id = v_admin_id) then
    raise exception using errcode = 'VOT20', message = 'only admins can void votes';
  end if;
  if p_user_id is null or not exists (select 1 from auth.users where id = p_user_id) then
    raise exception using errcode = 'VOT08', message = 'voter not found';
  end if;
  if p_reason is null or pg_catalog.btrim(p_reason) = '' or pg_catalog.char_length(p_reason) > 500 then
    raise exception using errcode = 'VOT21', message = 'a reason is required and must be at most 500 characters';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text, 0));
  update public.votes
  set voided_at = pg_catalog.now()
  where user_id = p_user_id
    and voided_at is null;
  get diagnostics v_voided_count = row_count;
  if v_voided_count = 0 then
    return;
  end if;

  insert into public.submission_events (actor_id, kind, detail)
  values (
    v_admin_id,
    'vote_voided',
    pg_catalog.jsonb_build_object(
      'user_id', p_user_id,
      'reason', pg_catalog.btrim(p_reason),
      'votes_voided', v_voided_count
    )
  );
end;
$$;

create or replace function public.void_votes(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.void_votes(p_user_id, 'Ação administrativa de integridade');
end;
$$;

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
end;
$$;

revoke all on function public.vote_report(uuid) from public, anon, authenticated;
revoke all on function public.void_votes(uuid) from public, anon, authenticated;
revoke all on function public.void_votes(uuid, text) from public, anon, authenticated;
revoke all on function public.ban_voter(uuid, text) from public, anon, authenticated;

grant execute on function public.vote_report(uuid) to authenticated;
grant execute on function public.void_votes(uuid) to authenticated;
grant execute on function public.void_votes(uuid, text) to authenticated;
grant execute on function public.ban_voter(uuid, text) to authenticated;
