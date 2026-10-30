create table public.moderation_digest_sends (
  id boolean primary key default true check (id),
  digest_date date not null,
  pending_key text not null check (char_length(pending_key) between 1 and 64),
  submissions_count integer not null check (submissions_count >= 0),
  screenshots_count integer not null check (screenshots_count >= 0),
  sent_at timestamptz not null default now()
);

alter table public.moderation_digest_sends enable row level security;
revoke all on table public.moderation_digest_sends from anon, authenticated;

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
  v_pending_key text;
begin
  select count(*)::integer into v_submissions_count
  from public.submissions
  where status = 'pending';

  select count(*)::integer into v_screenshots_count
  from public.screenshots
  where status = 'pending';

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
  ) into v_pending_key;

  return pg_catalog.jsonb_build_object(
    'should_send', v_submissions_count + v_screenshots_count > 0
      and not exists (
        select 1
        from public.moderation_digest_sends
        where digest_date = p_digest_date
          and pending_key = v_pending_key
      ),
    'pending_key', v_pending_key,
    'submissions_count', v_submissions_count,
    'screenshots_count', v_screenshots_count
  );
end;
$$;

create or replace function public.record_moderation_digest_send(
  p_digest_date date,
  p_pending_key text,
  p_submissions_count integer,
  p_screenshots_count integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.moderation_digest_sends (
    id,
    digest_date,
    pending_key,
    submissions_count,
    screenshots_count
  )
  values (
    true,
    p_digest_date,
    p_pending_key,
    p_submissions_count,
    p_screenshots_count
  )
  on conflict (id) do update set
    digest_date = excluded.digest_date,
    pending_key = excluded.pending_key,
    submissions_count = excluded.submissions_count,
    screenshots_count = excluded.screenshots_count,
    sent_at = excluded.sent_at;

  return found;
end;
$$;

revoke all on function public.get_moderation_digest(date) from public, anon, authenticated;
revoke all on function public.record_moderation_digest_send(date, text, integer, integer) from public, anon, authenticated;
grant execute on function public.get_moderation_digest(date) to service_role;
grant execute on function public.record_moderation_digest_send(date, text, integer, integer) to service_role;
