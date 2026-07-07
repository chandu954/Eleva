# Eleva — AI Career Operating System (Production Build)

## Product summary
Eleva transforms ResumeLM into a premium AI SaaS that helps candidates elevate every opportunity: paste a job, get a tailored resume, ATS scorecard, and cover letter — all in real time. The workspace is designed to feel like Linear/Notion/Vercel: opinionated, keyboard-first, Framer-Motion polish.

Tagline: **"Elevate Every Opportunity."**

## Tech stack (as delivered)
- Next.js 15 App Router, React 19, TypeScript strict
- Tailwind + custom Eleva design tokens
- Framer Motion, lucide-react, shadcn (via existing components), Sonner toasts
- Supabase (auth, Postgres, RLS, Storage)
- OpenRouter via @ai-sdk/openai (default: google/gemini-2.5-flash)
- Vercel AI SDK v4 (streamText, generateText) with SSE
- Zod validation, React Hook Form (available)

## Personas
- **The IC engineer** (primary) — 3–8 YOE, applying at YC/tier-1, wants "ATS-safe" but distinctive resumes.
- **The bootcamp grad** — first job hunt, needs guardrails.
- **The career coach / bootcamp** — Teams tier, cohort analytics.

## Delivered in this build
### Fully functional pages (all connected to Supabase, no placeholders)
- `/eleva` landing (pre-existing)
- `/eleva/dashboard` — REAL metrics (resumes, applications, avg ATS, cover letters), sparklines from ats_scores/resumes/applications, real activity timeline from activity_log, weekly productivity chart
- `/eleva/studio` — **Full AI pipeline** (Extract skills → Score ATS → Stream cover letter), SSE server-sent events, abort/reset, saves ats_scores + cover_letters + activity_log rows
- `/eleva/analytics` — real charts from ats_scores/ai_usage_events; ATS trend, resume growth, applications trend, model/route breakdown
- `/eleva/templates` — 12-template marketplace, live preview modal, favorites (localStorage), Apply-to-resume via API
- `/eleva/settings` — 9 real tabs (Profile, Account, Appearance, Notifications, AI, API Keys BYOK, Billing, Security, Danger Zone) all wired to Supabase server actions
- `/eleva/applications` — real Kanban with drag-drop between columns, add/edit/delete via /api/applications, streams status updates
- `/eleva/ats`, `/eleva/cover-letters`, `/eleva/resumes`, `/eleva/editor` — pre-existing, wired to real streaming AI
- `/eleva/auth/login`, `/eleva/auth/signup`, `/eleva/auth/callback` — Supabase Auth (email/password + Google OAuth)

### AI provider
- Rewrote `src/app/eleva/_lib/ai-provider.ts` to use `@ai-sdk/openai` against OpenRouter's OpenAI-compatible endpoint (the old `@openrouter/ai-sdk-provider@0.0.6` was incompatible with ai SDK v4).
- Default model: `google/gemini-2.5-flash` (free-tier friendly, supports JSON extraction).
- `maxTokens` set on every AI call to stay within the free-tier's ~15k token budget.

### API routes (all real, no mocks)
- `POST /eleva/api/studio/pipeline` — SSE stream (extract → score → letter) with Supabase persistence
- `POST /eleva/api/tool/rewrite` — streams a rewritten bullet
- `POST /eleva/api/tool/draft` — streams a cover letter
- `POST /eleva/api/tool/score` — returns ATS scorecard JSON, optionally saves
- `POST /eleva/api/chat` — Vercel AI data-stream chat (for the floating Copilot)
- `GET|POST|PATCH|DELETE /eleva/api/applications` — full CRUD
- `POST /eleva/api/templates/apply` — sets `resumes.document_settings.template`
- `GET /eleva/auth/callback` — OAuth code exchange

### Server actions
- `updateProfile`, `updatePreferences`, `deleteAccount` in `_lib/actions-settings.ts`

### Middleware
- Refreshes Supabase session for `/eleva` (was previously bypassed)
- Never redirects `/eleva/*` for subscription — they're always accessible
- `AUTO_PRO_SUBSCRIPTION=true` short-circuits gating for legacy routes

## Environment variables (already set)
All provided by user — no missing keys.
- `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENROUTER_API_KEY`
- `AUTO_PRO_SUBSCRIPTION=true`

## Database migration required (one-time)
Run `supabase/migrations/20260706000000_eleva_full_schema.sql` in the Supabase SQL Editor to create the tables the new pages depend on:
- `applications`, `application_notes`, `interviews`
- `notifications`, `user_preferences`
- Extends `profiles` with `headline`, `bio`, `timezone`, `portfolio_url`
- Creates `resumes`, `avatars`, `exports` Storage buckets

The UI **gracefully degrades** when the migration hasn't been applied (empty states, disabled writes). Everything else already works with the existing tables (`profiles`, `resumes`, `ats_scores`, `cover_letters`, `activity_log`, `resume_versions`, `subscriptions`, `ai_usage_events`).

## Aha moment
Open `/eleva/studio`, paste any job description, click **Run full pipeline**:
1. Skills extracted with company/role identified (~2s)
2. ATS scorecard rendered with matched/missing keywords (~3s)
3. Cover letter streams word-by-word to the preview panel (~10s)
4. All three artifacts saved to Supabase and surfaced on the Dashboard/Analytics.
