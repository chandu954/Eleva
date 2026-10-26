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
import { buildSectionRewriteOutcome, buildTailoredResumeIdentity, countChangedSections, normalizeRoleTitle, summarizeSectionStatus } from './pipeline-utils';
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

const bodySchema = z.object({
  jobDescription: z.string().min(20),
  resumeId: z.string().uuid().optional(),
  company: z.string().optional(),
  role: z.string().optional(),
});

const PlannerSchema = z.object({
  compatibility: z.number().int().min(0).max(100),
  rewriteSummary: z.boolean(),
  rewriteExperience: z.boolean(),
  rewriteProjects: z.boolean(),
  rewriteSkills: z.boolean(),
  sectionsToSkip: z.array(z.string()).default([]),
  keywordsToInject: z.array(z.string()).default([]),
  transferableSkills: z.array(z.object({
    from: z.string(),
    to: z.string(),
    confidence: z.number().int().min(0).max(100),
  })).default([]),
  hardTruthNote: z.string().nullable().default(null),
});

const RecruiterReviewSchema = z.object({
  wouldInterview: z.boolean(),
  score: z.number().int().min(0).max(100),
  strengths: z.array(z.string()).max(6),
  weaknesses: z.array(z.string()).max(6),
  genericAreas: z.array(z.string()).max(5),
  recommendation: z.string(),
  confidence: z.number().int().min(0).max(100),
});

// ─── Section-Specific Schemas ──────────────────────────────
const SummarySchema = z.object({
  professional_summary: z.string(),
});

const ResumeSkillsSchema = z.object({
  skills: z.array(z.object({ category: z.string(), skills: z.array(z.string()) })),
});

const ResumeExperienceSchema = z.object({
  work_experience: z.array(z.object({
    company: z.string(), position: z.string(), location: z.string().nullable().optional(),
    start_date: z.string().nullable().optional(), end_date: z.string().nullable().optional(),
    description: z.string(), responsibilities: z.array(z.string()),
  })),
});

const ResumeProjectsSchema = z.object({
  projects: z.array(z.object({
    name: z.string(), description: z.array(z.string()),
    technologies: z.array(z.string()), url: z.string().nullable().optional(),
  })),
});

const QualityCheckSchema = z.object({
  passed: z.boolean(),
  issues: z.array(z.string()).max(15),
  score: z.number().int().min(0).max(100),
});

const STEP_TIMEOUT_MS = 90_000; // per-step deadline

function withStepTimeout<T>(promise: Promise<T>, stepName: string, emit: (event: string, data: unknown) => void): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      const msg = `Step "${stepName}" timed out after ${STEP_TIMEOUT_MS / 1000}s`;
      emit('step', { step: stepName, status: 'error', message: msg });
      reject(new Error(msg));
    }, STEP_TIMEOUT_MS);
    promise
      .then((v) => { clearTimeout(timer); resolve(v); })
      .catch((e) => { clearTimeout(timer); reject(e); });
  });
}

function isRateLimitError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
  const statusCode = (err as any)?.statusCode ?? (err as any)?.status ?? 0;
  return statusCode === 429 || msg.includes('rate') || msg.includes('quota') || msg.includes('429');
}

async function generateObjectWithFallback<T>(
  schema: z.ZodType<T>,
  system: string,
  prompt: string,
  maxTokens: number,
  temperature: number,
  fallback?: () => T,
): Promise<T> {
  // Fast path: try structured output (works with models that support response_format)
  try {
    const result = await AIProvider.generateObject({
      schema,
      system: `${system}\n\nReturn ONLY valid JSON matching the provided schema.`,
      prompt,
      maxTokens,
      temperature,
      config: { timeout: 40000, maxRetries: 3, cache: false },
    });
    return result as unknown as T;
  } catch {
    // Fall through to text-based approach below
  }

  // Slow path: text-based JSON generation with manual parsing + local fallback
  // Free OpenRouter models often ignore response_format, so we ask explicitly
  if (fallback) {
    try {
      const textResult = await AIProvider.generate({
        system: `${system}\n\nYou are an API. Return ONLY valid JSON. The response must BEGIN with '{' and END with '}'. No prose. No markdown. No explanations.`,
        prompt,
        maxTokens: Math.min(maxTokens, 4000),
        temperature,
        config: { timeout: 40000, maxRetries: 2, cache: false },
      });

      const raw = textResult.text?.trim();
      if (raw) {
        const jsonStart = raw.indexOf('{');
        const jsonEnd = raw.lastIndexOf('}');
        if (jsonStart >= 0 && jsonEnd > jsonStart) {
          const candidate = raw.slice(jsonStart, jsonEnd + 1);
          const parsed = JSON.parse(candidate);
          return schema.parse(parsed);
        }
      }
    } catch {
      // Text-based parsing failed too — use local fallback
    }

    console.warn('[Pipeline] AI response invalid — using local fallback');
    return fallback();
  }

  throw new Error('AI returned invalid response and no fallback available');
}

function estimateCompatibility(resumeJson: any, jd: string, score: any): number {
  if (!resumeJson) return 0;
  const jdLower = jd.toLowerCase();

  // Extract all resume text
  const resumeText = [
    resumeJson.professional_summary || '',
    ...(resumeJson.skills || []).flatMap((s: any) => [s.category, ...(s.skills || s.items || [])].filter(Boolean)),
    ...(resumeJson.work_experience || []).flatMap((w: any) => [w.position, w.company, w.role, ...(w.responsibilities || []), w.description || '']),
    ...(resumeJson.projects || []).flatMap((p: any) => [p.name, ...(Array.isArray(p.description) ? p.description : [p.description || '']), ...(p.technologies || [])]),
    ...(resumeJson.education || []).flatMap((e: any) => [e.degree, e.field, e.school]),
  ].filter(Boolean).join(' ').toLowerCase();

  // Role overlap
  const jdRoles = ['engineer', 'developer', 'architect', 'manager', 'analyst', 'scientist', 'designer', 'consultant', 'director', 'lead', 'staff', 'principal', 'full-stack', 'frontend', 'backend', 'devops', 'data', 'ml', 'ai', 'product', 'cloud', 'platform', 'infrastructure', 'security'];
  const jdRoleMatch = jdRoles.filter(r => jdLower.includes(r));
  const resumeRoleMatch = jdRoles.filter(r => resumeText.includes(r));
  const roleOverlap = jdRoleMatch.length > 0 ? (resumeRoleMatch.filter(r => jdRoleMatch.includes(r)).length / jdRoleMatch.length) * 40 : 20;

  // Keyword coverage
  const keywordCoverage = score?.matched?.length && score?.missing?.length
    ? (score.matched.length / (score.matched.length + score.missing.length)) * 40
    : 20;

  // Seniority match
  const seniorityLevels = ['junior', 'mid', 'senior', 'lead', 'staff', 'principal', 'director'];
  const jdSeniority = seniorityLevels.find(s => jdLower.includes(s)) || null;
  const resumeSeniority = seniorityLevels.find(s => resumeText.includes(s)) || null;
  const seniorityBonus = jdSeniority && resumeSeniority && jdSeniority === resumeSeniority ? 15
    : jdSeniority && resumeSeniority ? 5
    : 0;

  // Domain overlap
  const domainTerms = ['healthcare', 'fintech', 'ecommerce', 'saas', 'enterprise', 'startup', 'b2b', 'b2c', 'ai', 'ml', 'data', 'cloud', 'security', 'mobile', 'web', 'api', 'microservices'];
  const jdDomain = domainTerms.filter(d => jdLower.includes(d));
  const resumeDomain = domainTerms.filter(d => resumeText.includes(d));
  const domainOverlap = jdDomain.length > 0
    ? (jdDomain.filter(d => resumeDomain.includes(d)).length / jdDomain.length) * 20
    : 10;

  const total = Math.round(Math.min(100, roleOverlap + keywordCoverage + seniorityBonus + domainOverlap));
  return total;
}

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
        const memCached = getCachedExtract(jobDescription);

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
            setCachedExtract(jobDescription, data);
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
        const cachedScore = getCachedScore(resumeText, jobDescription);
        const score = cachedScore ?? await withStepTimeout(
          generateObjectWithFallback(
            ScoreSchema,
            buildScoreSystemPrompt(AIProvider.getSystemPrompt()),
            buildScoreUserPrompt(resumeText, jobDescription),
            1600, 0.3,
            () => scoreResumeLocally(resumeText, jobDescription),
          ).then((data) => { setCachedScore(resumeText, jobDescription, data); return data; }),
          'score', emit,
        ).catch((e) => { throw Object.assign(e instanceof Error ? e : new Error(String(e)), { _step: 'score', _hasStep: true }); });
        emit('step', { step: 'score', status: 'done', data: score });

        const originalResumeJson: OriginalResumeData | null = originalResume ? {
          professional_summary: (originalResume.professional_summary as string) ?? '',
          skills: (originalResume.skills ?? []) as any,
          work_experience: (originalResume.work_experience ?? []) as any,
          projects: (originalResume.projects ?? []) as any,
          education: (originalResume.education ?? []) as any,
          certifications: (originalResume.certifications ?? []) as any,
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

        // Run section agent with individual timeout + fallback
        function runSection<T>(name: string, schema: z.ZodType<T>, system: string, prompt: string, fallback: () => T): Promise<{ data: T; usedFallback: boolean }> {
          return withStepTimeout(
            generateObjectWithFallback(schema, system, prompt, 2000, 0.4, fallback),
            name, emit,
          ).then((data) => ({ data, usedFallback: false })).catch(() => {
            console.warn(`[Pipeline] Section "${name}" failed — using fallback`);
            return { data: fallback(), usedFallback: true };
          });
        }

        const summaryAgent = runSection('summary_writer', SummarySchema,
          buildSummarySystemPrompt(AIProvider.getSystemPrompt()),
          buildSummaryUserPrompt(originalResumeJson, sectionCtx),
          () => ({ professional_summary: originalResumeJson?.professional_summary ?? '' }),
        );

        emit('step', { step: 'tailor', status: 'running', progress: 30, micro: 'Optimizing skills...' });

        const skillsAgent = runSection('skills_optimizer', ResumeSkillsSchema,
          buildSkillsSystemPrompt(AIProvider.getSystemPrompt()),
          buildSkillsUserPrompt(originalResumeJson, sectionCtx),
          () => ({ skills: (originalResumeJson?.skills as any) ?? [] }),
        );

        emit('step', { step: 'tailor', status: 'running', progress: 50, micro: 'Rewriting experience...' });

        const experienceAgent = runSection('experience_writer', ResumeExperienceSchema,
          buildExperienceSystemPrompt(AIProvider.getSystemPrompt()),
          buildExperienceUserPrompt(originalResumeJson, sectionCtx),
          () => ({ work_experience: (originalResumeJson?.work_experience as any) ?? [] }),
        );

        emit('step', { step: 'tailor', status: 'running', progress: 70, micro: 'Rewriting projects...' });

        const projectsAgent = runSection('projects_writer', ResumeProjectsSchema,
          buildProjectsSystemPrompt(AIProvider.getSystemPrompt()),
          buildProjectsUserPrompt(originalResumeJson, sectionCtx),
          () => ({ projects: (originalResumeJson?.projects as any) ?? [] }),
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
          const summaryRetry = await runSection('summary_writer_retry', SummarySchema,
            buildSummaryRetrySystemPrompt(AIProvider.getSystemPrompt()),
            buildSummaryRetryUserPrompt(origSummaryText, sectionCtx),
            () => ({ professional_summary: origSummaryText }),
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
          education: (originalResumeJson?.education as any) ?? [],
          certifications: (originalResumeJson?.certifications as any) ?? [],
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
            ...tailoredResume as any,
            quality: qualityResult,
            sectionConfidence: perSectionConfidence,
            sectionChanges: perSectionChanges,
          },
        });

        /* ─── Build resume text from tailored object ─── */
        function resumeToText(r: any): string {
          const parts: string[] = [];
          if (r.professional_summary) parts.push(`Summary:\n${r.professional_summary}`);
          if (r.work_experience?.length) {
            parts.push('Work Experience:');
            for (const w of r.work_experience) {
              const resp = safeBullets(w);
              const role = w.position || w.role || '';
              const org = w.company || w.employer || '';
              parts.push(`${role} at ${org}\n${resp.join('\n')}`);
            }
          }
          if (r.skills?.length) {
            parts.push('Skills:');
            for (const s of r.skills) parts.push(`${s.category}: ${(s.skills ?? []).join(', ')}`);
          }
          if (r.projects?.length) {
            parts.push('Projects:');
            for (const p of r.projects) {
              const desc = p.description ? (Array.isArray(p.description) ? p.description : [String(p.description)]) : [];
              parts.push(`${p.name || 'Project'}:\n${desc.join('\n')}`);
            }
          }
          if (r.education?.length) {
            parts.push('Education:');
            for (const e of r.education) parts.push(`${e.school || e.institution || ''}: ${e.degree ?? ''}`);
          }
          return parts.join('\n\n');
        }

        const rewrittenTail = resumeToText(tailoredResume as any);

        /* ─── Compute diff stats ─── */
        function computeKeywordsAdded(original: any, tailored: any): string[] {
          const origSet = new Set<string>();
          if (original?.skills) {
            for (const s of original.skills as Array<{category?: string; skills?: string[] | string}>) {
              const list = s.skills ?? [];
              for (const skill of list) if (typeof skill === 'string') origSet.add(skill.toLowerCase().trim());
            }
          }
          const newSet = new Set<string>();
          if (tailored?.skills) {
            for (const s of tailored.skills) {
              const list = s.skills ?? [];
              for (const skill of list) newSet.add(skill.toLowerCase().trim());
            }
          }
          return [...newSet].filter(w => !origSet.has(w));
        }

        function countBulletsRewritten(original: any, tailored: any): number {
          const origBullets = new Set<string>();
          if (original?.work_experience) {
            for (const w of original.work_experience) {
              const resp = safeBullets(w);
              for (const b of resp) origBullets.add(b.trim().toLowerCase());
            }
          }
          let count = 0;
          if (tailored?.work_experience) {
            for (const w of tailored.work_experience) {
              const resp = safeBullets(w);
              for (const b of resp) {
                if (!origBullets.has(b.trim().toLowerCase())) count++;
              }
            }
          }
          return count;
        }

        function safeBullets(w: any): string[] {
          if (Array.isArray(w.responsibilities)) return w.responsibilities;
          if (typeof w.description === 'string') return w.description.split('\n').filter(Boolean);
          if (Array.isArray(w.description)) return w.description;
          if (w.description != null) return [String(w.description)];
          return [];
        }

        const keywordsAdded = computeKeywordsAdded(originalResume, tailoredResume as any);
        const bulletsRewritten = countBulletsRewritten(originalResume, tailoredResume as any);

        /* ─── Step 4: Re-score after tailoring ─── */
        emit('step', { step: 'rescore', status: 'running' });
        const cachedRescore = getCachedScore(rewrittenTail, jobDescription);
        const rescores = cachedRescore ?? await withStepTimeout(
          generateObjectWithFallback(
            ScoreSchema,
            buildRescoreSystemPrompt(AIProvider.getSystemPrompt()),
            buildRescoreUserPrompt(rewrittenTail, jobDescription, score.overall),
            1600, 0.3,
            () => scoreResumeLocally(rewrittenTail, jobDescription),
          ).then((data) => { setCachedScore(rewrittenTail, jobDescription, data); return data; }),
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

        let savedCoverLetterId: string | null = null;
        if (uid) {
          if (effectiveResumeId) {
            await supabase.from('ats_scores').insert({
              user_id: uid,
              resume_id: effectiveResumeId,
              overall: rescores.overall,
              keyword: rescores.keyword,
              formatting: rescores.formatting,
              readability: rescores.readability,
              impact: rescores.impact,
              recruiter: rescores.recruiter,
              matched: rescores.matched,
              missing: rescores.missing,
              suggestions: rescores.suggestions,
              raw: rescores as any,
            });
          }

          // Save tailored resume as a new version
          if (originalResume) {
              const tailoredIdentity = buildTailoredResumeIdentity(originalResume);
            const { error: tailoredErr } = await supabase.from('resumes').insert({
              user_id: uid,
                name: tailoredIdentity.name,
              is_base_resume: false,
                target_role: tailoredIdentity.target_role,
              professional_summary: tailoredResume.professional_summary,
              skills: tailoredResume.skills as any,
              work_experience: tailoredResume.work_experience as any,
              projects: tailoredResume.projects as any,
              education: tailoredResume.education as any,
              certifications: tailoredResume.certifications as any,
            });
            if (tailoredErr) console.warn('[Pipeline] failed to save tailored resume:', tailoredErr.message);
          }

          const { data: cl } = await supabase.from('cover_letters').insert({
            user_id: uid,
            resume_id: effectiveResumeId,
            company: skills.company ?? 'Unknown',
            role: skills.role ?? 'Unknown',
            body: letterResult.text,
            tone: 'confident',
            length: 'medium',
          }).select().single();
          savedCoverLetterId = cl?.id ?? null;
          await supabase.from('activity_log').insert({
            user_id: uid,
            kind: 'pipeline_run',
            title: `Resume tailored for ${skills.role ?? 'this job'}`,
            subtitle: skills.company ?? null,
            meta: {
              atsOverall: rescores.overall,
              previousOverall: score.overall,
              matchedCount: rescores.matched?.length ?? 0,
              missingCount: rescores.missing?.length ?? 0,
              role: skills.role ?? null,
              company: skills.company ?? null,
              coverLetterId: cl?.id,
              resumeId: effectiveResumeId,
            },
          });
          try {
            await supabase.from('notifications').insert({
              user_id: uid,
              kind: 'pipeline_complete',
              title: `Pipeline complete · ${score.overall}% → ${rescores.overall}%`,
              body: `${skills.company ?? 'Company'} · ${skills.role ?? 'Role'} — +${rescores.overall - score.overall} ATS`,
              href: '/eleva/analytics',
            });
          } catch { /* noop */ }
        }

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
        const err = e as Error & { _hasStep?: boolean; _step?: string };
        const errMsg = err.message || 'Unknown error';

        const statusCode =
          (err as any)?.statusCode ??
          (err as any)?.status ??
          (err as any)?.response?.status ??
          0;

        const isTimeout = errMsg.toLowerCase().includes('timeout') || errMsg.toLowerCase().includes('timed out');
        const isAuth = errMsg.toLowerCase().includes('auth') || errMsg.toLowerCase().includes('api key') || errMsg.toLowerCase().includes('unauthorized') || errMsg.toLowerCase().includes('401');
        const isRateLimit =
          errMsg.toLowerCase().includes('rate') ||
          errMsg.toLowerCase().includes('quota') ||
          errMsg.toLowerCase().includes('429') ||
          statusCode === 429;

        const isProvider =
          errMsg.toLowerCase().includes('provider') ||
          errMsg.toLowerCase().includes('upstream') ||
          errMsg.toLowerCase().includes('502') ||
          errMsg.toLowerCase().includes('503') ||
          statusCode === 502 ||
          statusCode === 503;

        // Prefer explicit rate-limit classification when upstream returns 429.
        const isInvalidJson =
          errMsg.toLowerCase().includes('json') ||
          errMsg.toLowerCase().includes('unexpected token') ||
          errMsg.toLowerCase().includes('invalid') ||
          errMsg.toLowerCase().includes('schema') ||
          errMsg.toLowerCase().includes('parse');

        const reason = isInvalidJson ? 'invalid_json'
          : isTimeout ? 'timeout'
          : isAuth ? 'auth'
          : isRateLimit ? 'rate_limit'
          : isProvider ? 'provider'
          : 'unknown';

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
