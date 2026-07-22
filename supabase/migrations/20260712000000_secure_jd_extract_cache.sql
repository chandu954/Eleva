-- Enable RLS on jd_extract_cache (was missing in initial migration)
-- This is an internal cache table; only service_role should access it.

alter table public.jd_extract_cache enable row level security;

revoke all on public.jd_extract_cache from anon, authenticated;
grant all on public.jd_extract_cache to service_role;
