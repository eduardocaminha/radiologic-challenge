begin;

select plan(9);

insert into public.submission_events (kind, detail, created_at)
values
  ('vote_voided', '{"marker":"antigo"}', pg_catalog.now() - interval '13 months'),
  ('vote_voided', '{"marker":"recente"}', pg_catalog.now() - interval '11 months');

select is(has_function_privilege('anon', 'public.purge_expired_events()', 'EXECUTE'), false, 'anon cannot purge events');
select is(has_function_privilege('authenticated', 'public.purge_expired_events()', 'EXECUTE'), false, 'authenticated cannot purge events');
select is((select schedule from cron.job where jobname = 'radiologic-challenge-event-purge'), '0 4 * * *', 'purge runs every day');

select throws_ok($$delete from public.submission_events where detail ->> 'marker' = 'antigo'$$, 'SUB31', null, 'an old event still cannot be deleted directly');
select set_config('radiologic.event_retention', 'on', true);
select throws_ok($$delete from public.submission_events where detail ->> 'marker' = 'recente'$$, 'SUB31', null, 'the exception never reaches a recent event');
select set_config('radiologic.event_retention', 'off', true);

select is(public.purge_expired_events(), 1, 'purge deletes only expired events');
select is((select count(*) from public.submission_events where detail ->> 'marker' = 'antigo'), 0::bigint, 'the expired event is gone');
select is((select count(*) from public.submission_events where detail ->> 'marker' = 'recente'), 1::bigint, 'the recent event stays');
select is(pg_catalog.current_setting('radiologic.event_retention', true), 'off', 'purge closes the exception');

select * from finish();
rollback;
