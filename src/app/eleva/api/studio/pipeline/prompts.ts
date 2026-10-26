/**
 * Prompt builders for the studio pipeline route.
 *
 * Pure string builders pulled out of route.ts so the prompts are inspectable
 * and testable without a running provider. Byte-for-byte identical to the
 * inline template literals they replace (pinned by prompts.test.ts).
 *
 * The base system prompt is injected by the caller (AIProvider.getSystemPrompt
 * in route.ts) rather than imported here: prompts.ts stays free of provider
 * wiring, so tests exercise every builder with a stub base and no network
 * code on the module graph.
 *
 * Naming: all templates hard-cap long inputs the same way the originals did
 * (slice on the JD, resume text, JSON blobs) — those caps are part of the
 * prompt contract and are asserted in tests.
 */

import type { z } from 'zod';
import type { ScoreSchema, ExtractSchema } from './cache';

export type JdSignal = z.infer<typeof ExtractSchema>;
export type ScoreData = z.infer<typeof ScoreSchema>;

/** Shape of the resume row subset route.ts assembles for prompt context. */
export interface OriginalResumeData {
  professional_summary: string;
  skills: unknown;
  work_experience: unknown;
  projects: unknown;
  education: unknown;
  certifications: unknown;
}

/** Fields the planner/plan fallback uses in prompts. Planner schema defaults may be absent in this inference, so both fields are optional. */
export interface PlanData {
  keywordsToInject?: string[];
  hardTruthNote?: string | null;
}

/** Shared context for the four section-writer agents. */
export interface SectionContext {
  jd: string;
  role: string;
  company: string;
  jdSummary: string;
  matched: string;
  missing: string;
  planKeywords: string;
  planHardTruth: string;
  compatNote: string;
}

export function buildSectionContext({
  jobDescription,
  skills,
  score,
  plan,
  isLowCompat,
}: {
  jobDescription: string;
  skills: JdSignal;
  score: Pick<ScoreData, 'matched' | 'missing'>;
  plan: PlanData;
  isLowCompat: boolean;
}): SectionContext {
  return {
    jd: jobDescription.slice(0, 2000),
    role: skills.role ?? '',
    company: skills.company ?? '',
    jdSummary: skills.summary ?? '',
    matched: (score.matched ?? []).slice(0, 15).join(', '),
    missing: (score.missing ?? []).slice(0, 15).join(', '),
    planKeywords: (plan.keywordsToInject ?? []).join(', '),
    planHardTruth: plan.hardTruthNote ?? '',
    compatNote: isLowCompat ? 'Note: This role differs from your background. Use transferable skills only.' : '',
  };
}

// ─── Step 1: Extract ─────────────────────────────────────────────

export function buildExtractSystemPrompt(base: string): string {
  return `${base}

Extract structured signal from a JD.

CRITICAL OUTPUT RULES:
- Return ONLY valid JSON.
- The first character of the response MUST be '{'.
- The response MUST contain ONLY this JSON object (no surrounding text).
- Include exactly these keys: company, role, required_skills, nice_to_have, summary.
- Missing values: company/role = null, required_skills/nice_to_have = [], summary = "".
- Role title must be concise and job-title-like.
- Do NOT copy paragraphs, sales copy, or responsibilities into role.
- GOOD examples: Senior Full Stack Engineer, Backend Engineer, Software Engineer.
- BAD examples: Lead our full-stack solution is based on modern server...
`;
}

export function buildExtractUserPrompt(jobDescription: string): string {
  return `Job Description:\n${jobDescription.slice(0, 6000)}`;
}

// ─── Step 2: Score ───────────────────────────────────────────────

export function buildScoreSystemPrompt(base: string): string {
  return `${base}

Score this resume vs JD. 0-100 scale on each axis. Missing = technologies/keywords absent from resume. Suggestions must be action-first.`;
}

export function buildScoreUserPrompt(resumeText: string, jobDescription: string): string {
  return `Resume:\n${resumeText.slice(0, 6000) || '[No resume attached — score based on JD only]'}\n\nJD:\n${jobDescription.slice(0, 4000)}`;
}

// ─── Step 3: Plan ────────────────────────────────────────────────

export function buildPlanSystemPrompt(base: string): string {
  return `${base}

You are an optimization strategist for resume tailoring. Analyze the resume, job description, and ATS score, then produce a structured plan.

Determine:
1. Which resume sections need rewriting (summary, experience, projects, skills)
2. Which sections to skip (e.g. education if it already matches well)
3. Keywords to inject — prioritize missing keywords that map to transferable skills in the resume
4. Transferable skill mappings — for each significant resume skill, map it to a JD-relevant concept with confidence level
5. A hard truth note — if compatibility is low, explain honestly what cannot be added

Rules:
- NEVER recommend fabricating technologies absent from the resume
- Be realistic about transferable skills (SQL → "database expertise" ✓, SQL → "AWS DynamoDB" ✗)
- For low compatibility (<35%), prioritize honest transferable mapping over keyword injection
- Keywords to inject should come ONLY from the missing keywords list, filtered by feasibility

Return valid JSON matching the schema. The response must start with '{' and end with '}'.`;
}

export function buildPlanUserPrompt({
  resumeJson,
  jobDescription,
  score,
  compatScore,
  isLowCompat,
}: {
  resumeJson: OriginalResumeData | null;
  jobDescription: string;
  score: Pick<ScoreData, 'overall' | 'keyword' | 'impact' | 'matched' | 'missing'>;
  compatScore: number;
  isLowCompat: boolean;
}): string {
  return `ORIGINAL RESUME:
${JSON.stringify(resumeJson, null, 2)}

JOB DESCRIPTION:
${jobDescription.slice(0, 3000)}

CURRENT ATS SCORE: ${score.overall}%
KEYWORD SCORE: ${score.keyword}%
IMPACT SCORE: ${score.impact}%

MATCHED KEYWORDS: ${(score.matched as string[] ?? []).slice(0, 15).join(', ')}
MISSING KEYWORDS: ${(score.missing as string[] ?? []).slice(0, 20).join(', ')}

COMPATIBILITY: ${compatScore}%
${isLowCompat ? 'NOTE: This role differs significantly from the resume domain. Focus on transferable skills, not keyword injection.' : ''}

Generate an optimization plan for this resume. Return valid JSON.`;
}

// ─── Step 4a: Summary writer ─────────────────────────────────────

export function buildSummarySystemPrompt(base: string): string {
  return `${base}

You are a Professional Summary expert. Rewrite the summary for this specific job application.

Rules:
- Keep it 3-5 sentences
- Start with years of experience + role alignment
- Mention 2-3 relevant technologies present in the resume
- Include business impact language (e.g. "improved X by Y%")
- Never fabricate experience, metrics, or technologies
- Use missing keywords only for tone context — inject only what the resume supports`;
}

export function buildSummaryUserPrompt(
  originalResumeJson: OriginalResumeData | null,
  ctx: SectionContext,
): string {
  return `ORIGINAL SUMMARY: ${originalResumeJson?.professional_summary ?? ''}

JOB: ${ctx.role} at ${ctx.company}
JD SUMMARY: ${ctx.jdSummary}
MATCHED: ${ctx.matched}
MISSING: ${ctx.missing}
PLAN KEYWORDS: ${ctx.planKeywords}
${ctx.compatNote}
${ctx.planHardTruth ? `HARD TRUTH: ${ctx.planHardTruth}` : ''}

Return JSON: { professional_summary: "rewritten text" }`;
}

/** Harder retry used when the first summary pass returned the original text unchanged. */
export function buildSummaryRetrySystemPrompt(base: string): string {
  return `${base}\n\nYou are a Professional Summary expert. Rewrite the summary for this specific job application.\n\nRules:\n- Keep it 3-5 sentences\n- Start with years of experience + role alignment\n- Mention 2-3 relevant technologies present in the resume\n- Include business impact language\n- Never fabricate experience, metrics, or technologies\n- Do NOT keep the original wording\n- Make the rewrite obviously different in structure and wording while staying truthful`;
}

export function buildSummaryRetryUserPrompt(origSummaryText: string, ctx: SectionContext): string {
  return `ORIGINAL SUMMARY: ${origSummaryText}\n\nJOB: ${ctx.role} at ${ctx.company}\nJD SUMMARY: ${ctx.jdSummary}\nMATCHED: ${ctx.matched}\nMISSING: ${ctx.missing}\nPLAN KEYWORDS: ${ctx.planKeywords}\n${ctx.compatNote}\n${ctx.planHardTruth ? `HARD TRUTH: ${ctx.planHardTruth}` : ''}\n\nReturn JSON: { professional_summary: "rewritten text" }`;
}

// ─── Step 4b: Skills optimizer ───────────────────────────────────

export function buildSkillsSystemPrompt(base: string): string {
  return `${base}

You are a Skills optimization expert. Reorder and recategorize skills for ATS matching.

Rules:
- Reorder categories: put JD-relevant ones first (e.g. Programming, Cloud, Data)
- Within categories, list JD-matched skills first
- Keep ALL original skills — never remove or rename technologies
- Never fabricate skills
- Return the same total skill set, just restructured`;
}

export function buildSkillsUserPrompt(
  originalResumeJson: OriginalResumeData | null,
  ctx: SectionContext,
): string {
  return `ORIGINAL SKILLS: ${JSON.stringify(originalResumeJson?.skills ?? [])}
JOB: ${ctx.role}
MATCHED: ${ctx.matched}
MISSING: ${ctx.missing}

Return JSON: { skills: [{ category: string, skills: string[] }] }`;
}

// ─── Step 4c: Experience writer ──────────────────────────────────

export function buildExperienceSystemPrompt(base: string): string {
  return `${base}

You are an Experience section expert. Rewrite each work entry's bullets for this job.

Rules:
- Every bullet starts with a strong action verb (Designed, Implemented, Led, Optimized)
- Add measurable impact where possible
- Weave in matched ATS keywords naturally
- For transferable skills: describe adjacent concepts honestly
- NEVER change company, dates, title, or location
- NEVER add new entries — same number of entries, same companies/positions
- Return the same structure with improved bullet descriptions`;
}

export function buildExperienceUserPrompt(
  originalResumeJson: OriginalResumeData | null,
  ctx: SectionContext,
): string {
  return `ORIGINAL EXPERIENCE: ${JSON.stringify(originalResumeJson?.work_experience ?? [])}
JOB: ${ctx.role} at ${ctx.company}
JD SUMMARY: ${ctx.jdSummary}
MATCHED: ${ctx.matched}
MISSING (transferable only): ${ctx.missing}
PLAN KEYWORDS: ${ctx.planKeywords}
${ctx.compatNote}

Return JSON: { work_experience: [{ company, position, location, start_date, end_date, description, responsibilities }] }`;
}

// ─── Step 4d: Projects writer ────────────────────────────────────

export function buildProjectsSystemPrompt(base: string): string {
  return `${base}

You are a Projects section expert. Restructure each project for impact.

Rules:
- Each project: Problem → Solution → Technology → Impact
- Improve wording and technical depth
- Never fabricate metrics, names, or technologies
- Keep same number of projects and same names`;
}

export function buildProjectsUserPrompt(
  originalResumeJson: OriginalResumeData | null,
  ctx: SectionContext,
): string {
  return `ORIGINAL PROJECTS: ${JSON.stringify(originalResumeJson?.projects ?? [])}
JOB: ${ctx.role}
JD SUMMARY: ${ctx.jdSummary}
MATCHED: ${ctx.matched}

Return JSON: { projects: [{ name, description: string[], technologies: string[], url }] }`;
}

// ─── Step 4e: Quality check ──────────────────────────────────────

export function buildQualitySystemPrompt(base: string): string {
  return `${base}

You are a Resume Quality Analyst. Validate this tailored resume.

Check for:
1. Grammar & spelling errors
2. Strong action verbs — flag weak verbs like "was", "worked on", "responsible for"
3. Duplicate or repetitive bullets across entries
4. ATS compliance (clean formatting, no tables/columns)
5. Measurable impact in at least 60% of bullets
6. Consistent tense throughout

Be strict. Set passed=false if major issues found. Score 0-100.`;
}

export function buildQualityUserPrompt(original: unknown, tailored: unknown): string {
  return `ORIGINAL:
${JSON.stringify(original, null, 2).slice(0, 1500)}

TAILORED:
${JSON.stringify(tailored, null, 2).slice(0, 2500)}

Validate resume quality. Return JSON.`;
}

// ─── Step 4f: Re-score ───────────────────────────────────────────

export function buildRescoreSystemPrompt(base: string): string {
  return `${base}\n\nRe-score this tailored resume vs JD. Compare improvement. 0-100 scale.`;
}

export function buildRescoreUserPrompt(rewrittenTail: string, jobDescription: string, previousOverall: number): string {
  return `Rewritten Resume:\n${rewrittenTail.slice(0, 5000)}\n\nJD:\n${jobDescription.slice(0, 4000)}\n\nPrevious score: ${previousOverall}%`;
}

// ─── Step 5: Recruiter review ────────────────────────────────────

export function buildReviewSystemPrompt(base: string): string {
  return `${base}

You are a Senior Engineering Manager reviewing a tailored resume. Be brutally honest.

Answer:
1. Would you interview this candidate? (yes/no)
2. Rate the resume 0-100 overall
3. Top strengths (max 6 specific items)
4. Top weaknesses (max 6 — what's missing, generic, or weak)
5. What sounds generic or templated (max 5 items)
6. Overall recommendation (1-2 sentences)
7. Confidence in assessment 0-100

Be specific. Reference actual resume content. Do not be overly polite — identify real gaps.`;
}

export function buildReviewUserPrompt({
  skills,
  rewrittenTail,
  rescores,
}: {
  skills: JdSignal;
  rewrittenTail: string;
  rescores: ScoreData;
}): string {
  return `JOB: ${skills.role ?? 'Unknown'} at ${skills.company ?? 'Unknown'}
JD SUMMARY: ${skills.summary ?? ''}

TAILORED RESUME:
${rewrittenTail.slice(0, 3500)}

ATS RESCORE:
- Overall: ${rescores.overall}%
- Keyword: ${rescores.keyword}%
- Impact: ${rescores.impact}%
- Readability: ${rescores.readability}%
- Matched: ${(rescores.matched as string[] ?? []).slice(0, 10).join(', ')}
- Missing: ${(rescores.missing as string[] ?? []).slice(0, 10).join(', ')}

Review this resume as a Senior Engineering Manager. Return JSON.`;
}

// ─── Step 6: Cover letter ────────────────────────────────────────

export function buildLetterSystemPrompt(company: string | null | undefined): string {
  return `Write a personalized cover letter for this specific job application. Rules:
- Reference the company and role by name in the opening paragraph
- Mention 2-3 specific skills or experiences from the tailored resume that are relevant to the role
- Connect the candidate's background to the company's mission/industry (${company ?? 'the company'})
- Use a confident, professional tone
- Never use generic phrases like "I am writing to express interest" — instead start with something specific to the role
- Keep it 3-4 paragraphs, plain text, no markdown
- Close with a forward-looking statement about contributing to the team
- Do not fabricate specific accomplishments if they aren't in the resume`;
}

export function buildLetterUserPrompt({
  skills,
  rescores,
  isLowCompat,
  rewrittenTail,
}: {
  skills: JdSignal;
  rescores: Pick<ScoreData, 'matched' | 'missing'>;
  isLowCompat: boolean;
  rewrittenTail: string;
}): string {
  return `Job: ${skills.role ?? 'this role'} at ${skills.company ?? 'this company'}
JD Summary: ${skills.summary ?? ''}
Key Skills to Mention: ${rescores.matched?.slice(0, 8).join(', ') ?? ''}
Missing Skills (do NOT claim): ${rescores.missing?.slice(0, 5).join(', ') ?? ''}
${isLowCompat ? 'Note: The resume is from a different domain. Focus on transferable skills and enthusiasm for transitioning.' : ''}

Tailored Resume:
${rewrittenTail.slice(0, 2000)}

Write a personalized cover letter for this application.`;
}
