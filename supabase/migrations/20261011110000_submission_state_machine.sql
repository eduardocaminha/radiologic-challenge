alter table public.submissions
  drop constraint submissions_external_api_detail_required,
  drop constraint submissions_demo_or_download_required;

alter table public.submissions
  add constraint submissions_external_api_detail_required check (
    status = 'draft'
    or not coalesce(external_api, false)
    or external_api_detail is not null
  ),
  add constraint submissions_demo_or_download_required check (
    status = 'draft'
    or platforms is null
    or ('web' = any(platforms) and demo_url is not null)
    or (not ('web' = any(platforms)) and download_url is not null and video_url is not null)
  );

create or replace function public.reject_submission_event_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE'
    and old.id = new.id
    and (
      (old.submission_id is not null and new.submission_id is null)
      or (old.actor_id is not null and new.actor_id is null)
    )
    and (
      old.submission_id is not distinct from new.submission_id
      or (old.submission_id is not null and new.submission_id is null)
    )
    and (
      old.actor_id is not distinct from new.actor_id
      or (old.actor_id is not null and new.actor_id is null)
    )
    and old.kind = new.kind
    and old.detail = new.detail
    and old.created_at = new.created_at
    and pg_catalog.pg_trigger_depth() > 1 then
    return new;
  end if;

  if tg_op = 'DELETE' and pg_catalog.pg_trigger_depth() > 1 then
    return old;
  end if;

  raise exception using
    errcode = 'SUB31',
    message = 'submission events are append-only';
end;
$$;

create trigger submission_events_append_only
before update or delete on public.submission_events
for each row execute function public.reject_submission_event_mutation();

create or replace function public.prevent_approved_slug_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status in ('approved', 'removed') and old.slug is distinct from new.slug then
    raise exception using
      errcode = 'SUB30',
      message = 'approved submission slugs are immutable';
  end if;
  return new;
end;
$$;

create trigger submissions_approved_slug_immutable
before update on public.submissions
for each row execute function public.prevent_approved_slug_change();

create or replace function public.create_submission(p_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_slug_base text;
  v_slug text;
  v_suffix integer := 2;
  v_submission_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception using errcode = 'SUB01', message = 'submission requires an authenticated user';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::text, 2)
  );

  if p_name is null or pg_catalog.btrim(p_name) = '' or pg_catalog.char_length(p_name) > 60 then
    raise exception using errcode = 'SUB02', message = 'submission name is required and must be at most 60 characters';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('submission-slug-generation', 0)
  );

  select coalesce(
    nullif(
      pg_catalog.btrim(
        pg_catalog.btrim(
          pg_catalog.regexp_replace(
            pg_catalog.lower(
              pg_catalog.translate(
                pg_catalog.btrim(p_name),
                'áàãâäéêëíìîïóòõôöúùûüçÁÀÃÂÄÉÊËÍÌÎÏÓÒÕÔÖÚÙÛÜÇ',
                'aaaaaeeeiiiiooooouuuucAAAAAEEEIIIIOOOOOUUUUC'
              )
            ),
            '[^a-z0-9]+',
            '-',
            'g'
          ),
          '-'
        )
      ),
      ''
    ),
    'viewer'
  )
  into v_slug_base;

  v_slug_base := pg_catalog.left(v_slug_base, 110);
  v_slug_base := pg_catalog.btrim(v_slug_base, '-');
  v_slug := v_slug_base;
  while exists (select 1 from public.submissions where slug = v_slug) loop
    v_slug := pg_catalog.left(v_slug_base, 120 - pg_catalog.char_length(v_suffix::text) - 1)
      || '-' || v_suffix::text;
    v_suffix := v_suffix + 1;
  end loop;

  if (
    select count(*)
    from public.submissions
    where owner_id = v_user_id
      and status in ('draft', 'pending')
  ) >= 3 then
    raise exception using errcode = 'SUB03', message = 'submission draft or pending limit reached';
  end if;

  insert into public.submissions (slug, owner_id, source, name)
  values (v_slug, v_user_id, 'form', pg_catalog.btrim(p_name))
  returning id into v_submission_id;

  insert into public.submission_events (submission_id, actor_id, kind, detail)
  values (
    v_submission_id,
    v_user_id,
    'state_transition',
    pg_catalog.jsonb_build_object('from', null, 'to', 'draft')
  );

  return v_submission_id;
end;
$$;

create or replace function public.update_submission(
  p_submission_id uuid,
  p_changes jsonb
)
returns public.submissions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_old public.submissions;
  v_patch public.submissions;
  v_new public.submissions;
  v_url_changes jsonb := '{}'::jsonb;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception using errcode = 'SUB01', message = 'submission requires an authenticated user';
  end if;

  select * into v_old
  from public.submissions
  where id = p_submission_id
  for update;

  if not found then
    raise exception using errcode = 'SUB04', message = 'submission not found';
  end if;
  if v_old.owner_id is distinct from v_user_id then
    raise exception using errcode = 'SUB05', message = 'only the submission owner can update it';
  end if;
  if p_changes is null or pg_catalog.jsonb_typeof(p_changes) <> 'object' then
    raise exception using errcode = 'SUB06', message = 'submission changes must be a JSON object';
  end if;

  v_patch := pg_catalog.jsonb_populate_record(null::public.submissions, p_changes);
  v_new := v_old;
  v_new.name := case when p_changes ? 'name' then v_patch.name else v_old.name end;
  v_new.tagline := case when p_changes ? 'tagline' then v_patch.tagline else v_old.tagline end;
  v_new.description := case when p_changes ? 'description' then v_patch.description else v_old.description end;
  v_new.differential := case when p_changes ? 'differential' then v_patch.differential else v_old.differential end;
  v_new.lang := case when p_changes ? 'lang' then v_patch.lang else v_old.lang end;
  v_new.platforms := case when p_changes ? 'platforms' then v_patch.platforms else v_old.platforms end;
  v_new.requires_install := case when p_changes ? 'requires_install' then v_patch.requires_install else v_old.requires_install end;
  v_new.repo_url := case when p_changes ? 'repo_url' then v_patch.repo_url else v_old.repo_url end;
  v_new.license := case when p_changes ? 'license' then v_patch.license else v_old.license end;
  v_new.base_tech := case when p_changes ? 'base_tech' then v_patch.base_tech else v_old.base_tech end;
  v_new.data_source := case when p_changes ? 'data_source' then v_patch.data_source else v_old.data_source end;
  v_new.data_license := case when p_changes ? 'data_license' then v_patch.data_license else v_old.data_license end;
  v_new.external_api := case when p_changes ? 'external_api' then v_patch.external_api else v_old.external_api end;
  v_new.external_api_detail := case when p_changes ? 'external_api_detail' then v_patch.external_api_detail else v_old.external_api_detail end;
  v_new.demo_url := case when p_changes ? 'demo_url' then v_patch.demo_url else v_old.demo_url end;
  v_new.download_url := case when p_changes ? 'download_url' then v_patch.download_url else v_old.download_url end;
  v_new.video_url := case when p_changes ? 'video_url' then v_patch.video_url else v_old.video_url end;
  v_new.ai_tools := case when p_changes ? 'ai_tools' then v_patch.ai_tools else v_old.ai_tools end;
  v_new.ai_code_share := case when p_changes ? 'ai_code_share' then v_patch.ai_code_share else v_old.ai_code_share end;
  v_new.prompts_url := case when p_changes ? 'prompts_url' then v_patch.prompts_url else v_old.prompts_url end;
  v_new.time_spent := case when p_changes ? 'time_spent' then v_patch.time_spent else v_old.time_spent end;
  v_new.cost := case when p_changes ? 'cost' then v_patch.cost else v_old.cost end;
  v_new.features := case when p_changes ? 'features' then v_patch.features else v_old.features end;
  v_new.modalities := case when p_changes ? 'modalities' then v_patch.modalities else v_old.modalities end;
  v_new.dicomweb := case when p_changes ? 'dicomweb' then v_patch.dicomweb else v_old.dicomweb end;
  v_new.stack := case when p_changes ? 'stack' then v_patch.stack else v_old.stack end;
  v_new.author_name := case when p_changes ? 'author_name' then v_patch.author_name else v_old.author_name end;
  v_new.author_profile := case when p_changes ? 'author_profile' then v_patch.author_profile else v_old.author_profile end;
  v_new.country := case when p_changes ? 'country' then v_patch.country else v_old.country end;
  v_new.limitations := case when p_changes ? 'limitations' then v_patch.limitations else v_old.limitations end;
  v_new.rules_version := case when p_changes ? 'rules_version' then v_patch.rules_version else v_old.rules_version end;
  v_new.rules_accepted_at := case when p_changes ? 'rules_accepted_at' then v_patch.rules_accepted_at else v_old.rules_accepted_at end;

  update public.submissions
  set name = v_new.name,
      tagline = v_new.tagline,
      description = v_new.description,
      differential = v_new.differential,
      lang = v_new.lang,
      platforms = v_new.platforms,
      requires_install = v_new.requires_install,
      repo_url = v_new.repo_url,
      license = v_new.license,
      base_tech = v_new.base_tech,
      data_source = v_new.data_source,
      data_license = v_new.data_license,
      external_api = v_new.external_api,
      external_api_detail = v_new.external_api_detail,
      demo_url = v_new.demo_url,
      download_url = v_new.download_url,
      video_url = v_new.video_url,
      ai_tools = v_new.ai_tools,
      ai_code_share = v_new.ai_code_share,
      prompts_url = v_new.prompts_url,
      time_spent = v_new.time_spent,
      cost = v_new.cost,
      features = v_new.features,
      modalities = v_new.modalities,
      dicomweb = v_new.dicomweb,
      stack = v_new.stack,
      author_name = v_new.author_name,
      author_profile = v_new.author_profile,
      country = v_new.country,
      limitations = v_new.limitations,
      rules_version = v_new.rules_version,
      rules_accepted_at = v_new.rules_accepted_at,
      updated_at = pg_catalog.now()
  where id = p_submission_id
  returning * into v_new;

  if v_old.status = 'approved' then
    if v_old.demo_url is distinct from v_new.demo_url then
      v_url_changes := v_url_changes || pg_catalog.jsonb_build_object('demo_url', pg_catalog.jsonb_build_object('from', v_old.demo_url, 'to', v_new.demo_url));
    end if;
    if v_old.download_url is distinct from v_new.download_url then
      v_url_changes := v_url_changes || pg_catalog.jsonb_build_object('download_url', pg_catalog.jsonb_build_object('from', v_old.download_url, 'to', v_new.download_url));
    end if;
    if v_old.video_url is distinct from v_new.video_url then
      v_url_changes := v_url_changes || pg_catalog.jsonb_build_object('video_url', pg_catalog.jsonb_build_object('from', v_old.video_url, 'to', v_new.video_url));
    end if;
    if v_old.repo_url is distinct from v_new.repo_url then
      v_url_changes := v_url_changes || pg_catalog.jsonb_build_object('repo_url', pg_catalog.jsonb_build_object('from', v_old.repo_url, 'to', v_new.repo_url));
    end if;
    if v_old.prompts_url is distinct from v_new.prompts_url then
      v_url_changes := v_url_changes || pg_catalog.jsonb_build_object('prompts_url', pg_catalog.jsonb_build_object('from', v_old.prompts_url, 'to', v_new.prompts_url));
    end if;
    if v_url_changes <> '{}'::jsonb then
      insert into public.submission_events (submission_id, actor_id, kind, detail)
      values (p_submission_id, v_user_id, 'approved_url_changed', v_url_changes);
    end if;
  end if;

  return v_new;
end;
$$;

create or replace function public.submit_submission(p_submission_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_submission public.submissions;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception using errcode = 'SUB01', message = 'submission requires an authenticated user';
  end if;
  select * into v_submission from public.submissions where id = p_submission_id for update;
  if not found then raise exception using errcode = 'SUB04', message = 'submission not found'; end if;
  if v_submission.owner_id is distinct from v_user_id then raise exception using errcode = 'SUB05', message = 'only the submission owner can submit it'; end if;
  if v_submission.status <> 'draft' then raise exception using errcode = 'SUB07', message = 'only draft submissions can be submitted'; end if;
  if not public.submission_is_complete(v_submission) then raise exception using errcode = 'SUB08', message = 'submission form is incomplete'; end if;

  update public.submissions
  set status = 'pending', rejection_reason = null, updated_at = pg_catalog.now()
  where id = p_submission_id;
  insert into public.submission_events (submission_id, actor_id, kind, detail)
  values (p_submission_id, v_user_id, 'state_transition', pg_catalog.jsonb_build_object('from', 'draft', 'to', 'pending'));
end;
$$;

create or replace function public.submission_is_complete(p_submission public.submissions)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_submission.name is not null
    and p_submission.tagline is not null
    and p_submission.description is not null
    and p_submission.differential is not null
    and p_submission.lang is not null
    and p_submission.platforms is not null
    and pg_catalog.cardinality(p_submission.platforms) > 0
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
    and p_submission.rules_accepted_at is not null;
$$;

create or replace function public.resubmit_submission(p_submission_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_submission public.submissions;
begin
  v_user_id := auth.uid();
  if v_user_id is null then raise exception using errcode = 'SUB01', message = 'submission requires an authenticated user'; end if;
  select * into v_submission from public.submissions where id = p_submission_id for update;
  if not found then raise exception using errcode = 'SUB04', message = 'submission not found'; end if;
  if v_submission.owner_id is distinct from v_user_id then raise exception using errcode = 'SUB05', message = 'only the submission owner can resubmit it'; end if;
  if v_submission.status <> 'rejected' then raise exception using errcode = 'SUB09', message = 'only rejected submissions can be resubmitted'; end if;
  if not public.submission_is_complete(v_submission) then raise exception using errcode = 'SUB08', message = 'submission form is incomplete'; end if;

  update public.submissions
  set status = 'pending', rejection_reason = null, updated_at = pg_catalog.now()
  where id = p_submission_id;
  insert into public.submission_events (submission_id, actor_id, kind, detail)
  values (p_submission_id, v_user_id, 'state_transition', pg_catalog.jsonb_build_object('from', 'rejected', 'to', 'pending'));
end;
$$;

create or replace function public.delete_submission(p_submission_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_owner_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then raise exception using errcode = 'SUB01', message = 'submission requires an authenticated user'; end if;
  select owner_id into v_owner_id from public.submissions where id = p_submission_id for update;
  if not found then raise exception using errcode = 'SUB04', message = 'submission not found'; end if;
  if v_owner_id is distinct from v_user_id then raise exception using errcode = 'SUB05', message = 'only the submission owner can delete it'; end if;
  delete from public.submissions where id = p_submission_id;
end;
$$;

create or replace function public.moderate_submission(
  p_submission_id uuid,
  p_action text,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin_id uuid;
  v_submission public.submissions;
  v_target text;
begin
  v_admin_id := auth.uid();
  if v_admin_id is null then raise exception using errcode = 'SUB01', message = 'submission requires an authenticated user'; end if;
  if not exists (select 1 from public.admins where user_id = v_admin_id) then
    raise exception using errcode = 'SUB20', message = 'only admins can moderate submissions';
  end if;

  v_target := case pg_catalog.lower(pg_catalog.btrim(p_action))
    when 'approve' then 'approved'
    when 'approved' then 'approved'
    when 'reject' then 'rejected'
    when 'rejected' then 'rejected'
    when 'remove' then 'removed'
    when 'removed' then 'removed'
    else null
  end;
  if v_target is null then raise exception using errcode = 'SUB21', message = 'invalid moderation action'; end if;

  select * into v_submission from public.submissions where id = p_submission_id for update;
  if not found then raise exception using errcode = 'SUB04', message = 'submission not found'; end if;
  if v_submission.status = v_target then return; end if;

  if v_submission.status = 'pending' and v_target = 'approved' then
    update public.submissions
    set status = 'approved', rejection_reason = null, approved_at = coalesce(approved_at, pg_catalog.now()), updated_at = pg_catalog.now()
    where id = p_submission_id;
  elsif v_submission.status = 'pending' and v_target = 'rejected' then
    if p_reason is null or pg_catalog.btrim(p_reason) = '' or pg_catalog.char_length(p_reason) > 500 then
      raise exception using errcode = 'SUB22', message = 'rejection reason is required and must be at most 500 characters';
    end if;
    update public.submissions
    set status = 'rejected', rejection_reason = pg_catalog.btrim(p_reason), updated_at = pg_catalog.now()
    where id = p_submission_id;
  elsif v_submission.status = 'approved' and v_target = 'removed' then
    update public.submissions
    set status = 'removed', updated_at = pg_catalog.now()
    where id = p_submission_id;
  elsif v_submission.status = 'removed' and v_target = 'approved' then
    update public.submissions
    set status = 'approved', rejection_reason = null, approved_at = coalesce(approved_at, pg_catalog.now()), updated_at = pg_catalog.now()
    where id = p_submission_id;
  else
    raise exception using errcode = 'SUB23', message = 'invalid submission state transition';
  end if;

  insert into public.submission_events (submission_id, actor_id, kind, detail)
  values (
    p_submission_id,
    v_admin_id,
    'state_transition',
    pg_catalog.jsonb_build_object('from', v_submission.status, 'to', v_target, 'reason', p_reason)
  );
end;
$$;

create or replace function public.get_submission(p_slug text)
returns table (
  id uuid, slug text, status text, name text, tagline text, description text, differential text,
  lang text, platforms text[], requires_install boolean, repo_url text, license text, base_tech text,
  data_source text, data_license text, external_api boolean, external_api_detail text, demo_url text,
  download_url text, video_url text, ai_tools jsonb, ai_code_share text, prompts_url text,
  time_spent text, cost text, features text[], modalities text[], dicomweb boolean, stack text,
  author_name text, author_profile text, country text, limitations text, rules_version text,
  rules_accepted_at timestamptz, created_at timestamptz, updated_at timestamptz, approved_at timestamptz
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
    s.time_spent, s.cost, s.features, s.modalities, s.dicomweb, s.stack,
    s.author_name, s.author_profile, s.country, s.limitations, s.rules_version,
    s.rules_accepted_at, s.created_at, s.updated_at, s.approved_at
  from public.submissions as s
  where s.slug = p_slug and s.status = 'approved';
$$;

create or replace function public.my_submissions()
returns table (id uuid, slug text, status text, rejection_reason text, name text, created_at timestamptz, updated_at timestamptz, approved_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select s.id, s.slug, s.status, s.rejection_reason, s.name, s.created_at, s.updated_at, s.approved_at
  from public.submissions as s
  where s.owner_id = auth.uid()
  order by s.created_at;
$$;

revoke all on function public.create_submission(text) from public, anon, authenticated;
revoke all on function public.update_submission(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.submit_submission(uuid) from public, anon, authenticated;
revoke all on function public.resubmit_submission(uuid) from public, anon, authenticated;
revoke all on function public.delete_submission(uuid) from public, anon, authenticated;
revoke all on function public.moderate_submission(uuid, text, text) from public, anon, authenticated;
revoke all on function public.get_submission(text) from public, anon, authenticated;
revoke all on function public.my_submissions() from public, anon, authenticated;
grant execute on function public.create_submission(text) to authenticated;
grant execute on function public.update_submission(uuid, jsonb) to authenticated;
grant execute on function public.submit_submission(uuid) to authenticated;
grant execute on function public.resubmit_submission(uuid) to authenticated;
grant execute on function public.delete_submission(uuid) to authenticated;
grant execute on function public.moderate_submission(uuid, text, text) to authenticated;
grant execute on function public.get_submission(text) to anon, authenticated;
grant execute on function public.my_submissions() to authenticated;
revoke all on function public.submission_is_complete(public.submissions) from public;
