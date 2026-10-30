create extension if not exists pg_cron;

create table public.vote_operations (
  user_id uuid not null references auth.users (id) on delete cascade,
  occurred_at timestamptz not null default now()
);

alter table public.vote_operations enable row level security;

revoke all on table public.vote_operations from anon, authenticated;

create or replace function public.cast_vote(p_submission_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_operation_count integer;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception using
      errcode = 'VOT01',
      message = 'vote requires an authenticated user';
  end if;

  if not exists (
    select 1
    from auth.identities
    where user_id = v_user_id
      and provider in ('google', 'github')
  ) then
    raise exception using
      errcode = 'VOT02',
      message = 'vote requires a Google or GitHub identity';
  end if;

  if exists (
    select 1
    from public.banned_voters
    where user_id = v_user_id
  ) then
    raise exception using
      errcode = 'VOT03',
      message = 'banned voters cannot vote';
  end if;

  if not exists (
    select 1
    from public.submissions
    where id = p_submission_id
      and status = 'approved'
  ) then
    raise exception using
      errcode = 'VOT04',
      message = 'votes require an approved viewer';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::text, 0)
  );

  select count(*)::integer
  into v_operation_count
  from public.vote_operations
  where user_id = v_user_id
    and occurred_at > pg_catalog.now() - interval '1 minute';

  if v_operation_count >= 30 then
    raise exception using
      errcode = 'VOT05',
      message = 'vote operation rate limit exceeded';
  end if;

  insert into public.vote_operations (user_id)
  values (v_user_id);

  insert into public.votes (user_id, submission_id)
  values (v_user_id, p_submission_id)
  on conflict (user_id, submission_id) do update
    set revoked_at = null
    where public.votes.revoked_at is not null
      and public.votes.voided_at is null;
end;
$$;

create or replace function public.revoke_vote(p_submission_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_operation_count integer;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception using
      errcode = 'VOT01',
      message = 'vote requires an authenticated user';
  end if;

  if not exists (
    select 1
    from auth.identities
    where user_id = v_user_id
      and provider in ('google', 'github')
  ) then
    raise exception using
      errcode = 'VOT02',
      message = 'vote requires a Google or GitHub identity';
  end if;

  if exists (
    select 1
    from public.banned_voters
    where user_id = v_user_id
  ) then
    raise exception using
      errcode = 'VOT03',
      message = 'banned voters cannot vote';
  end if;

  if not exists (
    select 1
    from public.submissions
    where id = p_submission_id
      and status = 'approved'
  ) then
    raise exception using
      errcode = 'VOT04',
      message = 'votes require an approved viewer';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::text, 0)
  );

  select count(*)::integer
  into v_operation_count
  from public.vote_operations
  where user_id = v_user_id
    and occurred_at > pg_catalog.now() - interval '1 minute';

  if v_operation_count >= 30 then
    raise exception using
      errcode = 'VOT05',
      message = 'vote operation rate limit exceeded';
  end if;

  insert into public.vote_operations (user_id)
  values (v_user_id);

  update public.votes
  set revoked_at = pg_catalog.now()
  where user_id = v_user_id
    and submission_id = p_submission_id
    and voided_at is null;
end;
$$;

create or replace function public.my_votes()
returns table (submission_id uuid)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception using
      errcode = 'VOT01',
      message = 'my votes requires an authenticated user';
  end if;

  return query
  select v.submission_id
  from public.votes as v
  where v.user_id = v_user_id
    and v.revoked_at is null
    and v.voided_at is null
  order by v.created_at, v.submission_id;
end;
$$;

create or replace function public.ranking()
returns table (
  submission_id uuid,
  slug text,
  name text,
  tagline text,
  approved_at timestamptz,
  total_votes bigint,
  month_votes bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  with bounds as (
    select pg_catalog.date_trunc(
      'month',
      pg_catalog.timezone('America/Sao_Paulo', pg_catalog.now())
    )::date as month_start
  )
  select
    s.id as submission_id,
    s.slug,
    s.name,
    s.tagline,
    s.approved_at,
    count(v.user_id) filter (
      where v.revoked_at is null and v.voided_at is null
    ) as total_votes,
    count(v.user_id) filter (
      where v.revoked_at is null
        and v.voided_at is null
        and v.created_at >= bounds.month_start::timestamp at time zone 'America/Sao_Paulo'
        and v.created_at < (bounds.month_start +  interval '1 month')::timestamp at time zone 'America/Sao_Paulo'
    ) as month_votes
  from public.submissions as s
  cross join bounds
  left join public.votes as v on v.submission_id = s.id
  where s.status = 'approved'
  group by s.id, s.slug, s.name, s.tagline, s.approved_at
  order by total_votes desc, month_votes desc, s.approved_at asc nulls last, s.id;
$$;

create or replace function public.snapshot_month(p_month date)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current_month date;
  v_month_start timestamptz;
  v_next_month_start timestamptz;
begin
  if p_month is null or p_month <> pg_catalog.date_trunc('month', p_month)::date then
    raise exception using
      errcode = 'VOT06',
      message = 'snapshot month must be the first day of a month';
  end if;

  v_current_month := pg_catalog.date_trunc(
    'month',
    pg_catalog.timezone('America/Sao_Paulo', pg_catalog.now())
  )::date;

  if p_month >= v_current_month then
    raise exception using
      errcode = 'VOT07',
      message = 'snapshot month is not closed';
  end if;

  v_month_start := p_month::timestamp at time zone 'America/Sao_Paulo';
  v_next_month_start := (p_month + interval '1 month')::timestamp at time zone 'America/Sao_Paulo';

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('monthly-highlight:' || p_month::text, 0)
  );

  if exists (
    select 1
    from public.monthly_highlights
    where month = p_month
  ) then
    return;
  end if;

  with counted as (
    select
      s.id as submission_id,
      s.name,
      s.slug,
      s.approved_at,
      count(v.user_id) filter (
        where v.revoked_at is null and v.voided_at is null
      )::integer as votes
    from public.submissions as s
    left join public.votes as v on v.submission_id = s.id
      and v.created_at >= v_month_start
      and v.created_at < v_next_month_start
    where s.status = 'approved'
      and s.approved_at < v_next_month_start
    group by s.id, s.name, s.slug, s.approved_at
  ), ranked as (
    select
      counted.*,
      pg_catalog.row_number() over (
        order by counted.votes desc, counted.approved_at asc nulls last, counted.submission_id
      ) as rank
    from counted
  )
  insert into public.monthly_highlights (month, rank, submission_id, name, slug, votes)
  select p_month, ranked.rank, ranked.submission_id, ranked.name, ranked.slug, ranked.votes
  from ranked
  where ranked.rank <= 3;
end;
$$;

revoke all on function public.cast_vote(uuid) from public, anon, authenticated;
revoke all on function public.revoke_vote(uuid) from public, anon, authenticated;
revoke all on function public.my_votes() from public, anon, authenticated;
revoke all on function public.ranking() from public, anon, authenticated;
revoke all on function public.snapshot_month(date) from public, anon, authenticated;

grant execute on function public.cast_vote(uuid) to authenticated;
grant execute on function public.revoke_vote(uuid) to authenticated;
grant execute on function public.my_votes() to authenticated;
grant execute on function public.ranking() to anon, authenticated;

select cron.schedule(
  'radiologic-viewers-monthly-snapshot',
  '0 3 1 * *',
  $$select public.snapshot_month(
    (pg_catalog.date_trunc(
      'month',
      pg_catalog.timezone('America/Sao_Paulo', pg_catalog.now())
    ) - interval '1 month')::date
  );$$
);
