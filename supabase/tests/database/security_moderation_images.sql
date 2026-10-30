begin;

select plan(25);

insert into auth.users (id, aud, role, email)
values
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'authenticated', 'authenticated', 'dono@example.test'),
  ('abababab-abab-abab-abab-abababababab', 'authenticated', 'authenticated', 'admin@example.test');
insert into public.admins (user_id) values ('abababab-abab-abab-abab-abababababab');

insert into public.submissions (
  id, status, source, owner_id, slug, name, tagline, description, differential, lang, platforms, workflow_parts,
  requires_install, repo_url, license, base_tech, data_source, data_license, external_api, demo_url,
  rules_version, rules_accepted_at, approved_at, updated_at
)
select id::uuid, status, 'form', 'cccccccc-cccc-cccc-cccc-cccccccccccc', slug, slug, 'Frase', 'Descrição', 'Diferencial', 'pt', array['web'], array['viewer'],
  false, 'https://example.test/repo', 'MIT', 'scratch', 'Dados', 'CC0', false, 'https://example.test/demo',
  '2020-01-01', '2020-01-01 00:00:00+00', case when status = 'pending' then null else pg_catalog.now() end, '2020-01-01 00:00:00+00'
from (values
  ('dddddddd-dddd-dddd-dddd-dddddddddd01', 'pending', 'pendente'),
  ('dddddddd-dddd-dddd-dddd-dddddddddd02', 'removed', 'removido'),
  ('dddddddd-dddd-dddd-dddd-dddddddddd03', 'approved', 'aprovado'),
  ('dddddddd-dddd-dddd-dddd-dddddddddd04', 'draft', 'rascunho')
) as fixture(id, status, slug);

insert into public.screenshots (id, submission_id, path, status, position)
values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'dddddddd-dddd-dddd-dddd-dddddddddd01', 'cccccccc-cccc-cccc-cccc-cccccccccccc/dddddddd-dddd-dddd-dddd-dddddddddd01/10000000-0000-0000-0000-000000000001.png', 'approved', 1),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'dddddddd-dddd-dddd-dddd-dddddddddd02', 'cccccccc-cccc-cccc-cccc-cccccccccccc/dddddddd-dddd-dddd-dddd-dddddddddd02/10000000-0000-0000-0000-000000000002.png', 'approved', 1),
  ('aaaaaaaa-0000-0000-0000-000000000003', 'dddddddd-dddd-dddd-dddd-dddddddddd03', 'cccccccc-cccc-cccc-cccc-cccccccccccc/dddddddd-dddd-dddd-dddd-dddddddddd03/10000000-0000-0000-0000-000000000003.png', 'approved', 1),
  ('aaaaaaaa-0000-0000-0000-000000000004', 'dddddddd-dddd-dddd-dddd-dddddddddd04', 'cccccccc-cccc-cccc-cccc-cccccccccccc/dddddddd-dddd-dddd-dddd-dddddddddd04/10000000-0000-0000-0000-000000000004.png', 'pending', 1);

insert into storage.objects (bucket_id, name)
select 'screenshots', path from public.screenshots;

select set_config('request.jwt.claim.sub', 'cccccccc-cccc-cccc-cccc-cccccccccccc', false);

-- rules_version vem do servidor
select public.update_submission('dddddddd-dddd-dddd-dddd-dddddddddd04', '{"rules_version":"1999-01-01","rules_accepted_at":"1999-01-01T00:00:00Z"}'::jsonb);
select is((select rules_version from public.submissions where slug = 'rascunho'), '2020-01-01', 'update ignores a rules version sent by the client');
select public.update_submission('dddddddd-dddd-dddd-dddd-dddddddddd04', '{"rules_accepted":true}'::jsonb);
select is((select rules_version from public.submissions where slug = 'rascunho'), public.current_rules_version(), 'accepting records the current version');
select ok((select rules_accepted_at > '2021-01-01' from public.submissions where slug = 'rascunho'), 'accepting records the server time');
update public.submissions set rules_accepted_at = '2022-02-02 00:00:00+00' where slug = 'rascunho';
select public.update_submission('dddddddd-dddd-dddd-dddd-dddddddddd04', '{"rules_accepted":true}'::jsonb);
select is((select rules_accepted_at from public.submissions where slug = 'rascunho'), '2022-02-02 00:00:00+00'::timestamptz, 'accepting the same version keeps the original date');
select public.update_submission('dddddddd-dddd-dddd-dddd-dddddddddd04', '{"rules_accepted":false}'::jsonb);
select is((select rules_version from public.submissions where slug = 'rascunho'), null, 'unchecking clears the acceptance');

-- caminho já registrado nunca falha em projeto removido, e o upload recusa substituí-lo
select is(
  (public.register_screenshot('dddddddd-dddd-dddd-dddd-dddddddddd02', 'cccccccc-cccc-cccc-cccc-cccccccccccc/dddddddd-dddd-dddd-dddd-dddddddddd02/10000000-0000-0000-0000-000000000002.png', 2)).id,
  'aaaaaaaa-0000-0000-0000-000000000002'::uuid,
  'registering a known path returns it even on a removed submission'
);
insert into storage.objects (bucket_id, name) values ('screenshots', 'cccccccc-cccc-cccc-cccc-cccccccccccc/dddddddd-dddd-dddd-dddd-dddddddddd02/20000000-0000-0000-0000-000000000002.png');
select throws_ok($$select public.register_screenshot('dddddddd-dddd-dddd-dddd-dddddddddd02', 'cccccccc-cccc-cccc-cccc-cccccccccccc/dddddddd-dddd-dddd-dddd-dddddddddd02/20000000-0000-0000-0000-000000000002.png', 2)$$, 'SUB23', null, 'a new path is refused on a removed submission');
select ok(not public.can_upload_screenshot('cccccccc-cccc-cccc-cccc-cccccccccccc/dddddddd-dddd-dddd-dddd-dddddddddd02/30000000-0000-0000-0000-000000000002.png'), 'removed submissions take no upload');
select ok(not public.can_upload_screenshot('cccccccc-cccc-cccc-cccc-cccccccccccc/dddddddd-dddd-dddd-dddd-dddddddddd03/10000000-0000-0000-0000-000000000003.png'), 'a registered path cannot be uploaded again');
select ok(public.can_upload_screenshot('cccccccc-cccc-cccc-cccc-cccccccccccc/dddddddd-dddd-dddd-dddd-dddddddddd03/30000000-0000-0000-0000-000000000003.png'), 'a new path uploads on an approved submission');

-- imagens seguem o guard e mudam a versão
select throws_ok($$select public.delete_screenshot_for_owner('aaaaaaaa-0000-0000-0000-000000000002', 'cccccccc-cccc-cccc-cccc-cccccccccccc')$$, 'SUB10', null, 'removed submissions keep their screenshots');
select throws_ok($$select public.reorder_screenshots('dddddddd-dddd-dddd-dddd-dddddddddd02', array['aaaaaaaa-0000-0000-0000-000000000002'::uuid])$$, 'SUB10', null, 'removed submissions keep their order');
select throws_ok($$select public.delete_screenshot_for_owner('aaaaaaaa-0000-0000-0000-000000000001', 'cccccccc-cccc-cccc-cccc-cccccccccccc')$$, 'SUB11', null, 'a moderated submission keeps at least one screenshot');
select public.reorder_screenshots('dddddddd-dddd-dddd-dddd-dddddddddd03', array['aaaaaaaa-0000-0000-0000-000000000003'::uuid]);
select ok((select updated_at > '2021-01-01' from public.submissions where slug = 'aprovado'), 'reordering changes the version');
-- cotas
insert into storage.objects (bucket_id, name)
select 'screenshots', 'cccccccc-cccc-cccc-cccc-cccccccccccc/dddddddd-dddd-dddd-dddd-dddddddddd03/' || gen_random_uuid() || '.png'
from generate_series(1, 7);
select ok(not public.can_upload_screenshot('cccccccc-cccc-cccc-cccc-cccccccccccc/dddddddd-dddd-dddd-dddd-dddddddddd03/30000000-0000-0000-0000-000000000003.png'), 'a submission stops at eight stored files');
insert into storage.objects (bucket_id, name)
select 'screenshots', 'cccccccc-cccc-cccc-cccc-cccccccccccc/' || gen_random_uuid() || '/' || gen_random_uuid() || '.png'
from generate_series(1, 50);
select ok(not public.can_upload_screenshot('cccccccc-cccc-cccc-cccc-cccccccccccc/dddddddd-dddd-dddd-dddd-dddddddddd04/30000000-0000-0000-0000-000000000004.png'), 'an account stops at fifty stored files');

-- revisão vale para a versão vista
select throws_ok($$select public.withdraw_screenshot('aaaaaaaa-0000-0000-0000-000000000003')$$, 'SUB20', null, 'only admins withdraw screenshots');
select set_config('request.jwt.claim.sub', 'abababab-abab-abab-abab-abababababab', false);
update public.submissions set updated_at = '2023-03-03 00:00:00+00' where slug = 'pendente';
select throws_ok($$select public.moderate_submission('dddddddd-dddd-dddd-dddd-dddddddddd01', 'approve', 'pending', null, '2020-01-01 00:00:00+00')$$, 'SUB25', null, 'approval fails when the submission changed during review');
select is((select status from public.submissions where slug = 'pendente'), 'pending', 'a stale approval changes nothing');
select public.moderate_submission('dddddddd-dddd-dddd-dddd-dddddddddd01', 'approve', 'pending', null, '2023-03-03 00:00:00+00');
select is((select status from public.submissions where slug = 'pendente'), 'approved', 'approval passes for the reviewed version');

-- retirada de imagem aprovada
select is(
  public.withdraw_screenshot('aaaaaaaa-0000-0000-0000-000000000003'),
  'cccccccc-cccc-cccc-cccc-cccccccccccc/dddddddd-dddd-dddd-dddd-dddddddddd03/10000000-0000-0000-0000-000000000003.png',
  'withdrawing returns the path to delete'
);
select is((select status from public.screenshots where id = 'aaaaaaaa-0000-0000-0000-000000000003'), 'rejected', 'a withdrawn screenshot is rejected');
select is((select count(*) from public.get_public_screenshots('aprovado')), 0::bigint, 'a withdrawn screenshot leaves the public page');
select is((select status from public.submissions where slug = 'aprovado'), 'approved', 'the submission stays published');
select is(
  (select (detail ->> 'withdrawn')::boolean from public.submission_events where kind = 'screenshot_moderated'),
  true,
  'withdrawing is recorded'
);

select * from finish();
rollback;
