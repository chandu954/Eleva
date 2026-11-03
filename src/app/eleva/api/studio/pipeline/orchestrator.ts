import { AIProvider, z, type AIProviderResult } from '@/lib/eleva-ai-provider';
import { scoreResumeLocally, localExtractFallback } from './local-scorer';
import {
  ExtractSchema,
  ScoreSchema,
  getCachedExtract,
  getCachedExtractFromDb,
  getCachedScore,
  setCachedExtract,
  setCachedExtractInDb,
  setCachedScore,
} from './cache';
import { normalizeRoleTitle } from './pipeline-utils';
import {
  PlannerSchema,
  RecruiterReviewSchema,
} from './schemas';
import {
  classifyPipelineError,
  computeKeywordsAdded,
  countBulletsRewritten,
  estimateCompatibility,
  generateObjectWithFallback,
  isRateLimitError,
  resumeToText,
  withStepTimeout,
  type PipelineError,
} from './helpers';
import { persistPipelineResults } from './persistence';
import {
  type OriginalResumeData,
  buildExtractSystemPrompt,
  buildExtractUserPrompt,
  buildLetterSystemPrompt,
  buildLetterUserPrompt,
  buildPlanSystemPrompt,
  buildPlanUserPrompt,
  buildRescoreSystemPrompt,
  buildRescoreUserPrompt,
  buildReviewSystemPrompt,
  buildReviewUserPrompt,
  buildScoreSystemPrompt,
  buildScoreUserPrompt,
} from './prompts';
import type { createClient } from '@/utils/supabase/server';
import { rewriteResumeSections } from './rewrite-stage';

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export interface CreatePipelineStreamParams {
  jobDescription: string;
  resumeText: string;
  uid: string | undefined;
  originalResume: Record<string, unknown> | null;
  effectiveResumeId: string | undefined;
  supabase: SupabaseClient;
}

export function getOptimizationStatus(changedSections: number): string {
  return changedSections < 2 ? 'Optimization Incomplete' : 'Tailored Resume Ready';
}

export function createPipelineStream(params: CreatePipelineStreamParams) {
  const { jobDescription, resumeText, uid, originalResume, effectiveResumeId, supabase } = params;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const emit = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };
      try {
        /* ─── Step 1: Extract JD signal ─── */
        emit('step', { step: 'extract', status: 'running' });

        // 1) In-memory cache (fast)
        const memCached = await getCachedExtract(jobDescription);

        // 2) Supabase cache (shared across instances / deployments)
        const dbCached = !memCached ? await getCachedExtractFromDb(supabase, jobDescription) : null;

        const cached = memCached ?? dbCached;
        if (cached) {
          emit('step', { step: 'extract', status: 'done', data: cached, cached: true });
        }

        const skillsRaw = cached ?? await withStepTimeout(
          generateObjectWithFallback(
            ExtractSchema,
            buildExtractSystemPrompt(AIProvider.getSystemPrompt()),
            buildExtractUserPrompt(jobDescription),
            900, 0.3,
            () => localExtractFallback(jobDescription),
          ).then(async (data) => {
            await setCachedExtract(jobDescription, data);
            try { await setCachedExtractInDb(supabase, jobDescription, data); } catch { /* noop */ }
            return data;
          }),
          'extract', emit,
        ).catch((e) => { throw Object.assign(e instanceof Error ? e : new Error(String(e)), { _step: 'extract', _hasStep: true }); });
        const skills = {
          ...skillsRaw,
          role: normalizeRoleTitle(skillsRaw.role, jobDescription),
        };
        emit('step', { step: 'extract', status: 'done', data: skills });

        /* ─── Step 2: Score resume vs JD ─── */
        emit('step', { step: 'score', status: 'running' });
        const cachedScore = await getCachedScore(resumeText, jobDescription, uid);
        const score = cachedScore ?? await withStepTimeout(
          generateObjectWithFallback(
            ScoreSchema,
            buildScoreSystemPrompt(AIProvider.getSystemPrompt()),
            buildScoreUserPrompt(resumeText, jobDescription),
            1600, 0.3,
            () => scoreResumeLocally(resumeText, jobDescription),
          ).then(async (data) => { await setCachedScore(resumeText, jobDescription, data, uid); return data; }),
          'score', emit,
        ).catch((e) => { throw Object.assign(e instanceof Error ? e : new Error(String(e)), { _step: 'score', _hasStep: true }); });
        emit('step', { step: 'score', status: 'done', data: score });

        const originalResumeJson: OriginalResumeData | null = originalResume ? {
          professional_summary: (originalResume.professional_summary as string) ?? '',
          skills: originalResume.skills ?? [],
          work_experience: originalResume.work_experience ?? [],
          projects: originalResume.projects ?? [],
          education: originalResume.education ?? [],
          certifications: originalResume.certifications ?? [],
        } : null;

        const compatScore = estimateCompatibility(originalResumeJson, jobDescription, score);
        const isLowCompat = compatScore < 35;

        const localPlanFallback = (): z.infer<typeof PlannerSchema> => ({
          compatibility: compatScore,
          rewriteSummary: true,
          rewriteExperience: true,
          rewriteProjects: true,
          rewriteSkills: true,
          sectionsToSkip: [],
          keywordsToInject: ((score.missing as string[]) ?? []).slice(0, 10),
          transferableSkills: [],
          hardTruthNote: isLowCompat ? `This resume is for a different role domain. Key missing technologies (${((score.missing as string[]) ?? []).slice(0, 5).join(', ')}) cannot be honestly added.` : null,
        });

        /* ─── Step 3: Generate Optimization Plan ─── */
        emit('step', { step: 'plan', status: 'running' });

        const plan = await withStepTimeout(
          generateObjectWithFallback(
            PlannerSchema,
            buildPlanSystemPrompt(AIProvider.getSystemPrompt()),
            buildPlanUserPrompt({ resumeJson: originalResumeJson, jobDescription, score, compatScore, isLowCompat }),
            800, 0.3, () => localPlanFallback()),
          'plan', emit,
        ).catch((e) => { throw Object.assign(e instanceof Error ? e : new Error(String(e)), { _step: 'plan', _hasStep: true }); });
        emit('step', { step: 'plan', status: 'done', data: plan });

        const {
          tailoredResume,
          qualityResult,
          sectionOutcomes,
          perSectionConfidence,
          perSectionChanges,
          changedSections,
        } = await rewriteResumeSections({
          jobDescription,
          skills,
          score,
          plan,
          originalResumeJson,
          isLowCompat,
          emit,
        });

        /* ─── Build resume text from tailored object ─── */
        const rewrittenTail = resumeToText(tailoredResume);

        /* ─── Compute diff stats ─── */
        const keywordsAdded = computeKeywordsAdded(originalResume, tailoredResume);
        const bulletsRewritten = countBulletsRewritten(originalResume, tailoredResume);

        /* ─── Step 4: Re-score after tailoring ─── */
        emit('step', { step: 'rescore', status: 'running' });
        const cachedRescore = await getCachedScore(rewrittenTail, jobDescription, uid);
        const rescores = cachedRescore ?? await withStepTimeout(
          generateObjectWithFallback(
            ScoreSchema,
            buildRescoreSystemPrompt(AIProvider.getSystemPrompt()),
            buildRescoreUserPrompt(rewrittenTail, jobDescription, score.overall),
            1600, 0.3,
            () => scoreResumeLocally(rewrittenTail, jobDescription),
          ).then(async (data) => { await setCachedScore(rewrittenTail, jobDescription, data, uid); return data; }),
          'rescore', emit,
        ).catch((e) => { throw Object.assign(e instanceof Error ? e : new Error(String(e)), { _step: 'rescore', _hasStep: true }); });
        emit('step', { step: 'rescore', status: 'done', data: { ...rescores, previous_overall: score.overall } });

        /* ─── Step 5: Recruiter Review ─── */
        emit('step', { step: 'review', status: 'running' });

        const reviewSystemPrompt = buildReviewSystemPrompt(AIProvider.getSystemPrompt());

        const reviewUserPrompt = buildReviewUserPrompt({ skills, rewrittenTail, rescores });

        const localReviewFallback = (): z.infer<typeof RecruiterReviewSchema> => ({
          wouldInterview: rescores.overall >= 70,
          score: rescores.overall,
          strengths: ((rescores.matched as string[]) ?? []).slice(0, 3).map((k: string) => `Good ${k} coverage`),
          weaknesses: ((rescores.missing as string[]) ?? []).slice(0, 3).map((k: string) => `Missing ${k}`),
          genericAreas: [],
          recommendation: rescores.overall >= 70 ? `Strong match for ${skills.role ?? 'this role'} — recommended for interview.` : `Needs improvement before applying for ${skills.role ?? 'this role'}.`,
          confidence: Math.min(85, rescores.overall + 10),
        });

        const review = await withStepTimeout(
          generateObjectWithFallback(RecruiterReviewSchema, reviewSystemPrompt, reviewUserPrompt, 600, 0.3, () => localReviewFallback()),
          'review', emit,
        ).catch((e) => { throw Object.assign(e instanceof Error ? e : new Error(String(e)), { _step: 'review', _hasStep: true }); });
        emit('step', { step: 'review', status: 'done', data: review });

        /* ── Step 6: Cover Letter ─── */
        const letterSystemPrompt = buildLetterSystemPrompt(skills.company);

        const letterUserPrompt = buildLetterUserPrompt({ skills, rescores, isLowCompat, rewrittenTail });

        let letterResult: AIProviderResult;
        try {
          letterResult = await withStepTimeout(
            AIProvider.generate({
              maxTokens: 1200,
              temperature: 0.7,
              system: letterSystemPrompt,
              prompt: letterUserPrompt,
            }),
            'letter', emit,
          );
        } catch (e) {
          if (isRateLimitError(e)) {
            console.warn('[Pipeline] AI rate limited on letter — using template');
            const role = skills.role ?? 'this role';
            const company = skills.company ?? 'this company';
            letterResult = {
              text: `Dear Hiring Manager,\n\nI am writing to express my strong interest in the ${role} position at ${company}. With my background and skills, I believe I would be a valuable addition to your team.\n\nI look forward to discussing how my experience aligns with the needs of ${company}.\n\nBest regards,\n[Your Name]`,
              model: 'fallback/template',
              latency: 0,
            };
          } else {
            throw Object.assign(e instanceof Error ? e : new Error(String(e)), { _step: 'letter', _hasStep: true });
          }
        }
        emit('letter-chunk', { text: letterResult.text });
        emit('step', { step: 'letter', status: 'done' });

        const { savedCoverLetterId } = await persistPipelineResults({
          supabase,
          uid,
          effectiveResumeId,
          originalResume,
          tailoredResume,
          originalScore: score,
          rescore: rescores,
          skills,
          letterText: letterResult.text,
        });

        const optimizationStatus = getOptimizationStatus(changedSections);

        emit('done', {
          overall: rescores.overall,
          previousOverall: score.overall,
          matched: rescores.matched?.length ?? 0,
          missing: rescores.missing?.length ?? 0,
          company: skills.company,
          role: skills.role,
          keywordsAdded: keywordsAdded.length,
          bulletsRewritten,
          compatibility: compatScore,
          isLowCompat,
          sectionsModified: changedSections,
          optimizationStatus,
          resumeId: effectiveResumeId ?? null,
          coverLetterId: savedCoverLetterId,
          sectionConfidence: perSectionConfidence,
          sectionChanges: perSectionChanges,
          sectionOutcomes,
          quality: { passed: qualityResult.passed, issues: qualityResult.issues, score: qualityResult.score },
          plan: {
            rewriteSummary: plan.rewriteSummary,
            rewriteExperience: plan.rewriteExperience,
            rewriteProjects: plan.rewriteProjects,
            rewriteSkills: plan.rewriteSkills,
            keywordsToInject: (plan.keywordsToInject as string[]).length,
            hardTruthNote: plan.hardTruthNote,
          },
          review: {
            wouldInterview: review.wouldInterview,
            score: review.score,
            strengths: review.strengths,
            weaknesses: review.weaknesses,
            genericAreas: review.genericAreas,
            recommendation: review.recommendation,
            confidence: review.confidence,
          },
          letterBody: letterResult.text,
        });
      } catch (e) {
        const err = e as PipelineError;
        const { message: errMsg, statusCode, reason } = classifyPipelineError(err);

        console.error('[Pipeline] Error:', JSON.stringify({ step: err._step || 'letter', message: errMsg, statusCode, name: err.name, reason }, null, 2));
        emit('error', {
          message: errMsg,
          reason,
          traceId: crypto.randomUUID?.() ?? `${Date.now()}`,
          step: err._hasStep ? (err._step ?? 'letter') : 'letter',
          provider: 'openrouter',
          statusCode,
          rawMessage: errMsg,
        });
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
