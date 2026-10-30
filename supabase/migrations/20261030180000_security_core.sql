-- Gera o slug de quem não passou por create_submission, como as submissões do GitHub.
create or replace function public.unique_submission_slug(p_name text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_slug_base text;
  v_slug text;
  v_suffix integer := 2;
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('submission-slug-generation', 0)
  );

  v_slug_base := pg_catalog.btrim(
    pg_catalog.regexp_replace(
      pg_catalog.lower(
        pg_catalog.translate(
          pg_catalog.btrim(coalesce(p_name, '')),
          'áàãâäéêëíìîïóòõôöúùûüçÁÀÃÂÄÉÊËÍÌÎÏÓÒÕÔÖÚÙÛÜÇ',
          'aaaaaeeeiiiiooooouuuucAAAAAEEEIIIIOOOOOUUUUC'
        )
      ),
      '[^a-z0-9]+',
      '-',
      'g'
    ),
    '-'
  );
  v_slug_base := pg_catalog.btrim(pg_catalog.left(coalesce(nullif(v_slug_base, ''), 'viewer'), 110), '-');
  v_slug := v_slug_base;
  while exists (select 1 from public.submissions where slug = v_slug) loop
    v_slug := pg_catalog.left(v_slug_base, 120 - pg_catalog.char_length(v_suffix::text) - 1)
      || '-' || v_suffix::text;
    v_suffix := v_suffix + 1;
  end loop;

  return v_slug;
end;
$$;

revoke all on function public.unique_submission_slug(text) from public, anon, authenticated;

create or replace function public.claim_github_submissions()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_claimed integer := 0;
  v_submission record;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception using errcode = 'SUB01', message = 'submission requires an authenticated user';
  end if;

  for v_submission in
    select submission.id, submission.name, submission.slug
    from public.submissions as submission
    where submission.source = 'github'
      and submission.status = 'draft'
      and submission.owner_id is null
      and exists (
        select 1
        from auth.identities as identity
        where identity.user_id = v_user_id
          and identity.provider = 'github'
          and identity.provider_id = submission.github_user_id
      )
    for update
  loop
    update public.submissions
    set owner_id = v_user_id,
        slug = coalesce(v_submission.slug, public.unique_submission_slug(v_submission.name)),
        updated_at = pg_catalog.now()
    where id = v_submission.id;
    v_claimed := v_claimed + 1;
  end loop;

  return v_claimed;
end;
$$;

create or replace function public.submission_is_complete(p_submission public.submissions)
returns boolean
language sql
stable
set search_path = ''
as $$
  select p_submission.slug is not null
    and p_submission.name is not null
    and p_submission.tagline is not null
    and p_submission.description is not null
    and p_submission.differential is not null
    and p_submission.lang is not null
    and p_submission.platforms is not null
    and pg_catalog.cardinality(p_submission.platforms) > 0
    and p_submission.workflow_parts is not null
    and pg_catalog.cardinality(p_submission.workflow_parts) > 0
    and p_submission.requires_install is not null
    and p_submission.repo_url is not null
    and p_submission.license is not null
    and p_submission.base_tech is not null
    and p_submission.data_source is not null
    and p_submission.data_license is not null
    and p_submission.external_api is not null
    and (not p_submission.external_api or p_submission.external_api_detail is not null)
    and ((('web' = any(p_submission.platforms)) and p_submission.demo_url is not null)
      or ((not ('web' = any(p_submission.platforms))) and p_submission.download_url is not null and p_submission.video_url is not null))
    and p_submission.rules_version is not null
    and p_submission.rules_accepted_at is not null
    and exists (
      select 1 from public.screenshots as screenshot
      where screenshot.submission_id = p_submission.id
    );
$$;

-- Vale para toda escrita, não só para update_submission: o que já passou pela moderação não perde campo obrigatório.
create or replace function public.guard_submission_edit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    return new;
  end if;
  if old.status = 'removed' then
    raise exception using errcode = 'SUB10', message = 'removed submissions cannot be edited';
  end if;
  if old.status in ('pending', 'approved') and not public.submission_is_complete(new) then
    raise exception using errcode = 'SUB11', message = 'moderated submissions must stay complete';
  end if;
  return new;
end;
$$;

create trigger submissions_guard_edit
before update on public.submissions
for each row execute function public.guard_submission_edit();

revoke all on function public.guard_submission_edit() from public, anon, authenticated;

alter table public.submission_events
  drop constraint submission_events_kind_check;

alter table public.submission_events
  add constraint submission_events_kind_check check (
    kind in ('state_transition', 'approved_url_changed', 'approved_content_changed', 'vote_voided', 'voter_banned', 'snapshot_recomputed', 'screenshot_moderated')
  );

-- Registra só os nomes dos campos. As URLs já têm evento próprio com os valores.
create or replace function public.record_approved_edit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_fields text[];
begin
  if old.status <> 'approved' or new.status <> 'approved' then
    return null;
  end if;

  select pg_catalog.array_agg(after.key order by after.key) into v_fields
  from pg_catalog.jsonb_each(pg_catalog.to_jsonb(new)) as after
  join pg_catalog.jsonb_each(pg_catalog.to_jsonb(old)) as before on before.key = after.key
  where after.value is distinct from before.value
    and after.key <> 'updated_at';

  if v_fields is not null then
    insert into public.submission_events (submission_id, actor_id, kind, detail)
    values (new.id, auth.uid(), 'approved_content_changed', pg_catalog.jsonb_build_object('fields', v_fields));
  end if;
  return null;
end;
$$;

create trigger submissions_record_approved_edit
after update on public.submissions
for each row execute function public.record_approved_edit();

revoke all on function public.record_approved_edit() from public, anon, authenticated;

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
  ) into v_pending_key;

  return pg_catalog.jsonb_build_object(
    'should_send', v_submissions_count + v_screenshots_count + v_changes_count > 0
      and not exists (
        select 1
        from public.moderation_digest_sends
        where digest_date = p_digest_date
          and pending_key = v_pending_key
      ),
    'pending_key', v_pending_key,
    'submissions_count', v_submissions_count,
    'screenshots_count', v_screenshots_count,
    'changes_count', v_changes_count
  );
end;
$$;

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
      and s.name is not null
      and s.slug is not null
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

create or replace function public.valid_ai_tools(p_tools jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select pg_catalog.jsonb_typeof(p_tools) = 'array'
    and pg_catalog.jsonb_array_length(p_tools) <= 10
    and not exists (
      select 1
      from pg_catalog.jsonb_array_elements(p_tools) as tool
      where pg_catalog.jsonb_typeof(tool) <> 'object'
        or (tool - 'name' - 'version') <> '{}'::jsonb
        or pg_catalog.jsonb_typeof(tool -> 'name') is distinct from 'string'
        or pg_catalog.char_length(tool ->> 'name') not between 1 and 80
        or (tool ? 'version' and pg_catalog.jsonb_typeof(tool -> 'version') not in ('string', 'null'))
        or pg_catalog.char_length(coalesce(tool ->> 'version', '')) > 40
    );
$$;

alter table public.submissions drop constraint submissions_ai_tools_check;

alter table public.submissions
  add constraint submissions_ai_tools_check check (ai_tools is null or public.valid_ai_tools(ai_tools));
