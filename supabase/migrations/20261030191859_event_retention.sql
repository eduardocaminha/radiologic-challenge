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

  -- Única exceção direta à regra: a retenção de 12 meses da política de privacidade.
  if tg_op = 'DELETE'
    and old.created_at < pg_catalog.now() - interval '12 months'
    and pg_catalog.current_setting('radiologic.event_retention', true) = 'on' then
    return old;
  end if;

  raise exception using
    errcode = 'SUB31',
    message = 'submission events are append-only';
end;
$$;

create or replace function public.purge_expired_events()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_deleted integer;
begin
  perform pg_catalog.set_config('radiologic.event_retention', 'on', true);
  delete from public.submission_events
  where created_at < pg_catalog.now() - interval '12 months';
  get diagnostics v_deleted = row_count;
  perform pg_catalog.set_config('radiologic.event_retention', 'off', true);
  return v_deleted;
end;
$$;

revoke all on function public.purge_expired_events() from public, anon, authenticated;

select cron.schedule(
  'radiologic-challenge-event-purge',
  '0 4 * * *',
  $$select public.purge_expired_events();$$
);
