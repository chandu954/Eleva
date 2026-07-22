-- Eleva Career Profile: extends profiles with full career-OS data model
-- Run this in Supabase SQL editor (idempotent — safe to re-run)

-- Career-specific profile fields
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS professional_summary text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS photo_url text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS leetcode_url text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS hackerrank_url text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS twitter_url text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS achievements jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS languages jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferences jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Resume versions: snapshots of tailored resumes derived from career profile
-- (extends the existing resume_versions table concept)
ALTER TABLE public.resume_versions ADD COLUMN IF NOT EXISTS career_profile_id uuid REFERENCES public.profiles(user_id) ON DELETE CASCADE;
ALTER TABLE public.resume_versions ADD COLUMN IF NOT EXISTS company_name text;
ALTER TABLE public.resume_versions ADD COLUMN IF NOT EXISTS role text;
ALTER TABLE public.resume_versions ADD COLUMN IF NOT EXISTS ats_score int;
ALTER TABLE public.resume_versions ADD COLUMN IF NOT EXISTS overrides jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_resume_versions_profile ON public.resume_versions(career_profile_id, created_at DESC);

-- Resume health / profile completion tracking
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS profile_completion int NOT NULL DEFAULT 0;
