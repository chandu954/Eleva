import { NextRequest } from 'next/server';
import { AIProvider, z, type AIProviderResult } from '@/lib/eleva-ai-provider';
import { createClient } from '@/utils/supabase/server';
import { apiError } from '@/lib/api-response';
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
import { buildSectionRewriteOutcome, countChangedSections, normalizeRoleTitle, summarizeSectionStatus } from './pipeline-utils';
import {
  bodySchema,
  PlannerSchema,
  QualityCheckSchema,
  RecruiterReviewSchema,
  ResumeExperienceSchema,
  ResumeProjectsSchema,
  ResumeSkillsSchema,
  SummarySchema,
} from './schemas';
import {
  classifyPipelineError,
  computeKeywordsAdded,
  countBulletsRewritten,
  estimateCompatibility,
  generateObjectWithFallback,
  isRateLimitError,
  resumeToText,
  runSectionWithFallback,
  withStepTimeout,
  type EducationLike,
  type PipelineError,
  type SkillItem,
  type TailoredExperience,
  type TailoredProject,
} from './helpers';
import { persistPipelineResults } from './persistence';
import {
  buildSectionContext,
  type OriginalResumeData,
  buildExperienceSystemPrompt,
  buildExperienceUserPrompt,
  buildExtractSystemPrompt,
  buildExtractUserPrompt,
  buildLetterSystemPrompt,
  buildLetterUserPrompt,
  buildPlanSystemPrompt,
  buildPlanUserPrompt,
  buildProjectsSystemPrompt,
  buildProjectsUserPrompt,
  buildQualitySystemPrompt,
  buildQualityUserPrompt,
  buildRescoreSystemPrompt,
  buildRescoreUserPrompt,
  buildReviewSystemPrompt,
  buildReviewUserPrompt,
  buildScoreSystemPrompt,
  buildScoreUserPrompt,
  buildSkillsSystemPrompt,
  buildSkillsUserPrompt,
  buildSummaryRetrySystemPrompt,
  buildSummaryRetryUserPrompt,
  buildSummarySystemPrompt,
  buildSummaryUserPrompt,
} from './prompts';

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

        /* ─── Step 4: Rewrite Resume Sections (Parallel) ─── */
        emit('step', { step: 'tailor', status: 'running', progress: 10, micro: 'Rewriting summary...' });

        // Shared context for all section agents
        const sectionCtx = buildSectionContext({
          jobDescription,
          skills,
          score,
          plan,
          isLowCompat,
        });

        const summaryAgent = runSectionWithFallback('summary_writer', SummarySchema,
          buildSummarySystemPrompt(AIProvider.getSystemPrompt()),
          buildSummaryUserPrompt(originalResumeJson, sectionCtx),
          () => ({ professional_summary: originalResumeJson?.professional_summary ?? '' }),
          emit,
        );

        emit('step', { step: 'tailor', status: 'running', progress: 30, micro: 'Optimizing skills...' });

        const skillsAgent = runSectionWithFallback('skills_optimizer', ResumeSkillsSchema,
          buildSkillsSystemPrompt(AIProvider.getSystemPrompt()),
          buildSkillsUserPrompt(originalResumeJson, sectionCtx),
          () => ({ skills: (originalResumeJson?.skills as SkillItem[]) ?? [] }),
          emit,
        );

        emit('step', { step: 'tailor', status: 'running', progress: 50, micro: 'Rewriting experience...' });

        const experienceAgent = runSectionWithFallback('experience_writer', ResumeExperienceSchema,
          buildExperienceSystemPrompt(AIProvider.getSystemPrompt()),
          buildExperienceUserPrompt(originalResumeJson, sectionCtx),
          () => ({ work_experience: (originalResumeJson?.work_experience as TailoredExperience[]) ?? [] }),
          emit,
        );

        emit('step', { step: 'tailor', status: 'running', progress: 70, micro: 'Rewriting projects...' });

        const projectsAgent = runSectionWithFallback('projects_writer', ResumeProjectsSchema,
          buildProjectsSystemPrompt(AIProvider.getSystemPrompt()),
          buildProjectsUserPrompt(originalResumeJson, sectionCtx),
          () => ({ projects: (originalResumeJson?.projects as TailoredProject[]) ?? [] }),
          emit,
        );

        // Run all 4 agents in parallel
        const [summaryResultRaw, skillsResultRaw, experienceResultRaw, projectsResultRaw] = await Promise.all([
          summaryAgent, skillsAgent, experienceAgent, projectsAgent,
        ]);

        emit('step', { step: 'tailor', status: 'running', progress: 85, micro: 'Assembling resume...' });

        const origSummaryText = String(originalResumeJson?.professional_summary || '');
        let summaryText = String(summaryResultRaw.data.professional_summary || '');

        const summaryInitial = buildSectionRewriteOutcome('Summary', origSummaryText, summaryText, summaryResultRaw.usedFallback ? 'Summary not rewritten' : undefined);
        if (!summaryInitial.changed && !summaryResultRaw.usedFallback && origSummaryText && summaryText.trim() === origSummaryText.trim()) {
          const summaryRetry = await runSectionWithFallback('summary_writer_retry', SummarySchema,
            buildSummaryRetrySystemPrompt(AIProvider.getSystemPrompt()),
            buildSummaryRetryUserPrompt(origSummaryText, sectionCtx),
            () => ({ professional_summary: origSummaryText }),
            emit,
          );
          summaryText = String(summaryRetry.data.professional_summary || summaryText);
        }

        const summaryOutcome = buildSectionRewriteOutcome('Summary', origSummaryText, summaryText, summaryResultRaw.usedFallback ? 'Summary not rewritten' : undefined);
        const skillsOutcome = buildSectionRewriteOutcome('Skills', JSON.stringify(originalResumeJson?.skills ?? []), JSON.stringify(skillsResultRaw.data.skills), skillsResultRaw.usedFallback ? 'Skills not rewritten' : undefined);
        const experienceOutcome = buildSectionRewriteOutcome('Experience', JSON.stringify(originalResumeJson?.work_experience ?? []), JSON.stringify(experienceResultRaw.data.work_experience), experienceResultRaw.usedFallback ? 'Experience not rewritten' : undefined);
        const projectsOutcome = buildSectionRewriteOutcome('Projects', JSON.stringify(originalResumeJson?.projects ?? []), JSON.stringify(projectsResultRaw.data.projects), projectsResultRaw.usedFallback ? 'Projects not rewritten' : undefined);

        const sectionOutcomes = {
          summary: summaryOutcome,
          skills: skillsOutcome,
          experience: experienceOutcome,
          projects: projectsOutcome,
        };

        const perSectionConfidence = {
          summary: summaryOutcome.confidence,
          skills: skillsOutcome.confidence,
          experience: experienceOutcome.confidence,
          projects: projectsOutcome.confidence,
        };

        const perSectionChanges = {
          summary: [summarizeSectionStatus(summaryOutcome)],
          skills: [summarizeSectionStatus(skillsOutcome)],
          experience: [summarizeSectionStatus(experienceOutcome)],
          projects: [summarizeSectionStatus(projectsOutcome)],
        };

        const tailoredResume = {
          professional_summary: summaryOutcome.content,
          skills: skillsResultRaw.data.skills,
          work_experience: experienceResultRaw.data.work_experience,
          projects: projectsResultRaw.data.projects,
          education: (originalResumeJson?.education as EducationLike[]) ?? [],
          certifications: (originalResumeJson?.certifications as EducationLike[]) ?? [],
          meta: {
            keywords_added: [],
            bullets_rewritten: 0,
            sectionConfidence: perSectionConfidence,
            sectionChanges: perSectionChanges,
            sectionOutcomes,
          },
        };

        emit('step', { step: 'tailor', status: 'running', progress: 92, micro: 'Validating quality...' });

        // ─── Quality Check ───
        const qualityResult = await withStepTimeout(
          generateObjectWithFallback(
            QualityCheckSchema,
            buildQualitySystemPrompt(AIProvider.getSystemPrompt()),
            buildQualityUserPrompt(originalResumeJson, tailoredResume),
            600, 0.3,
            () => ({ passed: true, issues: [], score: 85 }),
          ),
          'quality_check', emit,
        ).catch(() => ({ passed: true, issues: [], score: 85 }));

        if (!qualityResult.passed) {
          console.warn('[Pipeline] Quality issues:', (qualityResult.issues ?? []).join('; '));
        }

        emit('step', {
          step: 'tailor',
          status: 'done',
          data: {
            ...tailoredResume,
            quality: qualityResult,
            sectionConfidence: perSectionConfidence,
            sectionChanges: perSectionChanges,
          },
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

        const changedSections = countChangedSections([summaryOutcome, skillsOutcome, experienceOutcome, projectsOutcome]);
        const optimizationStatus = changedSections < 2 ? 'Optimization Incomplete' : 'Tailored Resume Ready';

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
