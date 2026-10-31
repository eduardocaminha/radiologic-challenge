-- Consultas por projeto, por autor e o limite de votos por minuto.
create index votes_submission_id_idx on public.votes (submission_id);
create index submissions_owner_id_idx on public.submissions (owner_id);
create index submission_events_submission_id_idx on public.submission_events (submission_id);
create index vote_operations_user_id_occurred_at_idx on public.vote_operations (user_id, occurred_at);
