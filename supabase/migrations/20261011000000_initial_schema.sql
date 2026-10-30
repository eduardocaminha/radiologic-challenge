create extension if not exists pgcrypto;

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  slug text unique,
  status text not null default 'draft' check (status in ('draft', 'pending', 'approved', 'rejected', 'removed')),
  rejection_reason text check (rejection_reason is null or char_length(rejection_reason) <= 500),
  owner_id uuid references auth.users (id) on delete cascade,
  source text not null check (source in ('form', 'github')),
  github_issue_number integer unique,
  github_user_id text check (github_user_id is null or char_length(github_user_id) <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  approved_at timestamptz,
  name text check (name is null or char_length(name) between 1 and 60),
  tagline text check (tagline is null or char_length(tagline) between 1 and 120),
  description text check (description is null or char_length(description) between 1 and 2000),
  differential text check (differential is null or char_length(differential) between 1 and 280),
  lang text check (lang is null or lang in ('pt', 'en')),
  platforms text[] check (platforms is null or platforms <@ array['web', 'desktop', 'mobile', 'xr']::text[]),
  requires_install boolean,
  repo_url text check (repo_url is null or (left(repo_url, 8) = 'https://' and char_length(repo_url) <= 300)),
  license text check (license is null or char_length(license) between 1 and 120),
  base_tech text check (base_tech is null or base_tech in ('scratch', 'ohif', 'cornerstone3d', 'vtkjs', 'dwv', 'niivue', 'volview', 'other')),
  data_source text check (data_source is null or char_length(data_source) between 1 and 200),
  data_license text check (data_license is null or char_length(data_license) between 1 and 60),
  external_api boolean,
  external_api_detail text check (external_api_detail is null or char_length(external_api_detail) between 1 and 280),
  demo_url text check (demo_url is null or (left(demo_url, 8) = 'https://' and char_length(demo_url) <= 300)),
  download_url text check (download_url is null or (left(download_url, 8) = 'https://' and char_length(download_url) <= 300)),
  video_url text check (video_url is null or (left(video_url, 8) = 'https://' and char_length(video_url) <= 300)),
  ai_tools jsonb check (ai_tools is null or (jsonb_typeof(ai_tools) = 'array' and jsonb_array_length(ai_tools) <= 10)),
  ai_code_share text check (ai_code_share is null or ai_code_share in ('none', 'lt25', '25to75', 'gt75', 'all')),
  prompts_url text check (prompts_url is null or (left(prompts_url, 8) = 'https://' and char_length(prompts_url) <= 300)),
  time_spent text check (time_spent is null or time_spent in ('lt1d', '1to7d', '1to4w', 'gt1m')),
  cost text check (cost is null or cost in ('lt10', '10to100', '100to1000', 'gt1000')),
  features text[] check (features is null or (cardinality(features) <= 20 and features <@ array['2d', '3d', 'mpr', 'measurements', 'annotations', 'segmentation', 'fusion', 'cine', 'hanging_protocols', 'ai', 'export', 'comparison', 'windowing', 'collaboration', 'other']::text[])),
  modalities text[] check (modalities is null or (cardinality(modalities) <= 20 and modalities <@ array['ct', 'mr', 'us', 'xr', 'nm', 'pt', 'mg', 'cr', 'dx', 'rf', 'xa', 'sc', 'ot', 'other']::text[])),
  dicomweb boolean,
  stack text check (stack is null or char_length(stack) between 1 and 200),
  author_name text check (author_name is null or char_length(author_name) between 1 and 80),
  author_profile text check (author_profile is null or author_profile in ('radiologist', 'resident', 'physician', 'developer', 'student', 'physicist', 'team')),
  country text check (country is null or country ~ '^[A-Z]{2}$'),
  limitations text check (limitations is null or char_length(limitations) between 1 and 500),
  rules_version text,
  rules_accepted_at timestamptz,
  constraint submissions_external_api_detail_required check (not coalesce(external_api, false) or external_api_detail is not null),
  constraint submissions_demo_or_download_required check (
    platforms is null
    or ('web' = any(platforms) and demo_url is not null)
    or (not ('web' = any(platforms)) and download_url is not null and video_url is not null)
  )
);

create table public.screenshots (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions (id) on delete cascade,
  path text not null check (char_length(path) between 1 and 500),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  position integer not null check (position between 1 and 5),
  created_at timestamptz not null default now(),
  unique (submission_id, position)
);

create table public.votes (
  user_id uuid not null references auth.users (id) on delete cascade,
  submission_id uuid not null references public.submissions (id) on delete cascade,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  voided_at timestamptz,
  primary key (user_id, submission_id)
);

create table public.monthly_highlights (
  month date not null check (month = date_trunc('month', month)::date),
  rank integer not null check (rank between 1 and 3),
  submission_id uuid references public.submissions (id) on delete set null,
  name text not null check (char_length(name) between 1 and 60),
  slug text not null check (char_length(slug) between 1 and 120),
  votes integer not null check (votes >= 0),
  primary key (month, rank)
);

create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);

create table public.banned_voters (
  user_id uuid primary key references auth.users (id) on delete cascade,
  reason text not null check (char_length(reason) between 1 and 500),
  created_at timestamptz not null default now()
);

create table public.submission_events (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid references public.submissions (id) on delete set null,
  actor_id uuid references auth.users (id) on delete set null,
  kind text not null check (kind in ('state_transition', 'approved_url_changed', 'vote_voided', 'voter_banned', 'snapshot_recomputed')),
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.submissions enable row level security;
alter table public.screenshots enable row level security;
alter table public.votes enable row level security;
alter table public.monthly_highlights enable row level security;
alter table public.admins enable row level security;
alter table public.banned_voters enable row level security;
alter table public.submission_events enable row level security;

revoke all on table
  public.submissions,
  public.screenshots,
  public.votes,
  public.monthly_highlights,
  public.admins,
  public.banned_voters,
  public.submission_events
from anon, authenticated;
