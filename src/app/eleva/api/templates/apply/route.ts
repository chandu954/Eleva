import { NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { z } from 'zod';

const bodySchema = z.object({ resumeId: z.string().uuid(), templateId: z.string() });

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes?.user) return Response.json({ error: 'unauthenticated' }, { status: 401 });
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: 'invalid_body' }, { status: 400 });

  const { error } = await supabase.from('resumes').update({
    document_settings: { template: parsed.data.templateId },
    updated_at: new Date().toISOString(),
  }).eq('id', parsed.data.resumeId).eq('user_id', userRes.user.id);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  await supabase.from('activity_log').insert({
    user_id: userRes.user.id,
    kind: 'template_applied',
    title: `Applied template: ${parsed.data.templateId}`,
    meta: { resumeId: parsed.data.resumeId, templateId: parsed.data.templateId },
  });
  return Response.json({ ok: true });
}
