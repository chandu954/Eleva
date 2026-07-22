import { NextRequest } from 'next/server';
import { AIProvider } from '@/lib/eleva-ai-provider';
import { createClient } from '@/utils/supabase/server';
import { z } from 'zod';

export const runtime = 'nodejs';
export const maxDuration = 120;

const bodySchema = z.object({
  text: z.string().min(50).max(50000),
  fileName: z.string().optional(),
  storagePath: z.string().optional(),
  setAsBase: z.boolean().default(false),
});

const ResumeSchema = z.object({
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
  try {
    const body = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) return Response.json({ error: 'invalid_body', issues: parsed.error.flatten() }, { status: 400 });

    const supabase = await createClient();
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes?.user) return Response.json({ error: 'unauthenticated' }, { status: 401 });
    const uid = userRes.user.id;

    const resumeText = parsed.data.text.slice(0, 40000);

    const system = `${AIProvider.getSystemPrompt()}\n\nExtract structured resume data from raw resume text. Group skills by category (Languages, Frameworks, Tools, Cloud, etc.). Do NOT invent metrics. Preserve verbatim bullet points.`;

    let parsedResult: z.infer<typeof ResumeSchema>;

    try {
      const result = await AIProvider.generateObject({
        system,
        prompt: `Resume text:\n${resumeText}`,
        schema: ResumeSchema,
        maxTokens: 4000,
        temperature: 0.3,
      });
      parsedResult = result as z.infer<typeof ResumeSchema>;
    } catch (objectErr) {
      console.warn('[Resume Import] generateObject failed, falling back to generate:', objectErr instanceof Error ? objectErr.message : String(objectErr));

      const result = await AIProvider.generate({
        system: `${system}\n\nReturn ONLY valid JSON matching this schema, no markdown, no preamble, no code fences:\n${JSON.stringify(ResumeSchema.shape, null, 2)}`,
        prompt: `Resume text:\n${resumeText}`,
        maxTokens: 4000,
        temperature: 0.3,
      });

      if (!result.text?.trim()) {
        console.error('[Resume Import] AI returned empty response');
        return Response.json({ error: 'ai_extraction_failed', detail: 'AI returned empty response' }, { status: 500 });
      }

      try {
        const cleaned = result.text
          .replace(/```json\s*/gi, '')
          .replace(/```\s*$/g, '')
          .trim();
        const json = JSON.parse(cleaned);
        parsedResult = ResumeSchema.parse(json);
      } catch (parseErr) {
        const msg = parseErr instanceof Error ? parseErr.message : String(parseErr);
        console.error('[Resume Import] JSON parse / schema validation failed:', msg);
        console.error('[Resume Import] Raw AI text:', result.text);
        return Response.json({ error: 'ai_extraction_failed', detail: msg, raw: result.text.slice(0, 500) }, { status: 500 });
      }
    }

    const name = parsed.data.fileName?.replace(/\.[^.]+$/, '') || `Imported ${new Date().toLocaleDateString()}`;

    if (parsed.data.setAsBase) {
      await supabase.from('resumes').update({ is_base_resume: false }).eq('user_id', uid).eq('is_base_resume', true);
    }

    const { data: inserted, error: insertErr } = await supabase.from('resumes').insert({
      user_id: uid,
      name,
      is_base_resume: parsed.data.setAsBase,
      ...parsedResult,
    }).select().single();

    if (insertErr) return Response.json({ error: insertErr.message }, { status: 500 });

    await supabase.from('activity_log').insert({
      user_id: uid,
      kind: 'resume_uploaded',
      title: `Imported resume: ${name}`,
      subtitle: `${parsedResult.work_experience.length} roles · ${parsedResult.skills.length} skill groups`,
      meta: { resumeId: inserted.id, storagePath: parsed.data.storagePath },
    });

    try {
      await supabase.from('notifications').insert({
        user_id: uid,
        kind: 'resume_imported',
        title: 'Resume imported',
        body: `${name} — ${parsedResult.work_experience.length} roles, ${parsedResult.skills.length} skill groups`,
        href: `/eleva/editor?id=${inserted.id}`,
      });
    } catch { /* noop */ }

    return Response.json({ resume: inserted });
  } catch (err) {
    console.error('========== IMPORT ERROR ==========');
    console.error(err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('message:', message);
    console.error('stack:', err instanceof Error ? err.stack?.split('\n').slice(0, 5).join('\n') : undefined);
    if (err && typeof err === 'object' && 'response' in err) {
      console.error('response:', (err as any).response);
    }
    if (err && typeof err === 'object' && 'cause' in err) {
      console.error('cause:', (err as any).cause);
    }
    return Response.json({ error: message }, { status: 500 });
  }
}
