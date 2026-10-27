import type { createClient } from '@/utils/supabase/server';
import { logger } from '@/lib/logger';

import { buildTailoredResumeIdentity } from './pipeline-utils';
import type { ScoreData } from './prompts';

type SupabaseClientLike = Awaited<ReturnType<typeof createClient>>;

export interface TailoredResumePayload {
  professional_summary: unknown;
  skills: unknown;
  work_experience: unknown;
  projects: unknown;
  education: unknown;
  certifications: unknown;
}

export interface PersistPipelineResultsParams {
  supabase: SupabaseClientLike;
  uid: string | undefined;
  effectiveResumeId: string | undefined;
  originalResume: Record<string, unknown> | null;
  tailoredResume: TailoredResumePayload;
  originalScore: ScoreData;
  rescore: ScoreData;
  skills: { company?: string | null; role?: string | null };
  letterText: string;
}

export async function persistPipelineResults({
  supabase,
  uid,
  effectiveResumeId,
  originalResume,
  tailoredResume,
  originalScore,
  rescore,
  skills,
  letterText,
}: PersistPipelineResultsParams): Promise<{ savedCoverLetterId: string | null }> {
  let savedCoverLetterId: string | null = null;
  if (!uid) return { savedCoverLetterId };

  if (effectiveResumeId) {
    await supabase.from('ats_scores').insert({
      user_id: uid,
      resume_id: effectiveResumeId,
      overall: rescore.overall,
      keyword: rescore.keyword,
      formatting: rescore.formatting,
      readability: rescore.readability,
      impact: rescore.impact,
      recruiter: rescore.recruiter,
      matched: rescore.matched,
      missing: rescore.missing,
      suggestions: rescore.suggestions,
      raw: rescore,
    });
  }

  if (originalResume) {
    const tailoredIdentity = buildTailoredResumeIdentity(originalResume);
    const { error: tailoredErr } = await supabase.from('resumes').insert({
      user_id: uid,
      name: tailoredIdentity.name,
      is_base_resume: false,
      target_role: tailoredIdentity.target_role,
      professional_summary: tailoredResume.professional_summary,
      skills: tailoredResume.skills,
      work_experience: tailoredResume.work_experience,
      projects: tailoredResume.projects,
      education: tailoredResume.education,
      certifications: tailoredResume.certifications,
    });
    if (tailoredErr) {
      logger.warn('pipeline.persistence.tailored_resume_failed', {
        error: tailoredErr.message,
      });
    }
  }

  const { data: cl } = await supabase.from('cover_letters').insert({
    user_id: uid,
    resume_id: effectiveResumeId,
    company: skills.company ?? 'Unknown',
    role: skills.role ?? 'Unknown',
    body: letterText,
    tone: 'confident',
    length: 'medium',
  }).select().single();
  savedCoverLetterId = cl?.id ?? null;

  await supabase.from('activity_log').insert({
    user_id: uid,
    kind: 'pipeline_run',
    title: `Resume tailored for ${skills.role ?? 'this job'}`,
    subtitle: skills.company ?? null,
    meta: {
      atsOverall: rescore.overall,
      previousOverall: originalScore.overall,
      matchedCount: rescore.matched?.length ?? 0,
      missingCount: rescore.missing?.length ?? 0,
      role: skills.role ?? null,
      company: skills.company ?? null,
      coverLetterId: cl?.id,
      resumeId: effectiveResumeId,
    },
  });

  try {
    await supabase.from('notifications').insert({
      user_id: uid,
      kind: 'pipeline_complete',
      title: `Pipeline complete · ${originalScore.overall}% → ${rescore.overall}%`,
      body: `${skills.company ?? 'Company'} · ${skills.role ?? 'Role'} — +${rescore.overall - originalScore.overall} ATS`,
      href: '/eleva/analytics',
    });
  } catch {
    // Notifications are best-effort; a failure must not fail the run.
  }

  return { savedCoverLetterId };
}
