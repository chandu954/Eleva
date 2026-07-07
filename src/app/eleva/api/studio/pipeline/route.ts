import { NextRequest } from 'next/server';
import { AIProvider, z } from '@/lib/eleva-ai-provider';
import { createClient } from '@/utils/supabase/server';

export const runtime = 'nodejs';
export const maxDuration = 120;

const bodySchema = z.object({
  jobDescription: z.string().min(20),
  resumeId: z.string().uuid().optional(),
  company: z.string().optional(),
  role: z.string().optional(),
});

const ExtractSchema = z.object({
  company: z.string().nullable(),
  role: z.string().nullable(),
  required_skills: z.array(z.string()).max(30),
  nice_to_have: z.array(z.string()).max(20),
  summary: z.string(),
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

export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: 'invalid_body' }, { status: 400 });
  const { jobDescription, resumeId } = parsed.data;

  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  const uid = userRes?.user?.id;

  let resumeText = '';
  let effectiveResumeId = resumeId;
  if (uid) {
    const q = resumeId
      ? supabase.from('resumes').select('*').eq('id', resumeId).eq('user_id', uid).maybeSingle()
      : supabase.from('resumes').select('*').eq('user_id', uid).eq('is_base_resume', true).limit(1).maybeSingle();
    const { data: r } = await q;
    if (r) {
      effectiveResumeId = r.id;
      resumeText = [
        r.name, r.target_role, r.professional_summary,
        JSON.stringify(r.work_experience || []),
        JSON.stringify(r.skills || []),
        JSON.stringify(r.projects || []),
        JSON.stringify(r.education || []),
      ].filter(Boolean).join('\n');
    }
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const emit = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };
      try {
        emit('step', { step: 'extract', status: 'running' });
        const skills = await AIProvider.generateObject({
          schema: ExtractSchema,
          maxTokens: 900,
          temperature: 0.3,
          system: `${AIProvider.getSystemPrompt()}\n\nExtract structured signal from a JD.`,
          prompt: jobDescription.slice(0, 6000),
        });
        emit('step', { step: 'extract', status: 'done', data: skills });

        emit('step', { step: 'score', status: 'running' });
        const score = await AIProvider.generateObject({
          schema: ScoreSchema,
          maxTokens: 1600,
          temperature: 0.3,
          system: `${AIProvider.getSystemPrompt()}\n\nScore this resume vs JD. 0-100 scale on each axis. Missing = technologies/keywords absent from resume. Suggestions must be action-first.`,
          prompt: `Resume:\n${resumeText.slice(0, 6000) || '[No resume attached — score based on JD only, assume placeholder]'}\n\nJD:\n${jobDescription.slice(0, 4000)}`,
        });
        emit('step', { step: 'score', status: 'done', data: score });

        if (uid && effectiveResumeId) {
          await supabase.from('ats_scores').insert({
            user_id: uid,
            resume_id: effectiveResumeId,
            overall: (score as any).overall,
            keyword: (score as any).keyword,
            formatting: (score as any).formatting,
            readability: (score as any).readability,
            impact: (score as any).impact,
            recruiter: (score as any).recruiter,
            matched: (score as any).matched,
            missing: (score as any).missing,
            suggestions: (score as any).suggestions,
            raw: score,
          });
        }

        emit('step', { step: 'letter', status: 'running' });

        // For streaming the cover letter, we use a separate AI call with streaming
        const letterResult = await AIProvider.generate({
          maxTokens: 1200,
          temperature: 0.7,
          system: `${AIProvider.getSystemPrompt()}\n\nWrite a medium-length cover letter, plain text, no markdown.`,
          prompt: `Draft a cover letter for ${(skills as any).role ?? 'this role'} at ${(skills as any).company ?? 'this company'}. Weave in the top matched skills: ${(score as any).matched?.slice(0, 8).join(', ') ?? ''}. Reference: JD summary — ${(skills as any).summary ?? ''}.\n\nCandidate resume snapshot:\n${resumeText.slice(0, 3000)}`,
        });
        emit('letter-chunk', { text: letterResult.text });
        emit('step', { step: 'letter', status: 'done' });

        if (uid) {
          const { data: cl } = await supabase.from('cover_letters').insert({
            user_id: uid,
            resume_id: effectiveResumeId,
            company: (skills as any).company ?? 'Unknown',
            role: (skills as any).role ?? 'Unknown',
            body: letterResult.text,
            tone: 'confident',
            length: 'medium',
          }).select().single();
          await supabase.from('activity_log').insert({
            user_id: uid,
            kind: 'pipeline_run',
            title: `Pipeline: ${(skills as any).company ?? 'company'} · ${(score as any).overall ?? '?'}%`,
            subtitle: `${(score as any).matched?.length ?? 0} matched, ${(score as any).missing?.length ?? 0} missing`,
            meta: { atsOverall: (score as any).overall, coverLetterId: cl?.id, resumeId: effectiveResumeId },
          });
          try {
            await supabase.from('notifications').insert({
              user_id: uid,
              kind: 'pipeline_complete',
              title: `Pipeline complete · ${(score as any).overall}%`,
              body: `${(skills as any).company ?? 'Company'} · ${(skills as any).role ?? 'Role'} — ${(score as any).matched?.length ?? 0} matched, ${(score as any).missing?.length ?? 0} missing`,
              href: '/eleva/analytics',
            });
          } catch { /* noop */ }
        }

        emit('done', {
          overall: (score as any).overall,
          matched: (score as any).matched?.length ?? 0,
          missing: (score as any).missing?.length ?? 0,
          company: (skills as any).company,
          role: (skills as any).role,
        });
      } catch (e) {
        emit('error', { message: (e as Error).message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  });
}
