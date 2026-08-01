-- Applications workflow context: source tracking, match/ATS scores, linked documents, applied date
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS match_score integer,
  ADD COLUMN IF NOT EXISTS ats_score integer,
  ADD COLUMN IF NOT EXISTS cover_letter_id uuid REFERENCES public.cover_letters(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS applied_at timestamptz,
  ADD COLUMN IF NOT EXISTS interview_at timestamptz,
  ADD COLUMN IF NOT EXISTS pinned boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS favorite boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_applications_source ON public.applications(source);
CREATE INDEX IF NOT EXISTS idx_applications_cover_letter ON public.applications(cover_letter_id);
CREATE INDEX IF NOT EXISTS idx_applications_pinned ON public.applications(pinned) WHERE pinned = true;
