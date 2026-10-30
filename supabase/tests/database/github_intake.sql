begin;

select plan(23);

select has_function('public'::name, 'intake_github_issue'::name, array['integer'::name, 'text'::name, 'jsonb'::name]);
select has_function('public'::name, 'claim_github_submissions'::name, array[]::name[]);
select ok((select prosecdef from pg_proc where oid = 'public.intake_github_issue(integer,text,jsonb)'::regprocedure), 'GitHub intake is security definer');
select ok((select prosecdef from pg_proc where oid = 'public.claim_github_submissions()'::regprocedure), 'GitHub claim is security definer');
select is(has_function_privilege('anon', 'public.intake_github_issue(integer,text,jsonb)', 'EXECUTE'), false, 'anon cannot call GitHub intake');
select is(has_function_privilege('authenticated', 'public.claim_github_submissions()', 'EXECUTE'), true, 'authenticated can claim GitHub submissions');

insert into auth.users (id, aud, role, email)
values ('99999999-9999-9999-9999-999999999999', 'authenticated', 'authenticated', 'github-intake@example.test');
insert into auth.identities (id, user_id, provider_id, identity_data, provider)
values (
  '99999999-9999-9999-9999-999999999998',
  '99999999-9999-9999-9999-999999999999',
  'github-intake-user',
  '{"sub":"github-intake-user"}',
  'github'
);

select ok(public.intake_github_issue(
  1001,
  'github-intake-user',
  '{"name":"Viewer de issue","tagline":"Uma frase","differential":"Um diferencial","lang":"pt","platforms":["web"],"workflow_parts":["viewer"],"requires_install":false,"repo_url":"https://github.com/example/viewer","license":"MIT","base_tech":"scratch","data_source":"Dados sintéticos","data_license":"CC0","external_api":false,"demo_url":"https://example.com/demo","rules_accepted":true}'::jsonb
) is not null, 'intake creates a submission');

select is((select count(*) from public.submissions where github_issue_number = 1001), 1::bigint, 'intake creates one row per issue');
select is((select status from public.submissions where github_issue_number = 1001), 'draft', 'intake creates a draft');
select is((select owner_id from public.submissions where github_issue_number = 1001), null::uuid, 'intake leaves the draft unowned');
select is((select source from public.submissions where github_issue_number = 1001), 'github', 'intake records the GitHub source');
select is((select name from public.submissions where github_issue_number = 1001), 'Viewer de issue', 'intake stores the issue fields');
select is((select count(*) from public.submission_events where submission_id = (select id from public.submissions where github_issue_number = 1001)), 1::bigint, 'intake records one draft event');

select public.intake_github_issue(
  1001,
  'changed-github-user',
  '{"name":"Viewer editado","tagline":"Outra frase","differential":"Outro diferencial","lang":"pt","platforms":["web"],"workflow_parts":["viewer"],"requires_install":false,"repo_url":"https://github.com/example/viewer","license":"MIT","base_tech":"scratch","data_source":"Dados sintéticos","data_license":"CC0","external_api":false,"demo_url":"https://example.com/demo","rules_accepted":true}'::jsonb
);

select is((select count(*) from public.submissions where github_issue_number = 1001), 1::bigint, 'replaying an issue does not duplicate the row');
select is((select count(*) from public.submission_events where submission_id = (select id from public.submissions where github_issue_number = 1001)), 1::bigint, 'replaying an issue does not duplicate the event');
select is((select name from public.submissions where github_issue_number = 1001), 'Viewer editado', 'editing an unowned draft updates its fields');
select is((select github_user_id from public.submissions where github_issue_number = 1001), 'github-intake-user', 'GitHub user id is immutable');

update public.submissions set status = 'pending' where github_issue_number = 1001;
select public.intake_github_issue(1001, 'github-intake-user', '{"name":"Não deve mudar"}'::jsonb);
select is((select name from public.submissions where github_issue_number = 1001), 'Viewer editado', 'intake does not change a non-draft submission');

update public.submissions set status = 'draft', owner_id = '99999999-9999-9999-9999-999999999999' where github_issue_number = 1001;
select public.intake_github_issue(1001, 'github-intake-user', '{"name":"Também não deve mudar"}'::jsonb);
select is((select name from public.submissions where github_issue_number = 1001), 'Viewer editado', 'intake does not change an owned draft');

select public.intake_github_issue(
  1002,
  'github-intake-user',
  '{"name":"Claim me","tagline":"Uma frase","differential":"Um diferencial","lang":"pt","platforms":["web"],"workflow_parts":["viewer"],"requires_install":false,"repo_url":"https://github.com/example/claim","license":"MIT","base_tech":"scratch","data_source":"Dados sintéticos","data_license":"CC0","external_api":false,"demo_url":"https://example.com/demo","rules_accepted":true}'::jsonb
);
select set_config('request.jwt.claim.sub', '99999999-9999-9999-9999-999999999999', false);
select is(public.claim_github_submissions(), 1, 'claim assigns matching GitHub drafts');
select is((select owner_id from public.submissions where github_issue_number = 1002), '99999999-9999-9999-9999-999999999999'::uuid, 'claim assigns the logged-in user');
select is((select status from public.submissions where github_issue_number = 1002), 'draft', 'claim keeps the draft status');
select is((select slug from public.submissions where github_issue_number = 1002), 'claim-me', 'claim generates the slug');

select * from finish();
rollback;
