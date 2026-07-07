import { NextRequest } from 'next/server';
import { AIProvider } from '@/lib/eleva-ai-provider';
import { createClient } from '@/utils/supabase/server';
import { z } from 'zod';

export const runtime = 'nodejs';
export const maxDuration = 60;

const bodySchema = z.object({
  text: z.string().min(50).max(50000),
  fileName: z.string().optional(),
  storagePath: z.string().optional(),
  setAsBase: z.boolean().default(false),
});

const ResumeExtractSchema = z.object({
  first_name: z.string().nullable(),
  last_name: z.string().nullable(),
  email: z.string().nullable(),
  phone_number: z.string().nullable(),
  location: z.string().nullable(),
  linkedin_url: z.string().nullable(),
  github_url: z.string().nullable(),
  website: z.string().nullable(),
  target_role: z.string().nullable(),
  professional_summary: z.string().nullable(),
  work_experience: z.array(z.object({
    company: z.string(),
    position: z.string(),
    location: z.string().nullable().optional(),
    date: z.string().nullable().optional(),
    description: z.array(z.string()).default([]),
  })).default([]),
  education: z.array(z.object({
    school: z.string(),
    degree: z.string().nullable().optional(),
    field: z.string().nullable().optional(),
    date: z.string().nullable().optional(),
    gpa: z.string().nullable().optional(),
  })).default([]),
  skills: z.array(z.object({
    category: z.string(),
    items: z.array(z.string()).default([]),
  })).default([]),
  projects: z.array(z.object({
    name: z.string(),
    description: z.array(z.string()).default([]),
    technologies: z.array(z.string()).default([]),
    url: z.string().nullable().optional(),
  })).default([]),
  certifications: z.array(z.object({
    name: z.string(),
    issuer: z.string().nullable().optional(),
    date: z.string().nullable().optional(),
  })).default([]),
});

export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: 'invalid_body', issues: parsed.error.flatten() }, { status: 400 });

  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes?.user) return Response.json({ error: 'unauthenticated' }, { status: 401 });
  const uid = userRes.user.id;

  const result = await AIProvider.generateObject({
    schema: ResumeExtractSchema,
    maxTokens: 3500,
    temperature: 0.3,
    system: `${AIProvider.getSystemPrompt()}\n\nExtract structured resume data from raw resume text. Return ONLY valid minified JSON, no markdown, no preamble.\nGroup skills by category (Languages, Frameworks, Tools, Cloud, etc.). Do NOT invent metrics. Preserve verbatim bullet points.`,
    prompt: `Resume text:\n${parsed.data.text.slice(0, 40000)}`,
  });

  const record = result;

  const name = parsed.data.fileName?.replace(/\.[^.]+$/, '') || `Imported ${new Date().toLocaleDateString()}`;

  if (parsed.data.setAsBase) {
    await supabase.from('resumes').update({ is_base_resume: false }).eq('user_id', uid).eq('is_base_resume', true);
  }

  const { data: inserted, error: insertErr } = await supabase.from('resumes').insert({
    user_id: uid,
    name,
    is_base_resume: parsed.data.setAsBase,
    ...record,
  }).select().single();

  if (insertErr) return Response.json({ error: insertErr.message }, { status: 500 });

  await supabase.from('activity_log').insert({
    user_id: uid,
    kind: 'resume_uploaded',
    title: `Imported resume: ${name}`,
    subtitle: `${(record as any).work_experience?.length ?? 0} roles · ${(record as any).skills?.length ?? 0} skill groups`,
    meta: { resumeId: inserted.id, storagePath: parsed.data.storagePath },
  });

  try {
    await supabase.from('notifications').insert({
      user_id: uid,
      kind: 'resume_imported',
      title: 'Resume imported',
      body: `${name} — ${(record as any).work_experience?.length ?? 0} roles, ${(record as any).skills?.length ?? 0} skill groups`,
      href: `/eleva/editor?id=${inserted.id}`,
    });
  } catch { /* noop */ }

  return Response.json({ resume: inserted });
}
