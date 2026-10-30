begin;

select plan(84);

select has_table('public'::name, 'submissions'::name);
select is((select relrowsecurity from pg_class where oid = 'public.submissions'::regclass), true, 'submissions has RLS enabled');
select is(has_table_privilege('anon', 'public.submissions', 'SELECT'), false, 'anon cannot select submissions');
select is(has_table_privilege('anon', 'public.submissions', 'INSERT'), false, 'anon cannot insert submissions');
select is(has_table_privilege('anon', 'public.submissions', 'UPDATE'), false, 'anon cannot update submissions');
select is(has_table_privilege('anon', 'public.submissions', 'DELETE'), false, 'anon cannot delete submissions');
select is(has_table_privilege('anon', 'public.submissions', 'TRUNCATE'), false, 'anon cannot truncate submissions');
select is(has_table_privilege('authenticated', 'public.submissions', 'SELECT'), false, 'authenticated cannot select submissions');
select is(has_table_privilege('authenticated', 'public.submissions', 'INSERT'), false, 'authenticated cannot insert submissions');
select is(has_table_privilege('authenticated', 'public.submissions', 'UPDATE'), false, 'authenticated cannot update submissions');
select is(has_table_privilege('authenticated', 'public.submissions', 'DELETE'), false, 'authenticated cannot delete submissions');
select is(has_table_privilege('authenticated', 'public.submissions', 'TRUNCATE'), false, 'authenticated cannot truncate submissions');

select has_table('public'::name, 'screenshots'::name);
select is((select relrowsecurity from pg_class where oid = 'public.screenshots'::regclass), true, 'screenshots has RLS enabled');
select is(has_table_privilege('anon', 'public.screenshots', 'SELECT'), false, 'anon cannot select screenshots');
select is(has_table_privilege('anon', 'public.screenshots', 'INSERT'), false, 'anon cannot insert screenshots');
select is(has_table_privilege('anon', 'public.screenshots', 'UPDATE'), false, 'anon cannot update screenshots');
select is(has_table_privilege('anon', 'public.screenshots', 'DELETE'), false, 'anon cannot delete screenshots');
select is(has_table_privilege('anon', 'public.screenshots', 'TRUNCATE'), false, 'anon cannot truncate screenshots');
select is(has_table_privilege('authenticated', 'public.screenshots', 'SELECT'), false, 'authenticated cannot select screenshots');
select is(has_table_privilege('authenticated', 'public.screenshots', 'INSERT'), false, 'authenticated cannot insert screenshots');
select is(has_table_privilege('authenticated', 'public.screenshots', 'UPDATE'), false, 'authenticated cannot update screenshots');
select is(has_table_privilege('authenticated', 'public.screenshots', 'DELETE'), false, 'authenticated cannot delete screenshots');
select is(has_table_privilege('authenticated', 'public.screenshots', 'TRUNCATE'), false, 'authenticated cannot truncate screenshots');

select has_table('public'::name, 'votes'::name);
select is((select relrowsecurity from pg_class where oid = 'public.votes'::regclass), true, 'votes has RLS enabled');
select is(has_table_privilege('anon', 'public.votes', 'SELECT'), false, 'anon cannot select votes');
select is(has_table_privilege('anon', 'public.votes', 'INSERT'), false, 'anon cannot insert votes');
select is(has_table_privilege('anon', 'public.votes', 'UPDATE'), false, 'anon cannot update votes');
select is(has_table_privilege('anon', 'public.votes', 'DELETE'), false, 'anon cannot delete votes');
select is(has_table_privilege('anon', 'public.votes', 'TRUNCATE'), false, 'anon cannot truncate votes');
select is(has_table_privilege('authenticated', 'public.votes', 'SELECT'), false, 'authenticated cannot select votes');
select is(has_table_privilege('authenticated', 'public.votes', 'INSERT'), false, 'authenticated cannot insert votes');
select is(has_table_privilege('authenticated', 'public.votes', 'UPDATE'), false, 'authenticated cannot update votes');
select is(has_table_privilege('authenticated', 'public.votes', 'DELETE'), false, 'authenticated cannot delete votes');
select is(has_table_privilege('authenticated', 'public.votes', 'TRUNCATE'), false, 'authenticated cannot truncate votes');

select has_table('public'::name, 'monthly_highlights'::name);
select is((select relrowsecurity from pg_class where oid = 'public.monthly_highlights'::regclass), true, 'monthly_highlights has RLS enabled');
select is(has_table_privilege('anon', 'public.monthly_highlights', 'SELECT'), false, 'anon cannot select monthly_highlights');
select is(has_table_privilege('anon', 'public.monthly_highlights', 'INSERT'), false, 'anon cannot insert monthly_highlights');
select is(has_table_privilege('anon', 'public.monthly_highlights', 'UPDATE'), false, 'anon cannot update monthly_highlights');
select is(has_table_privilege('anon', 'public.monthly_highlights', 'DELETE'), false, 'anon cannot delete monthly_highlights');
select is(has_table_privilege('anon', 'public.monthly_highlights', 'TRUNCATE'), false, 'anon cannot truncate monthly_highlights');
select is(has_table_privilege('authenticated', 'public.monthly_highlights', 'SELECT'), false, 'authenticated cannot select monthly_highlights');
select is(has_table_privilege('authenticated', 'public.monthly_highlights', 'INSERT'), false, 'authenticated cannot insert monthly_highlights');
select is(has_table_privilege('authenticated', 'public.monthly_highlights', 'UPDATE'), false, 'authenticated cannot update monthly_highlights');
select is(has_table_privilege('authenticated', 'public.monthly_highlights', 'DELETE'), false, 'authenticated cannot delete monthly_highlights');
select is(has_table_privilege('authenticated', 'public.monthly_highlights', 'TRUNCATE'), false, 'authenticated cannot truncate monthly_highlights');

select has_table('public'::name, 'admins'::name);
select is((select relrowsecurity from pg_class where oid = 'public.admins'::regclass), true, 'admins has RLS enabled');
select is(has_table_privilege('anon', 'public.admins', 'SELECT'), false, 'anon cannot select admins');
select is(has_table_privilege('anon', 'public.admins', 'INSERT'), false, 'anon cannot insert admins');
select is(has_table_privilege('anon', 'public.admins', 'UPDATE'), false, 'anon cannot update admins');
select is(has_table_privilege('anon', 'public.admins', 'DELETE'), false, 'anon cannot delete admins');
select is(has_table_privilege('anon', 'public.admins', 'TRUNCATE'), false, 'anon cannot truncate admins');
select is(has_table_privilege('authenticated', 'public.admins', 'SELECT'), false, 'authenticated cannot select admins');
select is(has_table_privilege('authenticated', 'public.admins', 'INSERT'), false, 'authenticated cannot insert admins');
select is(has_table_privilege('authenticated', 'public.admins', 'UPDATE'), false, 'authenticated cannot update admins');
select is(has_table_privilege('authenticated', 'public.admins', 'DELETE'), false, 'authenticated cannot delete admins');
select is(has_table_privilege('authenticated', 'public.admins', 'TRUNCATE'), false, 'authenticated cannot truncate admins');

select has_table('public'::name, 'banned_voters'::name);
select is((select relrowsecurity from pg_class where oid = 'public.banned_voters'::regclass), true, 'banned_voters has RLS enabled');
select is(has_table_privilege('anon', 'public.banned_voters', 'SELECT'), false, 'anon cannot select banned_voters');
select is(has_table_privilege('anon', 'public.banned_voters', 'INSERT'), false, 'anon cannot insert banned_voters');
select is(has_table_privilege('anon', 'public.banned_voters', 'UPDATE'), false, 'anon cannot update banned_voters');
select is(has_table_privilege('anon', 'public.banned_voters', 'DELETE'), false, 'anon cannot delete banned_voters');
select is(has_table_privilege('anon', 'public.banned_voters', 'TRUNCATE'), false, 'anon cannot truncate banned_voters');
select is(has_table_privilege('authenticated', 'public.banned_voters', 'SELECT'), false, 'authenticated cannot select banned_voters');
select is(has_table_privilege('authenticated', 'public.banned_voters', 'INSERT'), false, 'authenticated cannot insert banned_voters');
select is(has_table_privilege('authenticated', 'public.banned_voters', 'UPDATE'), false, 'authenticated cannot update banned_voters');
select is(has_table_privilege('authenticated', 'public.banned_voters', 'DELETE'), false, 'authenticated cannot delete banned_voters');
select is(has_table_privilege('authenticated', 'public.banned_voters', 'TRUNCATE'), false, 'authenticated cannot truncate banned_voters');

select has_table('public'::name, 'submission_events'::name);
select is((select relrowsecurity from pg_class where oid = 'public.submission_events'::regclass), true, 'submission_events has RLS enabled');
select is(has_table_privilege('anon', 'public.submission_events', 'SELECT'), false, 'anon cannot select submission_events');
select is(has_table_privilege('anon', 'public.submission_events', 'INSERT'), false, 'anon cannot insert submission_events');
select is(has_table_privilege('anon', 'public.submission_events', 'UPDATE'), false, 'anon cannot update submission_events');
select is(has_table_privilege('anon', 'public.submission_events', 'DELETE'), false, 'anon cannot delete submission_events');
select is(has_table_privilege('anon', 'public.submission_events', 'TRUNCATE'), false, 'anon cannot truncate submission_events');
select is(has_table_privilege('authenticated', 'public.submission_events', 'SELECT'), false, 'authenticated cannot select submission_events');
select is(has_table_privilege('authenticated', 'public.submission_events', 'INSERT'), false, 'authenticated cannot insert submission_events');
select is(has_table_privilege('authenticated', 'public.submission_events', 'UPDATE'), false, 'authenticated cannot update submission_events');
select is(has_table_privilege('authenticated', 'public.submission_events', 'DELETE'), false, 'authenticated cannot delete submission_events');
select is(has_table_privilege('authenticated', 'public.submission_events', 'TRUNCATE'), false, 'authenticated cannot truncate submission_events');

select * from finish();
rollback;
