-- Eleva additions: ATS scores + activity log + resume versions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ATS scores (append-only history of every score)
CREATE TABLE IF NOT EXISTS public.ats_scores (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  resume_id uuid NOT NULL,
  job_id uuid NULL,
  overall int NOT NULL,
  keyword int NOT NULL,
  formatting int NOT NULL,
  readability int NOT NULL,
  impact int NOT NULL,
  recruiter int NOT NULL,
  matched jsonb NULL DEFAULT '[]'::jsonb,
  missing jsonb NULL DEFAULT '[]'::jsonb,
  suggestions jsonb NULL DEFAULT '[]'::jsonb,
  raw jsonb NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT ats_scores_pkey PRIMARY KEY (id),
  CONSTRAINT ats_scores_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT ats_scores_resume_id_fkey FOREIGN KEY (resume_id) REFERENCES public.resumes(id) ON DELETE CASCADE
);
ALTER TABLE public.ats_scores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ats_scores_policy ON public.ats_scores;
CREATE POLICY ats_scores_policy ON public.ats_scores
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
CREATE INDEX IF NOT EXISTS idx_ats_scores_user_created ON public.ats_scores(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ats_scores_resume ON public.ats_scores(resume_id, created_at DESC);

-- Activity log (dashboard "Recent activity" timeline)
CREATE TABLE IF NOT EXISTS public.activity_log (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  kind text NOT NULL, -- 'resume_created' | 'resume_updated' | 'ats_scored' | 'cover_generated' | 'resume_uploaded' | 'resume_tailored' | 'application_added'
  title text NOT NULL,
  subtitle text NULL,
  meta jsonb NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT activity_log_pkey PRIMARY KEY (id),
  CONSTRAINT activity_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS activity_log_policy ON public.activity_log;
CREATE POLICY activity_log_policy ON public.activity_log
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
CREATE INDEX IF NOT EXISTS idx_activity_user_created ON public.activity_log(user_id, created_at DESC);

-- Resume versions (snapshots after each optimization)
CREATE TABLE IF NOT EXISTS public.resume_versions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  resume_id uuid NOT NULL,
  version_label text NULL,
  snapshot jsonb NOT NULL,
  ats_score int NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT resume_versions_pkey PRIMARY KEY (id),
  CONSTRAINT resume_versions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT resume_versions_resume_id_fkey FOREIGN KEY (resume_id) REFERENCES public.resumes(id) ON DELETE CASCADE
);
ALTER TABLE public.resume_versions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS resume_versions_policy ON public.resume_versions;
CREATE POLICY resume_versions_policy ON public.resume_versions
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
CREATE INDEX IF NOT EXISTS idx_versions_resume ON public.resume_versions(resume_id, created_at DESC);

-- Cover letters (searchable + versioned)
CREATE TABLE IF NOT EXISTS public.cover_letters (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  resume_id uuid NULL,
  company text NOT NULL,
  role text NOT NULL,
  tone text NULL,
  length text NULL,
  body text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT cover_letters_pkey PRIMARY KEY (id),
  CONSTRAINT cover_letters_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT cover_letters_resume_id_fkey FOREIGN KEY (resume_id) REFERENCES public.resumes(id) ON DELETE SET NULL
);
ALTER TABLE public.cover_letters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cover_letters_policy ON public.cover_letters;
CREATE POLICY cover_letters_policy ON public.cover_letters
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
CREATE INDEX IF NOT EXISTS idx_cover_user_created ON public.cover_letters(user_id, created_at DESC);

-- Auto-create profile on new auth.users signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', split_part(COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), ' ', 1)),
    COALESCE(NEW.raw_user_meta_data->>'last_name', split_part(COALESCE(NEW.raw_user_meta_data->>'full_name', ''), ' ', 2))
  ) ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
