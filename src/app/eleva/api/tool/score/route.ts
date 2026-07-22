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

function localScore(resume: string, jobDescription: string): ScoreShape {
  const techTerms = [
    'javascript', 'typescript', 'python', 'java', 'go', 'rust', 'react', 'angular', 'vue', 'node',
    'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'sql', 'nosql', 'postgresql', 'mysql', 'mongodb',
    'redis', 'graphql', 'rest', 'git', 'linux', 'html', 'css', 'machine learning', 'llm',
  ];
  const jdLower = jobDescription.toLowerCase();
  const resumeLower = resume.toLowerCase();
  const jdKeywords = techTerms.filter(t => new RegExp(`\\b${t}\\b`).test(jdLower));
  const matched = jdKeywords.filter(k => resumeLower.includes(k));
  const missing = jdKeywords.filter(k => !resumeLower.includes(k));
  const matchRate = jdKeywords.length > 0 ? matched.length / jdKeywords.length : 0.5;
  const kw = Math.round(matchRate * 100);
  const overall = Math.round(kw * 0.6 + 75 * 0.4);
  return {
    overall, keyword: kw, formatting: 70, readability: 75,
    impact: Math.round(matchRate * 100), recruiter: Math.round((kw + 75) / 2),
    matched: matched.slice(0, 30), missing: missing.slice(0, 30),
    suggestions: missing.length > 0 ? [{ type: 'warning', text: `${missing.length} keywords missing`, action: `Add: ${missing.slice(0, 5).join(', ')}` }] : [],
    summary: `${matched.length}/${jdKeywords.length} keywords matched (${overall}%)`,
  };
}

export async function POST(req: NextRequest) {
  try {
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) return Response.json({ error: 'invalid_body' }, { status: 400 });
    const { resume, jobDescription, resumeId, jobId, save } = parsed.data;

    let object: ScoreShape;
    try {
      const result = await AIProvider.generateObject({
        schema: ScoreSchema,
        maxTokens: 1500,
        system: `${AIProvider.getSystemPrompt()}\n\nScore this resume against the JD. Return ONLY valid minified JSON, no markdown.`,
        prompt: `Resume:\n${resume.slice(0, 8000)}\n\nJob description:\n${jobDescription.slice(0, 5000)}\n\nScore now.`,
        temperature: 0.3,
      });
      object = result as unknown as ScoreShape;
    } catch {
      // Fallback: text-based JSON generation
      try {
        const textResult = await AIProvider.generate({
          system: `You are an API. Return ONLY valid JSON. Schema: {"overall":0-100,"keyword":0-100,"formatting":0-100,"readability":0-100,"impact":0-100,"recruiter":0-100,"matched":[],"missing":[],"suggestions":[],"summary":""}. No prose.`,
          prompt: `Resume:\n${resume.slice(0, 8000)}\n\nJD:\n${jobDescription.slice(0, 5000)}`,
          maxTokens: 1200,
          temperature: 0.3,
          config: { maxRetries: 2 },
        });
        const raw = textResult.text?.trim() || '';
        const jsonStart = raw.indexOf('{');
        const jsonEnd = raw.lastIndexOf('}');
        if (jsonStart >= 0 && jsonEnd > jsonStart) {
          object = ScoreSchema.parse(JSON.parse(raw.slice(jsonStart, jsonEnd + 1)));
        } else throw new Error('No JSON found');
      } catch {
        object = localScore(resume, jobDescription);
      }
    }

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
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return Response.json({ error: message }, { status: 500 });
  }
}
