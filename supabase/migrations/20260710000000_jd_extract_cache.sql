-- Cache for extracted job-description signal used by Eleva Studio pipeline
-- 24h TTL enforced by app logic (query by created_at)

create table if not exists public.jd_extract_cache (
  jd_hash text primary key,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists jd_extract_cache_created_at_idx
  on public.jd_extract_cache (created_at);
