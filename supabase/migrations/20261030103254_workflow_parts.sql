alter table public.submissions
  add column workflow_parts text[] check (
    workflow_parts is null
    or (cardinality(workflow_parts) <= 5 and workflow_parts <@ array['viewer', 'worklist', 'ai', 'agent', 'report']::text[])
  );

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
  v_new.workflow_parts := case when p_changes ? 'workflow_parts' then v_patch.workflow_parts else v_old.workflow_parts end;
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
      workflow_parts = v_new.workflow_parts,
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

create or replace function public.submission_is_complete(p_submission public.submissions)
returns boolean
language sql
stable
set search_path = ''
as $$
  select p_submission.name is not null
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

drop function public.get_submission(text);

create or replace function public.get_submission(p_slug text)
returns table (
  id uuid, slug text, status text, name text, tagline text, description text, differential text,
  lang text, platforms text[], requires_install boolean, repo_url text, license text, base_tech text,
  data_source text, data_license text, external_api boolean, external_api_detail text, demo_url text,
  download_url text, video_url text, ai_tools jsonb, ai_code_share text, prompts_url text,
  time_spent text, cost text, features text[], workflow_parts text[], modalities text[], dicomweb boolean, stack text,
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
    s.time_spent, s.cost, s.features, s.workflow_parts, s.modalities, s.dicomweb, s.stack,
    s.author_name, s.author_profile, s.country, s.limitations, s.rules_version,
    s.rules_accepted_at, s.created_at, s.updated_at, s.approved_at
  from public.submissions as s
  where s.slug = p_slug and s.status = 'approved';
$$;

revoke all on function public.get_submission(text) from public, anon, authenticated;
grant execute on function public.get_submission(text) to anon, authenticated;

create or replace function public.intake_github_issue(
  p_issue_number integer,
  p_github_user_id text,
  p_fields jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_existing public.submissions;
  v_patch public.submissions;
  v_submission_id uuid;
  v_rules_version text;
  v_rules_accepted_at timestamptz;
begin
  if p_issue_number is null or p_issue_number < 1
    or p_github_user_id is null or pg_catalog.btrim(p_github_user_id) = ''
    or pg_catalog.char_length(p_github_user_id) > 100
    or p_fields is null or pg_catalog.jsonb_typeof(p_fields) <> 'object' then
    raise exception using errcode = 'SUB51', message = 'invalid GitHub intake payload';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('github-issue:' || p_issue_number::text, 5)
  );

  v_patch := pg_catalog.jsonb_populate_record(null::public.submissions, p_fields);
  if coalesce((p_fields ->> 'rules_accepted')::boolean, false) then
    v_rules_version := '2026-10-30';
    v_rules_accepted_at := pg_catalog.now();
  end if;

  select * into v_existing
  from public.submissions
  where github_issue_number = p_issue_number
  for update;

  if found then
    if v_existing.owner_id is not null or v_existing.status <> 'draft' then
      return v_existing.id;
    end if;

    update public.submissions
    set name = v_patch.name,
        tagline = v_patch.tagline,
        differential = v_patch.differential,
        lang = v_patch.lang,
        platforms = v_patch.platforms,
        requires_install = v_patch.requires_install,
        repo_url = v_patch.repo_url,
        license = v_patch.license,
        base_tech = v_patch.base_tech,
        data_source = v_patch.data_source,
        data_license = v_patch.data_license,
        external_api = v_patch.external_api,
        external_api_detail = v_patch.external_api_detail,
        demo_url = v_patch.demo_url,
        download_url = v_patch.download_url,
        video_url = v_patch.video_url,
        author_name = v_patch.author_name,
        author_profile = v_patch.author_profile,
        country = v_patch.country,
        dicomweb = v_patch.dicomweb,
        workflow_parts = v_patch.workflow_parts,
        rules_version = v_rules_version,
        rules_accepted_at = v_rules_accepted_at,
        updated_at = pg_catalog.now()
    where id = v_existing.id;
    return v_existing.id;
  end if;

  insert into public.submissions (
    status, source, github_issue_number, github_user_id, name, tagline, differential,
    lang, platforms, requires_install, repo_url, license, base_tech, data_source,
    data_license, external_api, external_api_detail, demo_url, download_url, video_url,
    author_name, author_profile, country, dicomweb, workflow_parts, rules_version, rules_accepted_at
  )
  values (
    'draft', 'github', p_issue_number, pg_catalog.btrim(p_github_user_id), v_patch.name, v_patch.tagline, v_patch.differential,
    v_patch.lang, v_patch.platforms, v_patch.requires_install, v_patch.repo_url, v_patch.license, v_patch.base_tech, v_patch.data_source,
    v_patch.data_license, v_patch.external_api, v_patch.external_api_detail, v_patch.demo_url, v_patch.download_url, v_patch.video_url,
    v_patch.author_name, v_patch.author_profile, v_patch.country, v_patch.dicomweb, v_patch.workflow_parts, v_rules_version, v_rules_accepted_at
  )
  returning id into v_submission_id;

  insert into public.submission_events (submission_id, kind, detail)
  values (
    v_submission_id,
    'state_transition',
    pg_catalog.jsonb_build_object('from', null, 'to', 'draft', 'source', 'github', 'issue_number', p_issue_number)
  );

  return v_submission_id;
end;
$$;
