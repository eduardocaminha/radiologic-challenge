create or replace function public.write_monthly_highlights(p_month date)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_month_start timestamptz;
  v_next_month_start timestamptz;
begin
  v_month_start := p_month::timestamp at time zone 'America/Sao_Paulo';
  v_next_month_start := (p_month + interval '1 month')::timestamp at time zone 'America/Sao_Paulo';

  with counted as (
    select
      s.id as submission_id,
      s.name,
      s.slug,
      s.approved_at,
      count(v.user_id)::integer as votes
    from public.submissions as s
    left join public.votes as v on v.submission_id = s.id
      and v.created_at >= v_month_start
      and v.created_at < v_next_month_start
      and v.revoked_at is null
      and v.voided_at is null
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

create or replace function public.snapshot_month(p_month date)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current_month date;
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

  perform public.write_monthly_highlights(p_month);
end;
$$;

create or replace function public.get_highlights()
returns table (
  month date,
  rank integer,
  name text,
  votes integer,
  slug text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    highlight.month,
    highlight.rank,
    highlight.name,
    highlight.votes,
    submission.slug
  from public.monthly_highlights as highlight
  left join public.submissions as submission
    on submission.id = highlight.submission_id
    and submission.status = 'approved'
  where highlight.month < pg_catalog.date_trunc(
    'month',
    pg_catalog.timezone('America/Sao_Paulo', pg_catalog.now())
  )::date
  order by highlight.month desc, highlight.rank;
$$;

create or replace function public.recompute_month(p_month date)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin_id uuid;
  v_current_month date;
begin
  v_admin_id := auth.uid();
  if v_admin_id is null then
    raise exception using errcode = 'SUB01', message = 'submission requires an authenticated user';
  end if;
  if not exists (select 1 from public.admins where user_id = v_admin_id) then
    raise exception using errcode = 'SUB20', message = 'only admins can recompute highlights';
  end if;
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

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('monthly-highlight:' || p_month::text, 0)
  );

  delete from public.monthly_highlights where month = p_month;
  perform public.write_monthly_highlights(p_month);

  insert into public.submission_events (actor_id, kind, detail)
  values (
    v_admin_id,
    'snapshot_recomputed',
    pg_catalog.jsonb_build_object('month', p_month)
  );
end;
$$;

revoke all on function public.write_monthly_highlights(date) from public, anon, authenticated;
revoke all on function public.snapshot_month(date) from public, anon, authenticated;
revoke all on function public.get_highlights() from public, anon, authenticated;
revoke all on function public.recompute_month(date) from public, anon, authenticated;

grant execute on function public.get_highlights() to anon, authenticated;
grant execute on function public.recompute_month(date) to authenticated;
