insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change,
  email_change_token_current,
  reauthentication_token,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values (
  '00000000-0000-0000-0000-000000000000',
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  'authenticated',
  'authenticated',
  'e2e@example.test',
  crypt('local-password', gen_salt('bf')),
  now(),
  '',
  '',
  '',
  '',
  '',
  '',
  '{"provider":"email","providers":["email","github"]}'::jsonb,
  '{"name":"Local E2E User"}'::jsonb,
  now(),
  now()
)
on conflict (id) do nothing;

insert into auth.identities (id, user_id, provider_id, identity_data, provider, created_at, updated_at)
values (
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeef',
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  'local-github-user',
  '{"sub":"local-github-user","user_name":"local-e2e-user"}'::jsonb,
  'github',
  now(),
  now()
)
on conflict (provider, provider_id) do nothing;

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change,
  email_change_token_current,
  reauthentication_token,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values (
  '00000000-0000-0000-0000-000000000000',
  'ffffffff-ffff-ffff-ffff-ffffffffffff',
  'authenticated',
  'authenticated',
  'admin-e2e@example.test',
  crypt('local-admin-password', gen_salt('bf')),
  now(),
  '',
  '',
  '',
  '',
  '',
  '',
  '{"provider":"email","providers":["email","github"]}'::jsonb,
  '{"name":"Local E2E Admin"}'::jsonb,
  now(),
  now()
)
on conflict (id) do nothing;

insert into auth.identities (id, user_id, provider_id, identity_data, provider, created_at, updated_at)
values (
  'ffffffff-ffff-ffff-ffff-fffffffffffe',
  'ffffffff-ffff-ffff-ffff-ffffffffffff',
  'local-admin-github-user',
  '{"sub":"local-admin-github-user","user_name":"local-e2e-admin"}'::jsonb,
  'github',
  now(),
  now()
)
on conflict (provider, provider_id) do nothing;

insert into public.admins (user_id)
values ('ffffffff-ffff-ffff-ffff-ffffffffffff')
on conflict (user_id) do nothing;
