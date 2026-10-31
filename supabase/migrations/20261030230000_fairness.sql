-- Projeto do organizador: aparece marcado na galeria e fica fora dos destaques.
alter table public.submissions
  add column organizer_project boolean not null default false;

alter table public.submission_events
  drop constraint submission_events_kind_check;

alter table public.submission_events
  add constraint submission_events_kind_check check (
    kind in ('state_transition', 'approved_url_changed', 'approved_content_changed', 'vote_voided', 'voter_banned', 'snapshot_recomputed', 'screenshot_moderated', 'organizer_project_changed')
  );

create or replace function public.set_organizer_project(p_submission_id uuid, p_organizer_project boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin_id uuid;
begin
  v_admin_id := auth.uid();
  if v_admin_id is null then
    raise exception using errcode = 'SUB01', message = 'submission requires an authenticated user';
  end if;
  if not exists (select 1 from public.admins where user_id = v_admin_id) then
    raise exception using errcode = 'SUB20', message = 'only admins can mark organizer projects';
  end if;
  if p_organizer_project is null then
    raise exception using errcode = 'VOT21', message = 'a value is required';
  end if;

  update public.submissions
  set organizer_project = p_organizer_project
  where id = p_submission_id
    and organizer_project is distinct from p_organizer_project;
  if not found then
    return;
  end if;

  insert into public.submission_events (submission_id, actor_id, kind, detail)
  values (
    p_submission_id,
    v_admin_id,
    'organizer_project_changed',
    pg_catalog.jsonb_build_object('organizer_project', p_organizer_project)
  );
end;
$$;

revoke all on function public.set_organizer_project(uuid, boolean) from public, anon, authenticated;
grant execute on function public.set_organizer_project(uuid, boolean) to authenticated;

drop function public.get_submission(text);

create or replace function public.get_submission(p_slug text)
returns table (
  id uuid, slug text, status text, name text, tagline text, description text, differential text,
  lang text, platforms text[], requires_install boolean, repo_url text, license text, base_tech text,
  data_source text, data_license text, external_api boolean, external_api_detail text, demo_url text,
  download_url text, video_url text, ai_tools jsonb, ai_code_share text, prompts_url text,
  time_spent text, cost text, features text[], workflow_parts text[], modalities text[], dicomweb boolean, stack text,
  author_name text, author_profile text, country text, limitations text, rules_version text,
  rules_accepted_at timestamptz, created_at timestamptz, updated_at timestamptz, approved_at timestamptz,
  organizer_project boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select s.id, s.slug, s.status, s.name, s.tagline, s.description, s.differential,
    s.lang, s.platforms, s.requires_install, s.repo_url, s.license, s.base_tech,
    s.data_source, s.data_license, s.external_api, s.external_api_detail, s.demo_url,
    s.download_url, s.video_url, s.ai_tools, s.ai_code_share, s.prompts_url,
    s.time_spent, s.cost, s.features, s.workflow_parts, s.modalities, s.dicomweb, s.stack,
    s.author_name, s.author_profile, s.country, s.limitations, s.rules_version,
    s.rules_accepted_at, s.created_at, s.updated_at, s.approved_at, s.organizer_project
  from public.submissions as s
  where s.slug = p_slug and s.status = 'approved';
$$;

revoke all on function public.get_submission(text) from public, anon, authenticated;
grant execute on function public.get_submission(text) to anon, authenticated;

-- Empate nos destaques: à frente o aprovado mais recentemente, que teve menos tempo de exposição.
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
      and not s.organizer_project
      and s.approved_at < v_next_month_start
      and s.name is not null
      and s.slug is not null
    group by s.id, s.name, s.slug, s.approved_at
  ), ranked as (
    select
      counted.*,
      pg_catalog.row_number() over (
        order by counted.votes desc, counted.approved_at desc nulls last, counted.submission_id
      ) as rank
    from counted
  )
  insert into public.monthly_highlights (month, rank, submission_id, name, slug, votes)
  select p_month, ranked.rank, ranked.submission_id, ranked.name, ranked.slug, ranked.votes
  from ranked
  where ranked.rank <= 3;
end;
$$;

-- Total público de votos anulados, por mês do voto. Sem conta e sem projeto.
create or replace function public.voided_votes_by_month()
returns table (month date, votes integer)
language sql
stable
security definer
set search_path = ''
as $$
  select
    pg_catalog.date_trunc('month', pg_catalog.timezone('America/Sao_Paulo', v.created_at))::date as month,
    count(*)::integer as votes
  from public.votes as v
  where v.voided_at is not null
    and v.revoked_at is null
    and v.created_at < pg_catalog.date_trunc(
      'month',
      pg_catalog.timezone('America/Sao_Paulo', pg_catalog.now())
    )::timestamp at time zone 'America/Sao_Paulo'
  group by 1
  order by 1 desc;
$$;

revoke all on function public.voided_votes_by_month() from public, anon, authenticated;
grant execute on function public.voided_votes_by_month() to anon, authenticated;

-- Fila de avisos ao autor. A linha sai depois do envio, e o registro permanente é o evento vote_voided.
create table public.vote_void_notices (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions (id) on delete cascade,
  votes integer not null check (votes > 0),
  reason text not null,
  created_at timestamptz not null default now()
);

alter table public.vote_void_notices enable row level security;
revoke all on table public.vote_void_notices from anon, authenticated;

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
  with voided as (
    update public.votes
    set voided_at = pg_catalog.now()
    where user_id = p_user_id
      and voided_at is null
    returning submission_id, revoked_at
  ), notices as (
    insert into public.vote_void_notices (submission_id, votes, reason)
    select voided.submission_id, count(*)::integer, pg_catalog.btrim(p_reason)
    from voided
    where voided.revoked_at is null
    group by voided.submission_id
  )
  select count(*)::integer into v_voided_count from voided;
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

create or replace function public.pending_vote_void_notices()
returns table (
  notice_ids uuid[],
  name text,
  slug text,
  lang text,
  email text,
  votes integer,
  reasons text[]
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    pg_catalog.array_agg(notice.id order by notice.created_at, notice.id),
    submission.name,
    submission.slug,
    submission.lang,
    owner.email::text,
    sum(notice.votes)::integer,
    pg_catalog.array_agg(distinct notice.reason)
  from public.vote_void_notices as notice
  join public.submissions as submission on submission.id = notice.submission_id
  left join auth.users as owner on owner.id = submission.owner_id
  group by submission.id, submission.name, submission.slug, submission.lang, owner.email;
$$;

create or replace function public.clear_vote_void_notices(p_notice_ids uuid[])
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.vote_void_notices where id = any (p_notice_ids);
$$;

revoke all on function public.pending_vote_void_notices() from public, anon, authenticated;
revoke all on function public.clear_vote_void_notices(uuid[]) from public, anon, authenticated;
grant execute on function public.pending_vote_void_notices() to service_role;
grant execute on function public.clear_vote_void_notices(uuid[]) to service_role;

-- Alerta do resumo diário: projeto com 5 ou mais votos em 24 horas vindos de contas com menos de 24 horas.
create or replace function public.get_moderation_digest(p_digest_date date)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_submissions_count integer;
  v_screenshots_count integer;
  v_changes_count integer;
  v_vote_alerts uuid[];
  v_vote_alerts_count integer;
  v_pending_key text;
  v_last_sent timestamptz;
begin
  select sent_at into v_last_sent from public.moderation_digest_sends;

  select count(*)::integer into v_submissions_count
  from public.submissions
  where status = 'pending';

  select count(*)::integer into v_screenshots_count
  from public.screenshots
  where status = 'pending';

  select count(distinct submission_id)::integer into v_changes_count
  from public.submission_events
  where kind in ('approved_url_changed', 'approved_content_changed')
    and (v_last_sent is null or created_at > v_last_sent);

  select coalesce(pg_catalog.array_agg(flagged.submission_id order by flagged.submission_id), '{}')
  into v_vote_alerts
  from (
    select vote.submission_id
    from public.votes as vote
    join auth.users as voter on voter.id = vote.user_id
    join public.submissions as submission on submission.id = vote.submission_id
    where submission.status = 'approved'
      and vote.revoked_at is null
      and vote.voided_at is null
      and vote.created_at >= pg_catalog.now() - interval '24 hours'
      and vote.created_at < voter.created_at + interval '24 hours'
    group by vote.submission_id
    having count(*) >= 5
  ) as flagged;
  v_vote_alerts_count := coalesce(pg_catalog.array_length(v_vote_alerts, 1), 0);

  select pg_catalog.md5(
    coalesce((
      select pg_catalog.string_agg(id::text, ',' order by id)
      from public.submissions
      where status = 'pending'
    ), '')
    || '|' ||
    coalesce((
      select pg_catalog.string_agg(id::text, ',' order by id)
      from public.screenshots
      where status = 'pending'
    ), '')
    || '|' ||
    coalesce((
      select pg_catalog.string_agg(id::text, ',' order by id)
      from public.submission_events
      where kind in ('approved_url_changed', 'approved_content_changed')
        and (v_last_sent is null or created_at > v_last_sent)
    ), '')
    || '|' ||
    pg_catalog.array_to_string(v_vote_alerts, ',')
  ) into v_pending_key;

  return pg_catalog.jsonb_build_object(
    'should_send', v_submissions_count + v_screenshots_count + v_changes_count + v_vote_alerts_count > 0
      and not exists (
        select 1
        from public.moderation_digest_sends
        where digest_date = p_digest_date
          and pending_key = v_pending_key
      ),
    'pending_key', v_pending_key,
    'submissions_count', v_submissions_count,
    'screenshots_count', v_screenshots_count,
    'changes_count', v_changes_count,
    'vote_alerts_count', v_vote_alerts_count
  );
end;
$$;
