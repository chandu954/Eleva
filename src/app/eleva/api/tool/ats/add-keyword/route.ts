import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiError } from '@/lib/api-response';
import { createClient } from '@/utils/supabase/server';

const bodySchema = z.object({
  resumeId: z.string().uuid(),
  keyword: z.string().trim().min(2).max(64),
});

export async function POST(request: NextRequest) {
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) return apiError('INVALID_BODY', 'Invalid keyword request');

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return apiError('UNAUTHENTICATED', 'Not authenticated');

  const { resumeId, keyword } = parsed.data;
  const { data: resume, error: readError } = await supabase
    .from('resumes')
    .select('skills')
    .eq('id', resumeId)
    .eq('user_id', auth.user.id)
    .maybeSingle();
  if (readError) return apiError('INTERNAL_ERROR', 'Could not load resume skills');
  if (!resume) return apiError('NOT_FOUND', 'Resume not found');

  const skills = Array.isArray(resume.skills) ? resume.skills as Array<{ category?: string; items?: string[] }> : [];
  const normalized = keyword.toLocaleLowerCase();
  if (skills.some((group) => group.items?.some((item) => item.toLocaleLowerCase() === normalized))) {
    return Response.json({ ok: true, alreadyPresent: true });
  }

  const nextSkills = skills.length
    ? skills.map((group, index) => index === 0
      ? { ...group, items: [...(group.items ?? []), keyword] }
      : group)
    : [{ category: 'Technical Skills', items: [keyword] }];
  const { error: updateError } = await supabase
    .from('resumes')
    .update({ skills: nextSkills, updated_at: new Date().toISOString() })
    .eq('id', resumeId)
    .eq('user_id', auth.user.id);
  if (updateError) return apiError('INTERNAL_ERROR', 'Could not add keyword to resume');

  return Response.json({ ok: true, alreadyPresent: false });
}
