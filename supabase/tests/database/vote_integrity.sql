begin;

select plan(28);

select has_function('public'::name, 'vote_report'::name, array['uuid'::name]);
select has_function('public'::name, 'void_votes'::name, array['uuid'::name]);
select has_function('public'::name, 'void_votes'::name, array['uuid'::name, 'text'::name]);
select has_function('public'::name, 'ban_voter'::name, array['uuid'::name, 'text'::name]);
select ok((select prosecdef from pg_proc where oid = 'public.vote_report(uuid)'::regprocedure), 'vote_report is security definer');
select ok((select prosecdef from pg_proc where oid = 'public.void_votes(uuid,text)'::regprocedure), 'void_votes is security definer');
select ok((select prosecdef from pg_proc where oid = 'public.ban_voter(uuid,text)'::regprocedure), 'ban_voter is security definer');
select ok((select replace(replace(coalesce(proconfig[1], ''), 'search_path=', ''), chr(34), '') = '' from pg_proc where oid = 'public.vote_report(uuid)'::regprocedure), 'vote_report has an empty search_path');
select is(has_function_privilege('anon', 'public.vote_report(uuid)', 'EXECUTE'), false, 'anon cannot inspect vote integrity');
select is(has_function_privilege('authenticated', 'public.vote_report(uuid)', 'EXECUTE'), true, 'authenticated can call vote_report');
select is(has_function_privilege('authenticated', 'public.void_votes(uuid,text)', 'EXECUTE'), true, 'authenticated can void votes');
select is(has_function_privilege('authenticated', 'public.ban_voter(uuid,text)', 'EXECUTE'), true, 'authenticated can ban voters');

insert into auth.users (id, aud, role, email, created_at)
values
  ('55555555-5555-4555-8555-555555555551', 'authenticated', 'authenticated', 'integrity-admin@example.test', now()),
  ('55555555-5555-4555-8555-555555555552', 'authenticated', 'authenticated', 'integrity-new@example.test', now() - interval '1 hour'),
  ('55555555-5555-4555-8555-555555555553', 'authenticated', 'authenticated', 'integrity-old@example.test', now() - interval '2 days'),
  ('55555555-5555-4555-8555-555555555554', 'authenticated', 'authenticated', 'integrity-multi@example.test', now() - interval '1 hour');
insert into auth.identities (id, user_id, provider_id, identity_data, provider)
values
  ('55555555-5555-4555-8555-555555555551', '55555555-5555-4555-8555-555555555551', 'integrity-admin', '{"sub":"integrity-admin"}', 'github'),
  ('55555555-5555-4555-8555-555555555552', '55555555-5555-4555-8555-555555555552', 'integrity-new', '{"sub":"integrity-new"}', 'github'),
  ('55555555-5555-4555-8555-555555555553', '55555555-5555-4555-8555-555555555553', 'integrity-old', '{"sub":"integrity-old"}', 'google'),
  ('55555555-5555-4555-8555-555555555554', '55555555-5555-4555-8555-555555555554', 'integrity-multi', '{"sub":"integrity-multi"}', 'google');
insert into public.admins (user_id) values ('55555555-5555-4555-8555-555555555551');
insert into public.submissions (id, slug, status, source, name, tagline, approved_at)
values
  ('55555555-5555-4555-8555-555555555561', 'integrity-viewer', 'approved', 'form', 'Integrity viewer', 'Integrity tagline', now()),
  ('55555555-5555-4555-8555-555555555562', 'integrity-other', 'approved', 'form', 'Other viewer', 'Other tagline', now());
insert into public.votes (user_id, submission_id, created_at)
values
  ('55555555-5555-4555-8555-555555555552', '55555555-5555-4555-8555-555555555561', now() - interval '30 minutes'),
  ('55555555-5555-4555-8555-555555555553', '55555555-5555-4555-8555-555555555561', now() - interval '20 minutes'),
  ('55555555-5555-4555-8555-555555555554', '55555555-5555-4555-8555-555555555561', now() - interval '10 minutes'),
  ('55555555-5555-4555-8555-555555555554', '55555555-5555-4555-8555-555555555562', now() - interval '5 minutes');

select set_config('request.jwt.claim.sub', '55555555-5555-4555-8555-555555555552', false);
select throws_ok(
  $$select * from public.vote_report('55555555-5555-4555-8555-555555555561')$$,
  'VOT20',
  'only admins can inspect vote integrity',
  'vote_report rejects non-admins'
);

select set_config('request.jwt.claim.sub', '55555555-5555-4555-8555-555555555551', false);
select is((select total_votes from public.vote_report('55555555-5555-4555-8555-555555555561')), 3::bigint, 'vote_report returns total active votes');
select is((select suspicious_votes from public.vote_report('55555555-5555-4555-8555-555555555561')), 1::bigint, 'vote_report counts new accounts that only voted on this viewer');
select is((select suspicious_fraction from public.vote_report('55555555-5555-4555-8555-555555555561')), 1::numeric / 3, 'vote_report returns the suspicious fraction');
select is((select sum((item->>'votes')::integer) from jsonb_array_elements((select hourly_votes from public.vote_report('55555555-5555-4555-8555-555555555561'))) as item), 3::bigint, 'vote_report returns the last 30 days hourly histogram');
select is((select jsonb_array_length(suspicious_accounts) from public.vote_report('55555555-5555-4555-8555-555555555561')), 1, 'vote_report returns the suspicious account list');
select is((select suspicious_accounts->0->>'email_hint' from public.vote_report('55555555-5555-4555-8555-555555555561')), 'i***@example.test', 'vote_report masks the complete email');

select public.void_votes('55555555-5555-4555-8555-555555555552', 'votos concentrados');
select ok((select voided_at is not null from public.votes where user_id = '55555555-5555-4555-8555-555555555552'), 'void_votes marks the account votes');
select is((select total_votes from public.ranking() where submission_id = '55555555-5555-4555-8555-555555555561'), 2::bigint, 'voided votes leave the ranking');
select is((select count(*) from public.submission_events where kind = 'vote_voided'), 1::bigint, 'void_votes records actor and reason');
select public.void_votes('55555555-5555-4555-8555-555555555552', 'second action');
select is((select count(*) from public.submission_events where kind = 'vote_voided'), 1::bigint, 'void_votes is a no-op when repeated');

select public.ban_voter('55555555-5555-4555-8555-555555555553', 'conta suspeita');
select is((select count(*) from public.banned_voters where user_id = '55555555-5555-4555-8555-555555555553'), 1::bigint, 'ban_voter records the ban');
select is((select count(*) from public.submission_events where kind = 'voter_banned'), 1::bigint, 'ban_voter records actor and reason');
select public.ban_voter('55555555-5555-4555-8555-555555555553', 'second action');
select is((select count(*) from public.submission_events where kind = 'voter_banned'), 1::bigint, 'ban_voter is a no-op when repeated');
select set_config('request.jwt.claim.sub', '55555555-5555-4555-8555-555555555553', false);
select throws_ok(
  $$select public.cast_vote('55555555-5555-4555-8555-555555555561')$$,
  'VOT03',
  'banned voters cannot vote',
  'ban_voter prevents new votes'
);

select set_config('request.jwt.claim.sub', '55555555-5555-4555-8555-555555555552', false);
select throws_ok(
  $$select public.void_votes('55555555-5555-4555-8555-555555555554', 'not admin')$$,
  'VOT20',
  'only admins can void votes',
  'void_votes rejects non-admins'
);

select * from finish();
rollback;
