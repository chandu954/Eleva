import { AIProvider, z } from '@/lib/eleva-ai-provider';

import type { OriginalResumeData, ScoreData } from './prompts';

export const STEP_TIMEOUT_MS = 90_000;

export function withStepTimeout<T>(promise: Promise<T>, stepName: string, emit: (event: string, data: unknown) => void): Promise<T> {
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

export function isRateLimitError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
  const fields = err as { statusCode?: number; status?: number };
  const statusCode = fields.statusCode ?? fields.status ?? 0;
  return statusCode === 429 || msg.includes('rate') || msg.includes('quota') || msg.includes('429');
}

export function runSectionWithFallback<T>(
  name: string,
  schema: z.ZodType<T>,
  system: string,
  prompt: string,
  fallback: () => T,
  emit: (event: string, data: unknown) => void,
): Promise<{ data: T; usedFallback: boolean }> {
  let usedFallback = false;
  const guardedFallback = () => {
    usedFallback = true;
    return fallback();
  };

  return withStepTimeout(
    generateObjectWithFallback(schema, system, prompt, 2000, 0.4, guardedFallback),
    name, emit,
  ).then((data) => ({ data, usedFallback })).catch(() => {
    console.warn(`[Pipeline] Section "${name}" failed — using fallback`);
    return { data: guardedFallback(), usedFallback: true };
  });
}

export async function generateObjectWithFallback<T>(
  schema: z.ZodType<T>,
  system: string,
  prompt: string,
  maxTokens: number,
  temperature: number,
  fallback?: () => T,
): Promise<T> {
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
    // Fall through to the text-based approach.
  }

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
      // Text-based parsing failed too — use the local fallback.
    }

    console.warn('[Pipeline] AI response invalid — using local fallback');
    return fallback();
  }

  throw new Error('AI returned invalid response and no fallback available');
}

export type SkillGroupLike = { category?: string; skills?: string[] | string; items?: string[] };
export type ExperienceLike = { position?: string; company?: string; role?: string; responsibilities?: string[] | string; description?: string };
export type ProjectLike = { name?: string; description?: string[] | string; technologies?: string[] };
export type EducationLike = { degree?: string; field?: string; school?: string };
export type SkillItem = { category: string; skills: string[] };
export type TailoredExperience = { company: string; position: string; location?: string | null; start_date?: string | null; end_date?: string | null; description: string; responsibilities: string[] };
export type TailoredProject = { name: string; description: string[]; technologies: string[]; url?: string | null };

export function estimateCompatibility(resumeJson: OriginalResumeData | null, jd: string, score: Pick<ScoreData, 'matched' | 'missing'>): number {
  if (!resumeJson) return 0;
  const jdLower = jd.toLowerCase();

  const resumeText = [
    resumeJson.professional_summary || '',
    ...((resumeJson.skills || []) as SkillGroupLike[]).flatMap((s) => [s.category, ...(s.skills || s.items || [])].filter(Boolean)),
    ...((resumeJson.work_experience || []) as ExperienceLike[]).flatMap((w) => [w.position, w.company, w.role, ...(w.responsibilities || []), w.description || '']),
    ...((resumeJson.projects || []) as ProjectLike[]).flatMap((p) => [p.name, ...(Array.isArray(p.description) ? p.description : [p.description || '']), ...(p.technologies || [])]),
    ...((resumeJson.education || []) as EducationLike[]).flatMap((e) => [e.degree, e.field, e.school]),
  ].filter(Boolean).join(' ').toLowerCase();

  const jdRoles = ['engineer', 'developer', 'architect', 'manager', 'analyst', 'scientist', 'designer', 'consultant', 'director', 'lead', 'staff', 'principal', 'full-stack', 'frontend', 'backend', 'devops', 'data', 'ml', 'ai', 'product', 'cloud', 'platform', 'infrastructure', 'security'];
  const jdRoleMatch = jdRoles.filter(r => jdLower.includes(r));
  const resumeRoleMatch = jdRoles.filter(r => resumeText.includes(r));
  const roleOverlap = jdRoleMatch.length > 0 ? (resumeRoleMatch.filter(r => jdRoleMatch.includes(r)).length / jdRoleMatch.length) * 40 : 20;

  const keywordCoverage = score?.matched?.length && score?.missing?.length
    ? (score.matched.length / (score.matched.length + score.missing.length)) * 40
    : 20;

  const seniorityLevels = ['junior', 'mid', 'senior', 'lead', 'staff', 'principal', 'director'];
  const jdSeniority = seniorityLevels.find(s => jdLower.includes(s)) || null;
  const resumeSeniority = seniorityLevels.find(s => resumeText.includes(s)) || null;
  const seniorityBonus = jdSeniority && resumeSeniority && jdSeniority === resumeSeniority ? 15
    : jdSeniority && resumeSeniority ? 5
    : 0;

  const domainTerms = ['healthcare', 'fintech', 'ecommerce', 'saas', 'enterprise', 'startup', 'b2b', 'b2c', 'ai', 'ml', 'data', 'cloud', 'security', 'mobile', 'web', 'api', 'microservices'];
  const jdDomain = domainTerms.filter(d => jdLower.includes(d));
  const resumeDomain = domainTerms.filter(d => resumeText.includes(d));
  const domainOverlap = jdDomain.length > 0
    ? (jdDomain.filter(d => resumeDomain.includes(d)).length / jdDomain.length) * 20
    : 10;

  return Math.round(Math.min(100, roleOverlap + keywordCoverage + seniorityBonus + domainOverlap));
}

export type ResumeView = {
  professional_summary?: string;
  skills?: Array<{ category?: string; skills?: string[] }>;
  work_experience?: Array<{ position?: string; role?: string; company?: string; employer?: string; description?: unknown; responsibilities?: unknown }>;
  projects?: Array<{ name?: string; description?: unknown }>;
  education?: Array<{ school?: string; institution?: string; degree?: string }>;
};

export function resumeToText(r: ResumeView): string {
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

export function computeKeywordsAdded(original: Record<string, unknown> | null, tailored: { skills: SkillItem[] }): string[] {
  const origSet = new Set<string>();
  if (original?.skills) {
    for (const s of original.skills as Array<SkillGroupLike>) {
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

export function countBulletsRewritten(original: Record<string, unknown> | null, tailored: { work_experience: TailoredExperience[] }): number {
  const origBullets = new Set<string>();
  if (original?.work_experience) {
    for (const w of original.work_experience as Array<{ description?: unknown; responsibilities?: unknown }>) {
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

export function safeBullets(w: { description?: unknown; responsibilities?: unknown }): string[] {
  if (Array.isArray(w.responsibilities)) return w.responsibilities as string[];
  if (typeof w.description === 'string') return w.description.split('\n').filter(Boolean);
  if (Array.isArray(w.description)) return w.description as string[];
  if (w.description != null) return [String(w.description)];
  return [];
}

export type PipelineError = Error & {
  _hasStep?: boolean;
  _step?: string;
  statusCode?: number;
  status?: number;
  response?: { status?: number };
};

export function classifyPipelineError(err: PipelineError): { message: string; statusCode: number; reason: string } {
  const message = err.message || 'Unknown error';
  const lower = message.toLowerCase();

  const statusCode = err.statusCode ?? err.status ?? err.response?.status ?? 0;

  const isTimeout = lower.includes('timeout') || lower.includes('timed out');
  const isAuth = lower.includes('auth') || lower.includes('api key') || lower.includes('unauthorized') || lower.includes('401');
  const isRateLimit = lower.includes('rate') || lower.includes('quota') || lower.includes('429') || statusCode === 429;
  const isProvider = lower.includes('provider') || lower.includes('upstream') || lower.includes('502') || lower.includes('503') || statusCode === 502 || statusCode === 503;
  const isInvalidJson = lower.includes('json') || lower.includes('unexpected token') || lower.includes('invalid') || lower.includes('schema') || lower.includes('parse');

  const reason = isInvalidJson ? 'invalid_json'
    : isTimeout ? 'timeout'
    : isAuth ? 'auth'
    : isRateLimit ? 'rate_limit'
    : isProvider ? 'provider'
    : 'unknown';

  return { message, statusCode, reason };
}
