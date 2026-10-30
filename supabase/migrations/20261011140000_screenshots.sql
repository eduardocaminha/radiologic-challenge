insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'screenshots',
  'screenshots',
  false,
  2097152,
  array['image/png', 'image/jpeg', 'image/webp']::text[]
)
on conflict (id) do update
set name = excluded.name,
    public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.can_upload_screenshot(p_submission_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.submissions as submission
    where submission.id::text = p_submission_id
      and submission.owner_id = auth.uid()
  );
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
  and public.can_upload_screenshot(split_part(name, '/', 2))
);

alter table public.screenshots
  add constraint screenshots_path_key unique (path);

alter table public.screenshots
  drop constraint screenshots_submission_id_position_key;

alter table public.screenshots
  add constraint screenshots_submission_position_key unique (submission_id, position)
  deferrable initially immediate;

alter table public.submission_events
  drop constraint submission_events_kind_check;

alter table public.submission_events
  add constraint submission_events_kind_check check (
    kind in ('state_transition', 'approved_url_changed', 'vote_voided', 'voter_banned', 'snapshot_recomputed', 'screenshot_moderated')
  );

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
  if v_submission.status = 'removed' then
    raise exception using errcode = 'SUB23', message = 'removed submissions cannot receive screenshots';
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
  return v_screenshot;
end;
$$;

create or replace function public.my_screenshots(p_submission_id uuid)
returns table (id uuid, submission_id uuid, path text, status text, "position" integer, created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select screenshot.id, screenshot.submission_id, screenshot.path, screenshot.status, screenshot.position, screenshot.created_at
  from public.screenshots as screenshot
  join public.submissions as submission on submission.id = screenshot.submission_id
  where screenshot.submission_id = p_submission_id
    and submission.owner_id = auth.uid()
  order by screenshot.position;
$$;

create or replace function public.my_screenshot(p_screenshot_id uuid)
returns table (id uuid, submission_id uuid, path text, status text, "position" integer, created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select screenshot.id, screenshot.submission_id, screenshot.path, screenshot.status, screenshot.position, screenshot.created_at
  from public.screenshots as screenshot
  join public.submissions as submission on submission.id = screenshot.submission_id
  where screenshot.id = p_screenshot_id
    and submission.owner_id = auth.uid();
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
  return v_path;
end;
$$;

create or replace function public.delete_screenshot(p_screenshot_id uuid)
returns text
language sql
security definer
set search_path = ''
as $$
  select public.delete_screenshot_for_owner(p_screenshot_id, auth.uid());
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
end;
$$;

create or replace function public.moderate_screenshot(p_screenshot_id uuid, p_action text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin_id uuid;
  v_screenshot public.screenshots;
  v_target text;
begin
  v_admin_id := auth.uid();
  if v_admin_id is null then
    raise exception using errcode = 'SUB01', message = 'submission requires an authenticated user';
  end if;
  if not exists (select 1 from public.admins where user_id = v_admin_id) then
    raise exception using errcode = 'SUB20', message = 'only admins can moderate screenshots';
  end if;
  v_target := case pg_catalog.lower(pg_catalog.btrim(p_action))
    when 'approve' then 'approved'
    when 'approved' then 'approved'
    when 'reject' then 'rejected'
    when 'rejected' then 'rejected'
    else null
  end;
  if v_target is null then
    raise exception using errcode = 'SUB46', message = 'invalid screenshot moderation action';
  end if;
  select * into v_screenshot from public.screenshots where id = p_screenshot_id for update;
  if not found then
    raise exception using errcode = 'SUB04', message = 'screenshot not found';
  end if;
  if v_screenshot.status = v_target then return; end if;
  if v_screenshot.status <> 'pending' then
    raise exception using errcode = 'SUB47', message = 'invalid screenshot state transition';
  end if;

  update public.screenshots set status = v_target where id = p_screenshot_id;
  insert into public.submission_events (submission_id, actor_id, kind, detail)
  values (
    v_screenshot.submission_id,
    v_admin_id,
    'screenshot_moderated',
    pg_catalog.jsonb_build_object('screenshot_id', p_screenshot_id, 'from', v_screenshot.status, 'to', v_target)
  );
end;
$$;

create or replace function public.get_public_screenshots(p_slug text)
returns table (id uuid, path text, "position" integer)
language sql
stable
security definer
set search_path = ''
as $$
  select screenshot.id, screenshot.path, screenshot.position
  from public.screenshots as screenshot
  join public.submissions as submission on submission.id = screenshot.submission_id
  where submission.slug = p_slug
    and submission.status = 'approved'
    and screenshot.status = 'approved'
  order by screenshot.position;
$$;

create or replace function public.delete_submission_for_owner(p_submission_id uuid, p_owner_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid;
begin
  if p_owner_id is null then raise exception using errcode = 'SUB01', message = 'submission requires an authenticated user'; end if;
  select owner_id into v_owner_id from public.submissions where id = p_submission_id for update;
  if not found then raise exception using errcode = 'SUB04', message = 'submission not found'; end if;
  if v_owner_id is distinct from p_owner_id then raise exception using errcode = 'SUB05', message = 'only the submission owner can delete it'; end if;
  delete from public.submissions where id = p_submission_id;
end;
$$;

create or replace function public.delete_submission(p_submission_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  select public.delete_submission_for_owner(p_submission_id, auth.uid());
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
  values (p_submission_id, v_admin_id, 'state_transition', pg_catalog.jsonb_build_object('from', v_submission.status, 'to', v_target, 'reason', p_reason));
end;
$$;

revoke all on function public.register_screenshot(uuid, text, integer) from public, anon, authenticated;
revoke all on function public.my_screenshots(uuid) from public, anon, authenticated;
revoke all on function public.my_screenshot(uuid) from public, anon, authenticated;
revoke all on function public.delete_screenshot(uuid) from public, anon, authenticated;
revoke all on function public.delete_screenshot_for_owner(uuid, uuid) from public, anon, authenticated;
revoke all on function public.delete_submission(uuid) from public, anon, authenticated;
revoke all on function public.reorder_screenshots(uuid, uuid[]) from public, anon, authenticated;
revoke all on function public.moderate_screenshot(uuid, text) from public, anon, authenticated;
revoke all on function public.get_public_screenshots(text) from public, anon, authenticated;
revoke all on function public.delete_submission_for_owner(uuid, uuid) from public, anon, authenticated;
grant execute on function public.register_screenshot(uuid, text, integer) to authenticated;
grant execute on function public.my_screenshots(uuid) to authenticated;
grant execute on function public.my_screenshot(uuid) to authenticated;
grant execute on function public.reorder_screenshots(uuid, uuid[]) to authenticated;
grant execute on function public.moderate_screenshot(uuid, text) to authenticated;
grant execute on function public.get_public_screenshots(text) to anon, authenticated;
grant execute on function public.delete_screenshot_for_owner(uuid, uuid) to service_role;
grant execute on function public.delete_submission_for_owner(uuid, uuid) to service_role;
