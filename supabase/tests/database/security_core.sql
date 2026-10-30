begin;

select plan(12);

insert into auth.users (id, aud, role, email)
values ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'authenticated', 'authenticated', 'dono@example.test');

insert into public.submissions (
  id, status, source, owner_id, slug, name, tagline, description, differential, lang, platforms, workflow_parts,
  requires_install, repo_url, license, base_tech, data_source, data_license, external_api, demo_url,
  rules_version, rules_accepted_at, approved_at
)
values
  ('dddddddd-dddd-dddd-dddd-dddddddddd01', 'approved', 'form', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'aprovado', 'Aprovado', 'Frase', 'Descrição', 'Diferencial', 'pt', array['web'], array['viewer'], false, 'https://example.test/repo', 'MIT', 'scratch', 'Dados', 'CC0', false, 'https://example.test/demo', '1', now(), now()),
  ('dddddddd-dddd-dddd-dddd-dddddddddd02', 'removed', 'form', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'removido', 'Removido', 'Frase', 'Descrição', 'Diferencial', 'pt', array['web'], array['viewer'], false, 'https://example.test/repo', 'MIT', 'scratch', 'Dados', 'CC0', false, 'https://example.test/demo', '1', now(), now());

insert into public.screenshots (submission_id, path, status, position)
values ('dddddddd-dddd-dddd-dddd-dddddddddd01', 'fixture/aprovado.png', 'approved', 1);

select set_config('request.jwt.claim.sub', 'cccccccc-cccc-cccc-cccc-cccccccccccc', false);

select throws_ok($$select public.update_submission('dddddddd-dddd-dddd-dddd-dddddddddd01', '{"name":null}'::jsonb)$$, 'SUB11', null, 'approved submission keeps the name');
select throws_ok($$select public.update_submission('dddddddd-dddd-dddd-dddd-dddddddddd01', '{"repo_url":null}'::jsonb)$$, 'SUB11', null, 'approved submission keeps the repository');
select throws_ok($$select public.update_submission('dddddddd-dddd-dddd-dddd-dddddddddd01', '{"platforms":null}'::jsonb)$$, 'SUB11', null, 'approved submission keeps the platforms');
select throws_ok($$select public.update_submission('dddddddd-dddd-dddd-dddd-dddddddddd02', '{"tagline":"Outra"}'::jsonb)$$, 'SUB10', null, 'removed submission cannot be edited');

select public.update_submission('dddddddd-dddd-dddd-dddd-dddddddddd01', '{"tagline":"Outra frase"}'::jsonb);
select is(
  (select detail -> 'fields' from public.submission_events where kind = 'approved_content_changed'),
  '["tagline"]'::jsonb,
  'approved edit records the changed fields'
);
select is(
  (public.get_moderation_digest(current_date) ->> 'changes_count')::integer,
  1,
  'digest counts approved submissions that changed'
);
select is(
  (public.get_moderation_digest(current_date) ->> 'should_send')::boolean,
  true,
  'digest is sent for a change even without pending items'
);

select public.record_moderation_digest_send(current_date, 'chave', 0, 0);
select is(
  (public.get_moderation_digest(current_date) ->> 'changes_count')::integer,
  0,
  'digest does not repeat changes already sent'
);

select throws_ok(
  format($$select public.update_submission('dddddddd-dddd-dddd-dddd-dddddddddd01', %L::jsonb)$$, jsonb_build_object('ai_tools', jsonb_build_array(jsonb_build_object('name', repeat('a', 81))))),
  '23514',
  null,
  'ai_tools rejects long names'
);
select throws_ok(
  $$select public.update_submission('dddddddd-dddd-dddd-dddd-dddddddddd01', '{"ai_tools":[{"name":"Claude","extra":"x"}]}'::jsonb)$$,
  '23514',
  null,
  'ai_tools rejects unknown keys'
);
select lives_ok(
  $$select public.update_submission('dddddddd-dddd-dddd-dddd-dddddddddd01', '{"ai_tools":[{"name":"Claude","version":"5"}]}'::jsonb)$$,
  'ai_tools accepts the expected shape'
);
select is(
  public.submission_is_complete(s) ,
  false,
  'a submission without slug is not complete'
)
from (select (r).* from (select jsonb_populate_record(t, '{"slug":null}'::jsonb) as r from public.submissions as t where t.slug = 'aprovado') as q) as s;

select * from finish();
rollback;
