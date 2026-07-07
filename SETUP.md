# Eleva Setup Guide

## 1. Environment variables
All required env vars are in `/app/.env`. If deploying fresh, ensure these are set:
```
NEXT_PUBLIC_SITE_URL=https://your-domain.example.com
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
OPENROUTER_API_KEY=sk-or-v1-...
AUTO_PRO_SUBSCRIPTION=true       # gives all users Pro access (preview mode)
```

## 2. Apply database migration
Open the Supabase SQL Editor for your project and paste the contents of:
```
/app/supabase/migrations/20260706000000_eleva_full_schema.sql
```
This creates:
- `applications`, `application_notes`, `interviews` (kanban + interview tracking)
- `notifications`, `user_preferences` (notifications + settings persistence)
- Extends `profiles` with `headline`, `bio`, `timezone`, `portfolio_url`
- Creates `resumes`, `avatars`, `exports` Storage buckets with public/private ACLs

> The app **degrades gracefully** if you don't apply this yet — empty states everywhere.

## 3. Start the app
```
sudo supervisorctl restart nextjs
```
App runs at `http://localhost:3000` and behind the ingress at `NEXT_PUBLIC_SITE_URL`.

## 4. Try the aha moment
1. Visit `/eleva` and sign up / sign in.
2. Open `/eleva/studio`.
3. Paste any job description (>20 chars).
4. Click **Run full pipeline**.
5. Watch the pipeline extract skills → score ATS → stream a cover letter in real time.
6. Head to `/eleva/dashboard` and `/eleva/analytics` to see everything you just generated.
