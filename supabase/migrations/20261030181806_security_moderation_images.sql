create or replace function public.current_rules_version()
returns text
language sql
immutable
set search_path = ''
as $$
  select '2026-10-30'::text;
$$;

revoke all on function public.current_rules_version() from public, anon, authenticated;

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
  -- A versão e a data do aceite vêm do servidor. O cliente só informa se aceitou.
  if p_changes ? 'rules_accepted' then
    if not coalesce((p_changes ->> 'rules_accepted')::boolean, false) then
      v_new.rules_version := null;
      v_new.rules_accepted_at := null;
    elsif v_old.rules_version is distinct from public.current_rules_version() then
      v_new.rules_version := public.current_rules_version();
      v_new.rules_accepted_at := pg_catalog.now();
    end if;
  end if;

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
    v_rules_version := public.current_rules_version();
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

drop policy screenshots_owner_upload on storage.objects;
drop function public.can_upload_screenshot(text);

-- Cinco imagens mais folga para uploads cujo registro falhou. O teto por conta
-- segura quem abre vários rascunhos. Caminho já registrado nunca aceita outro arquivo.
create function public.can_upload_screenshot(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
      select 1
      from public.submissions as submission
      where submission.id::text = pg_catalog.split_part(p_name, '/', 2)
        and submission.owner_id = auth.uid()
        and submission.status <> 'removed'
    )
    and not exists (
      select 1 from public.screenshots as screenshot where screenshot.path = p_name
    )
    and (
      select count(*)
      from storage.objects as object
      where object.bucket_id = 'screenshots'
        and object.name like pg_catalog.split_part(p_name, '/', 1) || '/' || pg_catalog.split_part(p_name, '/', 2) || '/%'
    ) < 8
    and (
      select count(*)
      from storage.objects as object
      where object.bucket_id = 'screenshots'
        and object.name like pg_catalog.split_part(p_name, '/', 1) || '/%'
    ) < 50;
$$;

revoke all on function public.can_upload_screenshot(text) from public, anon, authenticated;
grant execute on function public.can_upload_screenshot(text) to authenticated;

create policy screenshots_owner_upload
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'screenshots'
  and name ~ ('^' || auth.uid()::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpg|jpeg|webp)$')
  and public.can_upload_screenshot(name)
);

create or replace function public.register_screenshot(
  p_submission_id uuid,
  p_path text,
  p_position integer default null
)
returns public.screenshots
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_submission public.submissions;
  v_position integer;
  v_screenshot public.screenshots;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception using errcode = 'SUB01', message = 'submission requires an authenticated user';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('screenshot:' || p_submission_id::text, 4)
  );

  select * into v_submission
  from public.submissions
  where id = p_submission_id
  for update;
  if not found then
    raise exception using errcode = 'SUB04', message = 'submission not found';
  end if;
  if v_submission.owner_id is distinct from v_user_id then
    raise exception using errcode = 'SUB05', message = 'only the submission owner can change screenshots';
  end if;
  if p_path is null or p_path !~ (
    '^' || v_user_id::text || '/' || p_submission_id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpg|jpeg|webp)$'
  ) then
    raise exception using errcode = 'SUB40', message = 'invalid screenshot path';
  end if;
  if not exists (
    select 1 from storage.objects
    where bucket_id = 'screenshots' and name = p_path
  ) then
    raise exception using errcode = 'SUB41', message = 'screenshot object was not uploaded';
  end if;
  select * into v_screenshot
  from public.screenshots
  where path = p_path
  for update;
  if found then
    if v_screenshot.submission_id <> p_submission_id then
      raise exception using errcode = 'SUB40', message = 'invalid screenshot path';
    end if;
    return v_screenshot;
  end if;
  -- Vem depois da busca pelo caminho: a action apaga o arquivo quando esta função
  -- falha, e um caminho já registrado nunca pode cair nesse apagamento.
  if v_submission.status = 'removed' then
    raise exception using errcode = 'SUB23', message = 'removed submissions cannot receive screenshots';
  end if;
  if (select count(*) from public.screenshots where submission_id = p_submission_id) >= 5 then
    raise exception using errcode = 'SUB42', message = 'a submission can have at most five screenshots';
  end if;

  v_position := coalesce(p_position, (select coalesce(max(position), 0) + 1 from public.screenshots where submission_id = p_submission_id));
  if v_position not between 1 and 5 then
    raise exception using errcode = 'SUB43', message = 'screenshot position must be between 1 and 5';
  end if;
  if exists (select 1 from public.screenshots where submission_id = p_submission_id and position = v_position) then
    raise exception using errcode = 'SUB44', message = 'screenshot position is already in use';
  end if;

  insert into public.screenshots (submission_id, path, position)
  values (p_submission_id, p_path, v_position)
  returning * into v_screenshot;
  update public.submissions set updated_at = pg_catalog.now() where id = p_submission_id;
  return v_screenshot;
end;
$$;

create or replace function public.delete_screenshot_for_owner(p_screenshot_id uuid, p_owner_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_path text;
  v_submission_id uuid;
  v_position integer;
begin
  if p_owner_id is null then
    raise exception using errcode = 'SUB01', message = 'submission requires an authenticated user';
  end if;
  select screenshot.path, screenshot.submission_id, screenshot.position into v_path, v_submission_id, v_position
  from public.screenshots as screenshot
  join public.submissions as submission on submission.id = screenshot.submission_id
  where screenshot.id = p_screenshot_id and submission.owner_id = p_owner_id
  for update of screenshot;
  if not found then
    raise exception using errcode = 'SUB04', message = 'screenshot not found';
  end if;

  delete from public.screenshots where id = p_screenshot_id;
  update public.screenshots
  set position = position - 1
  where submission_id = v_submission_id
    and position > v_position;
  -- Passa pelo guard: projeto removido não muda, e o que está em moderação não fica sem imagem.
  update public.submissions set updated_at = pg_catalog.now() where id = v_submission_id;
  return v_path;
end;
$$;

create or replace function public.reorder_screenshots(p_submission_id uuid, p_screenshot_ids uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_count integer;
  v_index integer;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception using errcode = 'SUB01', message = 'submission requires an authenticated user';
  end if;
  if not exists (select 1 from public.submissions where id = p_submission_id and owner_id = v_user_id) then
    raise exception using errcode = 'SUB05', message = 'only the submission owner can change screenshots';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('screenshot:' || p_submission_id::text, 4)
  );
  select count(*) into v_count from public.screenshots where submission_id = p_submission_id;
  if coalesce(pg_catalog.array_length(p_screenshot_ids, 1), 0) <> v_count
    or (select count(distinct id) from unnest(coalesce(p_screenshot_ids, '{}'::uuid[])) as ids(id)) <> v_count
    or exists (
      select 1 from unnest(coalesce(p_screenshot_ids, '{}'::uuid[])) as ids(id)
      where not exists (select 1 from public.screenshots where screenshots.id = ids.id and screenshots.submission_id = p_submission_id)
    ) then
    raise exception using errcode = 'SUB45', message = 'screenshot order does not match the submission';
  end if;

  set constraints public.screenshots_submission_position_key deferred;
  for v_index in 1..v_count loop
    update public.screenshots set position = v_index where id = p_screenshot_ids[v_index];
  end loop;
  update public.submissions set updated_at = pg_catalog.now() where id = p_submission_id;
end;
$$;

drop function public.moderate_submission(uuid, text, text, text);

create function public.moderate_submission(
  p_submission_id uuid,
  p_action text,
  p_expected_status text,
  p_reason text default null,
  p_expected_updated_at timestamptz default null
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
  if v_admin_id is null then
    raise exception using errcode = 'SUB01', message = 'submission requires an authenticated user';
  end if;
  if not exists (select 1 from public.admins where user_id = v_admin_id) then
    raise exception using errcode = 'SUB20', message = 'only admins can moderate submissions';
  end if;
  if p_expected_status is null or p_expected_status not in ('pending', 'approved', 'removed', 'rejected') then
    raise exception using errcode = 'SUB21', message = 'invalid expected submission status';
  end if;

  v_target := case pg_catalog.lower(pg_catalog.btrim(p_action))
    when 'approve' then 'approved'
    when 'approved' then 'approved'
    when 'restore' then 'approved'
    when 'reject' then 'rejected'
    when 'rejected' then 'rejected'
    when 'remove' then 'removed'
    when 'removed' then 'removed'
    else null
  end;
  if v_target is null then
    raise exception using errcode = 'SUB21', message = 'invalid moderation action';
  end if;

  select * into v_submission
  from public.submissions
  where id = p_submission_id
  for update;
  if not found then
    raise exception using errcode = 'SUB04', message = 'submission not found';
  end if;
  if v_submission.status <> p_expected_status then
    return;
  end if;
  if v_submission.status = v_target then
    return;
  end if;

  -- Another tab may have completed a different moderation action while this
  -- transaction waited for the row lock. That item is already moderated.
  if v_submission.status = 'rejected'
    or (v_submission.status = 'approved' and v_target <> 'removed')
    or (v_submission.status = 'removed' and v_target <> 'approved') then
    return;
  end if;

  if v_submission.status = 'pending' and v_target = 'approved' then
    -- A aprovação vale para a versão que foi revisada, com ficha e imagens.
    if p_expected_updated_at is not null and v_submission.updated_at <> p_expected_updated_at then
      raise exception using errcode = 'SUB25', message = 'submission changed during review';
    end if;
    if not exists (
      select 1 from public.screenshots
      where submission_id = p_submission_id and status = 'approved'
    ) then
      raise exception using errcode = 'SUB24', message = 'submission requires an approved screenshot';
    end if;
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
    update public.submissions set status = 'removed', updated_at = pg_catalog.now() where id = p_submission_id;
  elsif v_submission.status = 'removed' and v_target = 'approved' then
    if not exists (
      select 1 from public.screenshots
      where submission_id = p_submission_id and status = 'approved'
    ) then
      raise exception using errcode = 'SUB24', message = 'submission requires an approved screenshot';
    end if;
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

revoke all on function public.moderate_submission(uuid, text, text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.moderate_submission(uuid, text, text, text, timestamptz) to authenticated;

-- Retirada de emergência, como imagem com dado de paciente. Devolve o caminho para a
-- action apagar o arquivo: é o que invalida as URLs assinadas já emitidas.
create or replace function public.withdraw_screenshot(p_screenshot_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin_id uuid;
  v_screenshot public.screenshots;
begin
  v_admin_id := auth.uid();
  if v_admin_id is null then
    raise exception using errcode = 'SUB01', message = 'submission requires an authenticated user';
  end if;
  if not exists (select 1 from public.admins where user_id = v_admin_id) then
    raise exception using errcode = 'SUB20', message = 'only admins can moderate screenshots';
  end if;

  select * into v_screenshot
  from public.screenshots
  where id = p_screenshot_id
  for update;
  if not found then
    raise exception using errcode = 'SUB04', message = 'screenshot not found';
  end if;

  update public.screenshots set status = 'rejected' where id = p_screenshot_id;
  insert into public.submission_events (submission_id, actor_id, kind, detail)
  values (
    v_screenshot.submission_id,
    v_admin_id,
    'screenshot_moderated',
    pg_catalog.jsonb_build_object('screenshot_id', p_screenshot_id, 'from', v_screenshot.status, 'to', 'rejected', 'withdrawn', true)
  );
  return v_screenshot.path;
end;
$$;

revoke all on function public.withdraw_screenshot(uuid) from public, anon, authenticated;
grant execute on function public.withdraw_screenshot(uuid) to authenticated;
