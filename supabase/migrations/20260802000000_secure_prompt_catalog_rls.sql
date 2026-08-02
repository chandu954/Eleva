-- Secure prompt catalog tables: read-only for authenticated users.
-- Categories and tags are seeded catalog data; client-side writes are
-- not required (all writes go through service_role / SQL editor).
-- Previously any anon/authenticated client could INSERT/UPDATE/DELETE.

drop policy if exists prompt_categories_policy on public.prompt_categories;
create policy "prompt_categories_read" on public.prompt_categories
  for select using (true);

drop policy if exists prompt_tags_policy on public.prompt_tags;
create policy "prompt_tags_read" on public.prompt_tags
  for select using (true);
