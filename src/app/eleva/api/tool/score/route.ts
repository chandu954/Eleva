import { NextRequest } from 'next/server';
import { AIProvider, z } from '@/lib/eleva-ai-provider';
import { createClient } from '@/utils/supabase/server';

export const runtime = 'nodejs';
export const maxDuration = 45;

const bodySchema = z.object({
  resume: z.string(),
  jobDescription: z.string(),
  resumeId: z.string().uuid().optional(),
  jobId: z.string().uuid().optional(),
  save: z.boolean().default(false),
});

const ScoreSchema = z.object({
  overall: z.number().int().min(0).max(100),
  keyword: z.number().int().min(0).max(100),
  formatting: z.number().int().min(0).max(100),
  readability: z.number().int().min(0).max(100),
  impact: z.number().int().min(0).max(100),
  recruiter: z.number().int().min(0).max(100),
  matched: z.array(z.string()).max(30),
  missing: z.array(z.string()).max(30),
  suggestions: z.array(z.object({
    type: z.enum(['success', 'warning', 'primary']),
    text: z.string(),
    action: z.string(),
  })).max(8),
  summary: z.string(),
});

type ScoreShape = z.infer<typeof ScoreSchema>;

export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: 'invalid_body' }, { status: 400 });
  const { resume, jobDescription, resumeId, jobId, save } = parsed.data;

  const result = await AIProvider.generateObject({
    schema: ScoreSchema,
    maxTokens: 1500,
    system: `${AIProvider.getSystemPrompt()}\n\nScore this resume against the JD. Return ONLY valid minified JSON, no markdown. Schema: {"overall":0-100,"keyword":0-100,"formatting":0-100,"readability":0-100,"impact":0-100,"recruiter":0-100,"matched":string[],"missing":string[],"suggestions":[{"type":"success|warning|primary","text":string,"action":string}],"summary":string}.`,
    prompt: `Resume:\n${resume.slice(0, 8000)}\n\nJob description:\n${jobDescription.slice(0, 5000)}\n\nScore now.`,
    temperature: 0.3,
  });

  const object = result as unknown as ScoreShape;

  if (save && resumeId) {
    try {
      const supabase = await createClient();
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes?.user?.id;
      if (uid) {
        await supabase.from('ats_scores').insert({
          user_id: uid,
          resume_id: resumeId,
          job_id: jobId ?? null,
          overall: object.overall,
          keyword: object.keyword,
          formatting: object.formatting,
          readability: object.readability,
          impact: object.impact,
          recruiter: object.recruiter,
          matched: object.matched,
          missing: object.missing,
          suggestions: object.suggestions,
          raw: object,
        });
        await supabase.from('activity_log').insert({
          user_id: uid,
          kind: 'ats_scored',
          title: `ATS score ${object.overall}%`,
          subtitle: object.summary?.slice(0, 120) ?? null,
          meta: { resumeId, jobId },
        });
      }
    } catch (e) {
      console.warn('[ats.save] failed', e);
    }
  }

  return Response.json(object);
}
