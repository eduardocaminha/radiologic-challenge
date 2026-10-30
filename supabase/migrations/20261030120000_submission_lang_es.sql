alter table public.submissions drop constraint submissions_lang_check;

alter table public.submissions
  add constraint submissions_lang_check check (lang is null or lang in ('pt', 'en', 'es'));
