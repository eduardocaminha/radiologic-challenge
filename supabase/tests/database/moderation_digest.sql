begin;

select plan(20);

select has_table('public'::name, 'moderation_digest_sends'::name);
select is((select relrowsecurity from pg_class where oid = 'public.moderation_digest_sends'::regclass), true, 'digest sends has RLS enabled');
select is(has_table_privilege('anon', 'public.moderation_digest_sends', 'SELECT'), false, 'anon cannot read digest sends');
select is(has_table_privilege('authenticated', 'public.moderation_digest_sends', 'INSERT'), false, 'authenticated cannot write digest sends');
select has_function('public'::name, 'get_moderation_digest'::name, array['date'::name]);
select has_function('public'::name, 'record_moderation_digest_send'::name, array['date'::name, 'text'::name, 'integer'::name, 'integer'::name]);
select ok((select prosecdef from pg_proc where oid = 'public.get_moderation_digest(date)'::regprocedure), 'digest query is security definer');
select ok((select prosecdef from pg_proc where oid = 'public.record_moderation_digest_send(date,text,integer,integer)'::regprocedure), 'digest record is security definer');
select ok((select replace(replace(coalesce(proconfig[1], ''), 'search_path=', ''), chr(34), '') = '' from pg_proc where oid = 'public.get_moderation_digest(date)'::regprocedure), 'digest query has an empty search_path');
select ok((select replace(replace(coalesce(proconfig[1], ''), 'search_path=', ''), chr(34), '') = '' from pg_proc where oid = 'public.record_moderation_digest_send(date,text,integer,integer)'::regprocedure), 'digest record has an empty search_path');
select is(has_function_privilege('anon', 'public.get_moderation_digest(date)', 'EXECUTE'), false, 'anon cannot query the digest');
select is(has_function_privilege('authenticated', 'public.record_moderation_digest_send(date,text,integer,integer)', 'EXECUTE'), false, 'authenticated cannot record the digest');

insert into public.submissions (id, status, source, name)
values ('70000000-0000-0000-0000-000000000001', 'pending', 'form', 'Digest submission');
insert into public.screenshots (id, submission_id, path, status, position)
values ('70000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', 'digest/pending.png', 'pending', 1);

select is((public.get_moderation_digest('2026-10-11'::date)->>'should_send')::boolean, true, 'pending items require an email');
select is((public.get_moderation_digest('2026-10-11'::date)->>'submissions_count')::integer, 1, 'digest counts pending submissions');
select is((public.get_moderation_digest('2026-10-11'::date)->>'screenshots_count')::integer, 1, 'digest counts pending screenshots');
select ok(public.record_moderation_digest_send(
  '2026-10-11'::date,
  public.get_moderation_digest('2026-10-11'::date)->>'pending_key',
  1,
  1
), 'first digest record succeeds');
select is((public.get_moderation_digest('2026-10-11'::date)->>'should_send')::boolean, false, 'same pending items are not sent twice in one day');

update public.screenshots set status = 'approved' where id = '70000000-0000-0000-0000-000000000001';
select is((public.get_moderation_digest('2026-10-11'::date)->>'should_send')::boolean, true, 'changed pending items can trigger a new digest');
select is((select count(*) from public.moderation_digest_sends), 1::bigint, 'digest keeps only the last send record');

delete from public.submissions where id = '70000000-0000-0000-0000-000000000001';
select is((public.get_moderation_digest('2026-10-11'::date)->>'should_send')::boolean, false, 'empty moderation queues do not send an email');

select * from finish();
rollback;
