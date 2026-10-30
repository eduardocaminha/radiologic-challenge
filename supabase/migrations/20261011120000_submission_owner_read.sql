create or replace function public.my_submission(p_submission_id uuid)
returns setof public.submissions
language sql
stable
security definer
set search_path = ''
as $$
  select s.*
  from public.submissions as s
  where s.id = p_submission_id
    and s.owner_id = auth.uid();
$$;

revoke all on function public.my_submission(uuid) from public, anon, authenticated;
grant execute on function public.my_submission(uuid) to authenticated;
