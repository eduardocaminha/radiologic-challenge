create or replace function public.prevent_github_user_id_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.github_user_id is distinct from new.github_user_id then
    raise exception using errcode = 'SUB50', message = 'github user id is immutable';
  end if;
  return new;
end;
$$;

create trigger submissions_github_user_id_immutable
before update on public.submissions
for each row execute function public.prevent_github_user_id_change();

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
    v_rules_version := '2026-10-04';
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
    author_name, author_profile, country, dicomweb, rules_version, rules_accepted_at
  )
  values (
    'draft', 'github', p_issue_number, pg_catalog.btrim(p_github_user_id), v_patch.name, v_patch.tagline, v_patch.differential,
    v_patch.lang, v_patch.platforms, v_patch.requires_install, v_patch.repo_url, v_patch.license, v_patch.base_tech, v_patch.data_source,
    v_patch.data_license, v_patch.external_api, v_patch.external_api_detail, v_patch.demo_url, v_patch.download_url, v_patch.video_url,
    v_patch.author_name, v_patch.author_profile, v_patch.country, v_patch.dicomweb, v_rules_version, v_rules_accepted_at
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

create or replace function public.claim_github_submissions()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_claimed integer;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception using errcode = 'SUB01', message = 'submission requires an authenticated user';
  end if;

  update public.submissions as submission
  set owner_id = v_user_id,
      updated_at = pg_catalog.now()
  where submission.source = 'github'
    and submission.status = 'draft'
    and submission.owner_id is null
    and exists (
      select 1
      from auth.identities as identity
      where identity.user_id = v_user_id
        and identity.provider = 'github'
        and identity.provider_id = submission.github_user_id
    );

  get diagnostics v_claimed = row_count;
  return v_claimed;
end;
$$;

revoke all on function public.prevent_github_user_id_change() from public, anon, authenticated, service_role;
revoke all on function public.intake_github_issue(integer, text, jsonb) from public, anon, authenticated;
revoke all on function public.claim_github_submissions() from public, anon;
grant execute on function public.intake_github_issue(integer, text, jsonb) to service_role;
grant execute on function public.claim_github_submissions() to authenticated;
