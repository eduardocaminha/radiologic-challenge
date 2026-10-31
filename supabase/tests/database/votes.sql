begin;

select plan(53);

select has_function('public'::name, 'cast_vote'::name, array['uuid'::name]);
select has_function('public'::name, 'revoke_vote'::name, array['uuid'::name]);
select has_function('public'::name, 'my_votes'::name, array[]::name[]);
select has_function('public'::name, 'ranking'::name, array[]::name[]);
select has_function('public'::name, 'snapshot_month'::name, array['date'::name]);

select ok((select prosecdef from pg_proc where oid = 'public.cast_vote(uuid)'::regprocedure), 'cast_vote is security definer');
select ok((select prosecdef from pg_proc where oid = 'public.revoke_vote(uuid)'::regprocedure), 'revoke_vote is security definer');
select ok((select prosecdef from pg_proc where oid = 'public.snapshot_month(date)'::regprocedure), 'snapshot_month is security definer');
select ok((select replace(replace(coalesce(proconfig[1], ''), 'search_path=', ''), chr(34), '') = '' from pg_proc where oid = 'public.cast_vote(uuid)'::regprocedure), 'cast_vote has an empty search_path');
select ok((select relrowsecurity from pg_class where oid = 'public.vote_operations'::regclass), 'vote_operations has RLS enabled');

select is(has_function_privilege('anon', 'public.cast_vote(uuid)', 'EXECUTE'), false, 'anon cannot cast votes');
select is(has_function_privilege('authenticated', 'public.cast_vote(uuid)', 'EXECUTE'), true, 'authenticated can cast votes');
select is(has_function_privilege('anon', 'public.revoke_vote(uuid)', 'EXECUTE'), false, 'anon cannot revoke votes');
select is(has_function_privilege('authenticated', 'public.revoke_vote(uuid)', 'EXECUTE'), true, 'authenticated can revoke votes');
select is(has_function_privilege('anon', 'public.ranking()', 'EXECUTE'), true, 'anon can read ranking');
select is(has_function_privilege('authenticated', 'public.ranking()', 'EXECUTE'), true, 'authenticated can read ranking');
select is(has_function_privilege('anon', 'public.my_votes()', 'EXECUTE'), false, 'anon cannot read my votes');
select is(has_function_privilege('authenticated', 'public.my_votes()', 'EXECUTE'), true, 'authenticated can read my votes');
select is(has_function_privilege('anon', 'public.snapshot_month(date)', 'EXECUTE'), false, 'anon cannot create snapshots');
select is(has_function_privilege('authenticated', 'public.snapshot_month(date)', 'EXECUTE'), false, 'authenticated cannot create snapshots');
select is((select count(*) from cron.job where jobname = 'radiologic-viewers-monthly-snapshot'), 1::bigint, 'monthly snapshot is scheduled');
select is((select schedule from cron.job where jobname = 'radiologic-viewers-monthly-snapshot'), '0 3 1 * *', 'monthly snapshot runs on the first day of each month');
select ok((select command like '%public.snapshot_month%' from cron.job where jobname = 'radiologic-viewers-monthly-snapshot'), 'cron invokes snapshot_month');

insert into auth.users (id, aud, role, email)
values
  ('11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'vote-a@example.test'),
  ('22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'vote-b@example.test'),
  ('33333333-3333-3333-3333-333333333333', 'authenticated', 'authenticated', 'vote-c@example.test'),
  ('44444444-4444-4444-4444-444444444444', 'authenticated', 'authenticated', 'vote-d@example.test');

insert into auth.identities (id, user_id, provider_id, identity_data, provider)
values
  ('11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'vote-a', '{"sub":"vote-a"}', 'google'),
  ('22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'vote-b', '{"sub":"vote-b"}', 'github'),
  ('44444444-4444-4444-4444-444444444444', '44444444-4444-4444-4444-444444444444', 'vote-d', '{"sub":"vote-d"}', 'google');

insert into public.banned_voters (user_id, reason)
values ('44444444-4444-4444-4444-444444444444', 'test ban');

insert into public.submissions (id, slug, status, source, name, tagline, approved_at)
values
  ('10000000-0000-0000-0000-000000000001', 'live-viewer', 'approved', 'form', 'Live viewer', 'Live tagline', now()),
  ('10000000-0000-0000-0000-000000000002', 'snapshot-one', 'approved', 'form', 'Snapshot one', 'Snapshot tagline', ((date_trunc('month', timezone('America/Sao_Paulo', now())) - interval '1 month' + interval '1 day') at time zone 'America/Sao_Paulo')),
  ('10000000-0000-0000-0000-000000000003', 'snapshot-two', 'approved', 'form', 'Snapshot two', 'Snapshot tagline', ((date_trunc('month', timezone('America/Sao_Paulo', now())) - interval '1 month' + interval '2 days') at time zone 'America/Sao_Paulo')),
  ('10000000-0000-0000-0000-000000000004', 'snapshot-three', 'approved', 'form', 'Snapshot three', 'Snapshot tagline', ((date_trunc('month', timezone('America/Sao_Paulo', now())) - interval '1 month' + interval '3 days') at time zone 'America/Sao_Paulo')),
  ('10000000-0000-0000-0000-000000000005', 'snapshot-four', 'approved', 'form', 'Snapshot four', 'Snapshot tagline', ((date_trunc('month', timezone('America/Sao_Paulo', now())) - interval '1 month' + interval '4 days') at time zone 'America/Sao_Paulo')),
  ('10000000-0000-0000-0000-000000000006', 'pending-viewer', 'pending', 'form', 'Pending viewer', 'Pending tagline', null);

insert into public.votes (user_id, submission_id, created_at)
values
  ('11111111-1111-1111-1111-111111111111', '10000000-0000-0000-0000-000000000002', ((date_trunc('month', timezone('America/Sao_Paulo', now())) - interval '1 month' + interval '5 days') at time zone 'America/Sao_Paulo')),
  ('22222222-2222-2222-2222-222222222222', '10000000-0000-0000-0000-000000000002', ((date_trunc('month', timezone('America/Sao_Paulo', now())) - interval '1 month' + interval '5 days') at time zone 'America/Sao_Paulo')),
  ('33333333-3333-3333-3333-333333333333', '10000000-0000-0000-0000-000000000002', ((date_trunc('month', timezone('America/Sao_Paulo', now())) - interval '1 month' + interval '5 days') at time zone 'America/Sao_Paulo')),
  ('11111111-1111-1111-1111-111111111111', '10000000-0000-0000-0000-000000000003', ((date_trunc('month', timezone('America/Sao_Paulo', now())) - interval '1 month' + interval '6 days') at time zone 'America/Sao_Paulo')),
  ('22222222-2222-2222-2222-222222222222', '10000000-0000-0000-0000-000000000003', ((date_trunc('month', timezone('America/Sao_Paulo', now())) - interval '1 month' + interval '6 days') at time zone 'America/Sao_Paulo')),
  ('11111111-1111-1111-1111-111111111111', '10000000-0000-0000-0000-000000000004', ((date_trunc('month', timezone('America/Sao_Paulo', now())) - interval '1 month' + interval '7 days') at time zone 'America/Sao_Paulo')),
  ('22222222-2222-2222-2222-222222222222', '10000000-0000-0000-0000-000000000004', ((date_trunc('month', timezone('America/Sao_Paulo', now())) - interval '1 month' + interval '7 days') at time zone 'America/Sao_Paulo')),
  ('11111111-1111-1111-1111-111111111111', '10000000-0000-0000-0000-000000000005', ((date_trunc('month', timezone('America/Sao_Paulo', now())) - interval '1 month' + interval '8 days') at time zone 'America/Sao_Paulo'));

select set_config('request.jwt.claim.sub', '', false);
select throws_ok(
  $$select public.cast_vote('10000000-0000-0000-0000-000000000001')$$,
  'VOT01',
  'vote requires an authenticated user',
  'cast_vote rejects anonymous users with a typed error'
);

select set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', false);
select throws_ok(
  $$select public.cast_vote('10000000-0000-0000-0000-000000000001')$$,
  'VOT02',
  'vote requires a Google or GitHub identity',
  'cast_vote rejects users without a supported identity'
);

select set_config('request.jwt.claim.sub', '44444444-4444-4444-4444-444444444444', false);
select throws_ok(
  $$select public.cast_vote('10000000-0000-0000-0000-000000000001')$$,
  'VOT03',
  'banned voters cannot vote',
  'cast_vote rejects banned users'
);

select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
select throws_ok(
  $$select public.cast_vote('10000000-0000-0000-0000-000000000006')$$,
  'VOT04',
  'votes require an approved viewer',
  'cast_vote rejects non-approved viewers'
);

select set_config('request.jwt.claim.sub', '', false);
select throws_ok(
  $$select public.revoke_vote('10000000-0000-0000-0000-000000000001')$$,
  'VOT01',
  'vote requires an authenticated user',
  'revoke_vote rejects anonymous users with a typed error'
);

select set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', false);
select throws_ok(
  $$select public.revoke_vote('10000000-0000-0000-0000-000000000001')$$,
  'VOT02',
  'vote requires a Google or GitHub identity',
  'revoke_vote rejects users without a supported identity'
);

select set_config('request.jwt.claim.sub', '44444444-4444-4444-4444-444444444444', false);
select throws_ok(
  $$select public.revoke_vote('10000000-0000-0000-0000-000000000001')$$,
  'VOT03',
  'banned voters cannot vote',
  'revoke_vote rejects banned users'
);

select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
select throws_ok(
  $$select public.revoke_vote('10000000-0000-0000-0000-000000000006')$$,
  'VOT04',
  'votes require an approved viewer',
  'revoke_vote rejects non-approved viewers'
);

select public.cast_vote('10000000-0000-0000-0000-000000000001');
select is((select count(*) from public.votes where user_id = '11111111-1111-1111-1111-111111111111' and submission_id = '10000000-0000-0000-0000-000000000001'), 1::bigint, 'cast_vote creates one vote');
create temporary table vote_observation as
  select created_at from public.votes
  where user_id = '11111111-1111-1111-1111-111111111111'
    and submission_id = '10000000-0000-0000-0000-000000000001';

select public.cast_vote('10000000-0000-0000-0000-000000000001');
select is((select count(*) from public.votes where user_id = '11111111-1111-1111-1111-111111111111' and submission_id = '10000000-0000-0000-0000-000000000001'), 1::bigint, 'casting twice remains one vote');
select is((select created_at from public.votes where user_id = '11111111-1111-1111-1111-111111111111' and submission_id = '10000000-0000-0000-0000-000000000001'), (select created_at from vote_observation), 'casting twice preserves created_at');

select public.revoke_vote('10000000-0000-0000-0000-000000000001');
select ok((select revoked_at is not null from public.votes where user_id = '11111111-1111-1111-1111-111111111111' and submission_id = '10000000-0000-0000-0000-000000000001'), 'revoke_vote records revoked_at');
select public.cast_vote('10000000-0000-0000-0000-000000000001');
select ok((select revoked_at is null from public.votes where user_id = '11111111-1111-1111-1111-111111111111' and submission_id = '10000000-0000-0000-0000-000000000001'), 'casting again clears revoked_at');
select is((select created_at from public.votes where user_id = '11111111-1111-1111-1111-111111111111' and submission_id = '10000000-0000-0000-0000-000000000001'), (select created_at from vote_observation), 'revoking and casting preserves created_at');

do $$
begin
  for i in 1..26 loop
    perform public.cast_vote('10000000-0000-0000-0000-000000000001');
  end loop;
end;
$$;
select throws_ok(
  $$select public.cast_vote('10000000-0000-0000-0000-000000000001')$$,
  'VOT05',
  'vote operation rate limit exceeded',
  'vote operations are limited to 30 per minute per user'
);

select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false);
do $$
begin
  for i in 1..30 loop
    perform public.revoke_vote('10000000-0000-0000-0000-000000000001');
  end loop;
end;
$$;
select throws_ok(
  $$select public.revoke_vote('10000000-0000-0000-0000-000000000001')$$,
  'VOT05',
  'vote operation rate limit exceeded',
  'revoke operations are limited to 30 per minute per user'
);

select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);

select is((select count(*) from public.my_votes()), 5::bigint, 'my_votes returns active vote ids for the logged-in user');
select is((select count(*) from public.ranking()), 5::bigint, 'ranking returns approved viewers only');
select is((select total_votes from public.ranking() where submission_id = '10000000-0000-0000-0000-000000000002'), 3::bigint, 'ranking counts valid total votes');
select is((select month_votes from public.ranking() where submission_id = '10000000-0000-0000-0000-000000000001'), 1::bigint, 'ranking counts votes in the Sao Paulo month');
select ok(pg_get_function_result('public.ranking()'::regprocedure) not like '%user_id%', 'ranking does not expose user_id');
update public.votes
set voided_at = now()
where submission_id = '10000000-0000-0000-0000-000000000005';
select is((select total_votes from public.ranking() where submission_id = '10000000-0000-0000-0000-000000000005'), 0::bigint, 'ranking excludes voided votes');

select set_config('request.jwt.claim.sub', '', false);
select throws_ok(
  $$select public.snapshot_month((date_trunc('month', timezone('America/Sao_Paulo', now())))::date - 1)$$,
  'VOT06',
  'snapshot month must be the first day of a month',
  'snapshot_month rejects non-first-day months'
);
select throws_ok(
  $$select public.snapshot_month((date_trunc('month', timezone('America/Sao_Paulo', now())))::date)$$,
  'VOT07',
  'snapshot month is not closed',
  'snapshot_month rejects the current month'
);

select public.snapshot_month((date_trunc('month', timezone('America/Sao_Paulo', now())) - interval '1 month')::date);
select is((select count(*) from public.monthly_highlights), 3::bigint, 'snapshot_month stores the top three');
select is((select submission_id from public.monthly_highlights where rank = 1), '10000000-0000-0000-0000-000000000002'::uuid, 'snapshot rank one has the most votes');
select is((select submission_id from public.monthly_highlights where rank = 2), '10000000-0000-0000-0000-000000000004'::uuid, 'snapshot breaks ties by newer approval');
select is((select votes from public.monthly_highlights where rank = 1), 3, 'snapshot stores the vote count');

alter table public.submissions disable trigger submissions_guard_edit;
update public.submissions
set name = 'Changed after snapshot'
where id = '10000000-0000-0000-0000-000000000002';
alter table public.submissions enable trigger submissions_guard_edit;
select public.snapshot_month((date_trunc('month', timezone('America/Sao_Paulo', now())) - interval '1 month')::date);
select is((select count(*) from public.monthly_highlights), 3::bigint, 'repeating a snapshot does not duplicate rows');
select is((select name from public.monthly_highlights where rank = 1), 'Snapshot one', 'repeating a snapshot does not alter rows');

select * from finish();
rollback;
