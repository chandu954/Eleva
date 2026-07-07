-- Eleva production schema additions (2026-07-06)
-- Applications kanban, templates favorites, notifications, user_preferences, application notes/interviews.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================
-- APPLICATIONS (Kanban)
-- =========================
CREATE TABLE IF NOT EXISTS public.applications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resume_id uuid NULL REFERENCES public.resumes(id) ON DELETE SET NULL,
  company text NOT NULL,
  role text NOT NULL,
  location text,
  status text NOT NULL DEFAULT 'wishlist' CHECK (status IN ('wishlist','applied','interview','offer','rejected','archived')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high')),
  salary text,
  recruiter text,
  deadline date,
  job_description text,
  job_url text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS applications_policy ON public.applications;
CREATE POLICY applications_policy ON public.applications USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE INDEX IF NOT EXISTS idx_applications_user_updated ON public.applications(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_applications_status ON public.applications(user_id, status);

-- =========================
-- APPLICATION NOTES
-- =========================
CREATE TABLE IF NOT EXISTS public.application_notes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.application_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS application_notes_policy ON public.application_notes;
CREATE POLICY application_notes_policy ON public.application_notes USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE INDEX IF NOT EXISTS idx_app_notes_app ON public.application_notes(application_id, created_at DESC);

-- =========================
-- INTERVIEWS
-- =========================
CREATE TABLE IF NOT EXISTS public.interviews (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  round text NOT NULL,
  scheduled_at timestamptz,
  location text,
  interviewer text,
  notes text,
  outcome text CHECK (outcome IN ('pending','passed','failed','pending_feedback')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS interviews_policy ON public.interviews;
CREATE POLICY interviews_policy ON public.interviews USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE INDEX IF NOT EXISTS idx_interviews_scheduled ON public.interviews(user_id, scheduled_at ASC);

-- =========================
-- NOTIFICATIONS
-- =========================
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL,
  title text NOT NULL,
  body text,
  href text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS notifications_policy ON public.notifications;
CREATE POLICY notifications_policy ON public.notifications USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, created_at DESC);

-- =========================
-- USER PREFERENCES
-- =========================
CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  theme text DEFAULT 'system' CHECK (theme IN ('light','dark','system')),
  default_model text DEFAULT 'anthropic/claude-sonnet-4.5',
  email_digest boolean DEFAULT true,
  realtime_notifications boolean DEFAULT true,
  product_updates boolean DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_prefs_policy ON public.user_preferences;
CREATE POLICY user_prefs_policy ON public.user_preferences USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- =========================
-- Extend profiles with additional columns used in Eleva Settings/Profile
-- =========================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS headline text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS timezone text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS portfolio_url text;

-- =========================
-- STORAGE BUCKETS (already created via Storage API on 2026-07-06)
-- These INSERTs are idempotent — safe to re-run.
-- =========================
INSERT INTO storage.buckets (id, name, public) VALUES ('resumes', 'resumes', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('exports', 'exports', false) ON CONFLICT (id) DO NOTHING;

-- Storage policies: users can only read/write their own files under `{user_id}/*`
DROP POLICY IF EXISTS "resumes owner" ON storage.objects;
CREATE POLICY "resumes owner" ON storage.objects FOR ALL USING (bucket_id = 'resumes' AND (storage.foldername(name))[1] = auth.uid()::text) WITH CHECK (bucket_id = 'resumes' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "avatars public read" ON storage.objects;
CREATE POLICY "avatars public read" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
DROP POLICY IF EXISTS "avatars owner write" ON storage.objects;
CREATE POLICY "avatars owner write" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "exports owner" ON storage.objects;
CREATE POLICY "exports owner" ON storage.objects FOR ALL USING (bucket_id = 'exports' AND (storage.foldername(name))[1] = auth.uid()::text) WITH CHECK (bucket_id = 'exports' AND (storage.foldername(name))[1] = auth.uid()::text);

-- =========================
-- REALTIME PUBLICATION (idempotent)
-- =========================
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.applications;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.ats_scores;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.resumes;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
