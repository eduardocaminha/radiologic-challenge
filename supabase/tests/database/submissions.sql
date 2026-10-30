begin;

select plan(52);

create extension if not exists dblink;

select has_function('public'::name, 'create_submission'::name, array['text'::name]);
select has_function('public'::name, 'update_submission'::name, array['uuid'::name, 'jsonb'::name]);
select has_function('public'::name, 'submit_submission'::name, array['uuid'::name]);
select has_function('public'::name, 'resubmit_submission'::name, array['uuid'::name]);
select has_function('public'::name, 'delete_submission'::name, array['uuid'::name]);
select has_function('public'::name, 'moderate_submission'::name, array['uuid'::name, 'text'::name, 'text'::name, 'text'::name]);
select has_function('public'::name, 'get_submission'::name, array['text'::name]);
select has_function('public'::name, 'my_submissions'::name, array[]::name[]);

select ok((select prosecdef from pg_proc where oid = 'public.create_submission(text)'::regprocedure), 'create_submission is security definer');
select ok((select prosecdef from pg_proc where oid = 'public.moderate_submission(uuid,text,text,text)'::regprocedure), 'moderate_submission is security definer');
select ok((select replace(replace(coalesce(proconfig[1], ''), 'search_path=', ''), chr(34), '') = '' from pg_proc where oid = 'public.create_submission(text)'::regprocedure), 'create_submission has an empty search_path');
select is(has_function_privilege('anon', 'public.create_submission(text)', 'EXECUTE'), false, 'anon cannot create submissions');
select is(has_function_privilege('authenticated', 'public.create_submission(text)', 'EXECUTE'), true, 'authenticated can create submissions');
select is(has_function_privilege('anon', 'public.get_submission(text)', 'EXECUTE'), true, 'anon can read an approved submission');
select is(has_function_privilege('authenticated', 'public.my_submissions()', 'EXECUTE'), true, 'authenticated can read own submissions');

insert into auth.users (id, aud, role, email)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'authenticated', 'authenticated', 'owner@example.test'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'authenticated', 'authenticated', 'other@example.test'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'authenticated', 'authenticated', 'admin@example.test');
insert into auth.identities (id, user_id, provider_id, identity_data, provider)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'owner', '{"sub":"owner"}', 'github'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'other', '{"sub":"other"}', 'google'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'admin', '{"sub":"admin"}', 'github');
insert into public.admins (user_id) values ('cccccccc-cccc-cccc-cccc-cccccccccccc');

select set_config('request.jwt.claim.sub', '', false);
select throws_ok($$select public.create_submission('Viewer')$$, 'SUB01', 'submission requires an authenticated user', 'create_submission requires authentication');

select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', false);
select ok(public.create_submission('Viewer Ágil') is not null, 'create_submission returns the created id');
select is((select slug from public.submissions where name = 'Viewer Ágil'), 'viewer-agil', 'create_submission derives an accent-free slug');
select is((select status from public.submissions where name = 'Viewer Ágil'), 'draft', 'create_submission creates a draft');
select is((select count(*) from public.submission_events where kind = 'state_transition' and detail->>'to' = 'draft'), 1::bigint, 'create_submission records the draft event');
select ok(public.create_submission('---') is not null, 'create_submission accepts punctuation-only names');
select is((select slug from public.submissions where name = '---'), 'viewer', 'punctuation-only names use the viewer slug fallback');
select public.delete_submission((select id from public.submissions where name = '---'));
select ok(public.create_submission('Foo') is not null, 'create_submission creates the first slug collision candidate');
select ok(public.create_submission('Foo 2') is not null, 'create_submission creates a suffixed slug collision candidate');
select is((select slug from public.submissions where name = 'Foo'), 'foo', 'create_submission keeps the base slug');
select is((select slug from public.submissions where name = 'Foo 2'), 'foo-2', 'create_submission chooses the next unique suffix');
select public.delete_submission((select id from public.submissions where name = 'Foo'));
select public.delete_submission((select id from public.submissions where name = 'Foo 2'));

select set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', false);
select throws_ok($$select public.update_submission((select id from public.submissions where name = 'Viewer Ágil'), '{"name":"Other"}'::jsonb)$$, 'SUB05', 'only the submission owner can update it', 'update_submission rejects another owner');
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', false);
select public.update_submission((select id from public.submissions where name = 'Viewer Ágil'), '{"tagline":"Tagline","description":"Description","differential":"Different","lang":"pt","platforms":["web"],"requires_install":false,"repo_url":"https://example.test/repo","license":"MIT","base_tech":"scratch","data_source":"Synthetic","data_license":"CC0","external_api":false,"rules_version":"1","rules_accepted_at":"2026-10-11T12:00:00Z"}'::jsonb);
select ok((select tagline = 'Tagline' and demo_url is null from public.submissions where name = 'Viewer Ágil'), 'update_submission updates owner fields');
select throws_ok($$select public.submit_submission((select id from public.submissions where name = 'Viewer Ágil'))$$, 'SUB08', 'submission form is incomplete', 'submit_submission checks the complete required form');
select public.update_submission((select id from public.submissions where name = 'Viewer Ágil'), '{"demo_url":"https://example.test/demo"}'::jsonb);
insert into public.screenshots (submission_id, path, status, position)
values ((select id from public.submissions where name = 'Viewer Ágil'), 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/00000000-0000-0000-0000-000000000001/00000000-0000-0000-0000-000000000001.png', 'pending', 1);
select public.submit_submission((select id from public.submissions where name = 'Viewer Ágil'));
select is((select status from public.submissions where name = 'Viewer Ágil'), 'pending', 'submit_submission moves draft to pending');

select set_config('request.jwt.claim.sub', 'cccccccc-cccc-cccc-cccc-cccccccccccc', false);
update public.screenshots
set status = 'approved'
where submission_id = (select id from public.submissions where name = 'Viewer Ágil');
select throws_ok($$select public.moderate_submission((select id from public.submissions where name = 'Viewer Ágil'), 'reject', 'pending', null)$$, 'SUB22', 'rejection reason is required and must be at most 500 characters', 'moderation requires a rejection reason');
select public.moderate_submission((select id from public.submissions where name = 'Viewer Ágil'), 'reject', 'pending', 'Needs a clearer demo');
select is((select status from public.submissions where name = 'Viewer Ágil'), 'rejected', 'moderate_submission rejects a pending submission');
select is((select rejection_reason from public.submissions where name = 'Viewer Ágil'), 'Needs a clearer demo', 'moderate_submission stores the rejection reason');
select public.moderate_submission((select id from public.submissions where name = 'Viewer Ágil'), 'reject', 'rejected', 'ignored');
select is((select count(*) from public.submission_events where submission_id = (select id from public.submissions where name = 'Viewer Ágil') and kind = 'state_transition' and detail->>'to' = 'rejected'), 1::bigint, 'repeating moderation is a no-op without a duplicate event');

select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', false);
select public.resubmit_submission((select id from public.submissions where name = 'Viewer Ágil'));
select is((select status from public.submissions where name = 'Viewer Ágil'), 'pending', 'resubmit_submission moves rejected to pending');
select set_config('request.jwt.claim.sub', 'cccccccc-cccc-cccc-cccc-cccccccccccc', false);
select public.moderate_submission((select id from public.submissions where name = 'Viewer Ágil'), 'approve', 'pending', null);
select is((select status from public.submissions where name = 'Viewer Ágil'), 'approved', 'moderate_submission approves a pending submission');
select is((select count(*) from public.get_submission('viewer-agil')), 1::bigint, 'get_submission returns approved viewers by slug');
select public.moderate_submission((select id from public.submissions where name = 'Viewer Ágil'), 'remove', 'approved', null);
select throws_ok($$update public.submissions set slug = 'changed-after-approval' where name = 'Viewer Ágil'$$, 'SUB30', 'approved submission slugs are immutable', 'approved submission slugs remain immutable while removed');
select public.moderate_submission((select id from public.submissions where name = 'Viewer Ágil'), 'restore', 'removed', null);
select is((select status from public.submissions where name = 'Viewer Ágil'), 'approved', 'moderation restores a removed submission');
select public.moderate_submission((select id from public.submissions where name = 'Viewer Ágil'), 'remove', 'approved', null);
select public.moderate_submission((select id from public.submissions where name = 'Viewer Ágil'), 'approve', 'pending', null);
select is((select status from public.submissions where name = 'Viewer Ágil'), 'removed', 'stale moderation does not restore a removed submission');
select is((select count(*) from public.submission_events where submission_id = (select id from public.submissions where name = 'Viewer Ágil') and kind = 'state_transition' and detail->>'to' = 'removed'), 2::bigint, 'stale moderation does not create a duplicate event');
select public.moderate_submission((select id from public.submissions where name = 'Viewer Ágil'), 'restore', 'removed', null);

select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', false);
select public.update_submission((select id from public.submissions where name = 'Viewer Ágil'), '{"demo_url":"https://example.test/new-demo","repo_url":"https://example.test/new-repo","prompts_url":"https://example.test/prompts"}'::jsonb);
select is((select count(*) from public.submission_events where submission_id = (select id from public.submissions where name = 'Viewer Ágil') and kind = 'approved_url_changed'), 1::bigint, 'approved URL changes record an event');
select ok((select detail ? 'demo_url' and detail ? 'repo_url' and detail ? 'prompts_url' from public.submission_events where submission_id = (select id from public.submissions where name = 'Viewer Ágil') and kind = 'approved_url_changed'), 'approved URL changes include all changed URL fields');
select throws_ok($$update public.submission_events set detail = '{"changed":true}'::jsonb where submission_id = (select id from public.submissions where name = 'Viewer Ágil')$$, 'SUB31', 'submission events are append-only', 'submission events reject updates');
select is(has_table_privilege('authenticated', 'public.submission_events', 'DELETE'), false, 'authenticated cannot delete submission events');

select dblink_connect(
  'submission-concurrency',
  'host=' || host(inet_server_addr()) || ' port=' || inet_server_port() || ' user=postgres password=postgres dbname=postgres'
);
select dblink_exec('submission-concurrency', $$insert into auth.users (id, aud, role, email) values ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'authenticated', 'authenticated', 'concurrent-admin@example.test')$$);
select dblink_exec('submission-concurrency', $$insert into auth.identities (id, user_id, provider_id, identity_data, provider) values ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'concurrent-admin', '{"sub":"concurrent-admin"}', 'github')$$);
select dblink_exec('submission-concurrency', $$insert into public.admins (user_id) values ('dddddddd-dddd-dddd-dddd-dddddddddddd')$$);
select dblink_exec('submission-concurrency', $$insert into public.submissions (id, slug, status, source, name) values ('30000000-0000-0000-0000-000000000001', 'concurrent-viewer', 'pending', 'form', 'Concurrent viewer')$$);
select dblink_exec('submission-concurrency', $$insert into public.screenshots (submission_id, path, status, position) values ('30000000-0000-0000-0000-000000000001', 'dddddddd-dddd-dddd-dddd-dddddddddddd/30000000-0000-0000-0000-000000000001/30000000-0000-0000-0000-000000000001.png', 'approved', 1)$$);
select dblink_connect(
  'submission-moderator',
  'host=' || host(inet_server_addr()) || ' port=' || inet_server_port() || ' user=postgres password=postgres dbname=postgres'
);
select is(
  dblink_send_query(
    'submission-concurrency',
    $$do $block$
    begin
      perform set_config('request.jwt.claim.sub', 'dddddddd-dddd-dddd-dddd-dddddddddddd', false);
      perform (select 1 from public.submissions where id = '30000000-0000-0000-0000-000000000001' for update);
      perform pg_sleep(1);
      perform public.moderate_submission('30000000-0000-0000-0000-000000000001', 'approve', 'pending', null);
    end
    $block$;$$
  ),
  1,
  'first concurrent moderation starts asynchronously'
);
select pg_sleep(0.1);
select is(
  dblink_send_query(
    'submission-moderator',
    $$do $block$
    begin
      perform set_config('request.jwt.claim.sub', 'dddddddd-dddd-dddd-dddd-dddddddddddd', false);
      perform public.moderate_submission('30000000-0000-0000-0000-000000000001', 'approve', 'pending', null);
    end
    $block$;$$
  ),
  1,
  'second concurrent moderation starts asynchronously'
);
select * from dblink_get_result('submission-concurrency') as result(message text);
select * from dblink_get_result('submission-moderator') as result(message text);
select is((select status from public.submissions where id = '30000000-0000-0000-0000-000000000001'), 'approved', 'concurrent moderation leaves one approved transition');
select is((select count(*) from public.submission_events where submission_id = '30000000-0000-0000-0000-000000000001'), 1::bigint, 'concurrent moderation records one event');
select dblink_connect(
  'submission-cleanup',
  'host=' || host(inet_server_addr()) || ' port=' || inet_server_port() || ' user=postgres password=postgres dbname=postgres'
);
select dblink_exec('submission-cleanup', $$delete from public.submissions where id = '30000000-0000-0000-0000-000000000001'$$);
select dblink_exec('submission-cleanup', $$delete from auth.users where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'$$);
select dblink_disconnect('submission-cleanup');
select dblink_disconnect('submission-concurrency');
select dblink_disconnect('submission-moderator');

select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', false);
select public.create_submission('Second');
select public.create_submission('Third');
select public.create_submission('Fourth');
select throws_ok($$select public.create_submission('Fifth')$$, 'SUB03', 'submission draft or pending limit reached', 'create_submission enforces the draft or pending limit');
select set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', false);
select throws_ok($$select public.delete_submission((select id from public.submissions where name = 'Viewer Ágil'))$$, 'SUB05', 'only the submission owner can delete it', 'delete_submission rejects another owner');
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', false);
select public.delete_submission((select id from public.submissions where name = 'Viewer Ágil'));
select is((select count(*) from public.submissions where name = 'Viewer Ágil'), 0::bigint, 'delete_submission deletes the owner submission');

select * from finish();
rollback;
