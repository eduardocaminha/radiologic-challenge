create table public.submission_idempotency_keys (
  owner_id uuid not null references auth.users (id) on delete cascade,
  idempotency_key uuid not null,
  submission_id uuid not null references public.submissions (id) on delete cascade,
  primary key (owner_id, idempotency_key),
  unique (submission_id)
);

alter table public.submission_idempotency_keys enable row level security;
revoke all on table public.submission_idempotency_keys from public, anon, authenticated;

create or replace function public.create_submission(p_name text, p_idempotency_key uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_submission_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception using errcode = 'SUB01', message = 'submission requires an authenticated user';
  end if;
  if p_idempotency_key is null then
    raise exception using errcode = 'SUB06', message = 'submission idempotency key is required';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::text || ':' || p_idempotency_key::text, 3)
  );

  select submission_id into v_submission_id
  from public.submission_idempotency_keys
  where owner_id = v_user_id and idempotency_key = p_idempotency_key
  for update;

  if found then
    return v_submission_id;
  end if;

  v_submission_id := public.create_submission(p_name);
  insert into public.submission_idempotency_keys (owner_id, idempotency_key, submission_id)
  values (v_user_id, p_idempotency_key, v_submission_id);
  return v_submission_id;
end;
$$;

revoke all on function public.create_submission(text, uuid) from public, anon, authenticated;
grant execute on function public.create_submission(text, uuid) to authenticated;
