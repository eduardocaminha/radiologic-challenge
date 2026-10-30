drop function if exists public.moderate_submission(uuid, text, text);

create function public.moderate_submission(
  p_submission_id uuid,
  p_action text,
  p_expected_status text,
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

  select * into v_screenshot
  from public.screenshots
  where id = p_screenshot_id
  for update;
  if not found then
    raise exception using errcode = 'SUB04', message = 'screenshot not found';
  end if;
  if v_screenshot.status = v_target or v_screenshot.status <> 'pending' then
    return;
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

create or replace function public.admin_moderation_queue()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_admin_id uuid;
  v_pending jsonb;
  v_pending_screenshots jsonb;
  v_published jsonb;
begin
  v_admin_id := auth.uid();
  if v_admin_id is null then
    raise exception using errcode = 'SUB01', message = 'submission requires an authenticated user';
  end if;
  if not exists (select 1 from public.admins where user_id = v_admin_id) then
    raise exception using errcode = 'SUB20', message = 'only admins can read the moderation queue';
  end if;

  select coalesce(
    pg_catalog.jsonb_agg(
      pg_catalog.to_jsonb(submission) || pg_catalog.jsonb_build_object(
        'screenshots', coalesce((
          select pg_catalog.jsonb_agg(pg_catalog.to_jsonb(screenshot) order by screenshot.position, screenshot.created_at, screenshot.id)
          from public.screenshots as screenshot
          where screenshot.submission_id = submission.id
        ), '[]'::jsonb),
        'events', coalesce((
          select pg_catalog.jsonb_agg(pg_catalog.to_jsonb(event) order by event.created_at, event.id)
          from public.submission_events as event
          where event.submission_id = submission.id
        ), '[]'::jsonb)
      )
      order by submission.created_at, submission.id
    ),
    '[]'::jsonb
  )
  into v_pending
  from public.submissions as submission
  where submission.status = 'pending';

  select coalesce(
    pg_catalog.jsonb_agg(
      pg_catalog.to_jsonb(screenshot) || pg_catalog.jsonb_build_object(
        'submission_name', submission.name,
        'submission_slug', submission.slug,
        'submission', pg_catalog.to_jsonb(submission) || pg_catalog.jsonb_build_object(
          'screenshots', coalesce((
            select pg_catalog.jsonb_agg(pg_catalog.to_jsonb(related_screenshot) order by related_screenshot.position, related_screenshot.created_at, related_screenshot.id)
            from public.screenshots as related_screenshot
            where related_screenshot.submission_id = submission.id
          ), '[]'::jsonb),
          'events', coalesce((
            select pg_catalog.jsonb_agg(pg_catalog.to_jsonb(event) order by event.created_at, event.id)
            from public.submission_events as event
            where event.submission_id = submission.id
          ), '[]'::jsonb)
        )
      )
      order by screenshot.created_at, screenshot.id
    ),
    '[]'::jsonb
  )
  into v_pending_screenshots
  from public.screenshots as screenshot
  join public.submissions as submission on submission.id = screenshot.submission_id
  where screenshot.status = 'pending';

  select coalesce(
    pg_catalog.jsonb_agg(
      pg_catalog.to_jsonb(submission) || pg_catalog.jsonb_build_object(
        'screenshots', coalesce((
          select pg_catalog.jsonb_agg(pg_catalog.to_jsonb(screenshot) order by screenshot.position, screenshot.created_at, screenshot.id)
          from public.screenshots as screenshot
          where screenshot.submission_id = submission.id
        ), '[]'::jsonb),
        'events', coalesce((
          select pg_catalog.jsonb_agg(pg_catalog.to_jsonb(event) order by event.created_at, event.id)
          from public.submission_events as event
          where event.submission_id = submission.id
        ), '[]'::jsonb)
      )
      order by submission.created_at, submission.id
    ),
    '[]'::jsonb
  )
  into v_published
  from public.submissions as submission
  where submission.status in ('approved', 'removed');

  return pg_catalog.jsonb_build_object(
    'submissions', v_pending,
    'screenshots', v_pending_screenshots,
    'published', v_published
  );
end;
$$;

revoke all on function public.moderate_submission(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.moderate_submission(uuid, text, text, text) to authenticated;
revoke all on function public.admin_moderation_queue() from public, anon, authenticated;
grant execute on function public.admin_moderation_queue() to authenticated;
