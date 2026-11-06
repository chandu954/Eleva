import { NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { apiError } from '@/lib/api-response';
import { bodySchema } from './schemas';
import { createPipelineStream } from './orchestrator';

export const runtime = 'nodejs';
export const maxDuration = 180;

// ─── Section-Specific Schemas live in ./schemas.ts ─────────────────────────
export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return apiError('INVALID_BODY', 'Invalid request body', { detail: parsed.error.flatten() });
  const { jobDescription, resumeId } = parsed.data;

  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  const uid = userRes?.user?.id;

  let resumeText = '';
  let effectiveResumeId = resumeId;
  let originalResume: Record<string, unknown> | null = null;
  if (uid) {
    const q = resumeId
      ? supabase.from('resumes').select('*').eq('id', resumeId).eq('user_id', uid).maybeSingle()
      : supabase.from('resumes').select('*').eq('user_id', uid).eq('is_base_resume', true).limit(1).maybeSingle();
    const { data: r } = await q;
    if (r) {
      effectiveResumeId = r.id;
      originalResume = r;
      resumeText = [
        r.name, r.target_role, r.professional_summary,
        JSON.stringify(r.work_experience || []),
        JSON.stringify(r.skills || []),
        JSON.stringify(r.projects || []),
        JSON.stringify(r.education || []),
      ].filter(Boolean).join('\n');
    }
  }

  return createPipelineStream({
    jobDescription,
    resumeText,
    uid,
    originalResume,
    effectiveResumeId,
    supabase,
  });
}
