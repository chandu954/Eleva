/**
 * Wire shapes for the studio pipeline step payloads, mirroring the zod
 * schemas in api/studio/pipeline/route.ts (ExtractSchema, ScoreSchema,
 * Resume*Schema) and the local fallbacks in pipeline/local-scorer.ts.
 * Keeping these in one place lets studio-client state carry real types
 * instead of `any`.
 */

/** `extract` step payload — ExtractSchema. */
export interface ExtractedJobData {
  company: string | null;
  role: string | null;
  required_skills: string[];
  nice_to_have: string[];
  summary: string;
}

/** `score` / `rescore` step payload — ScoreSchema and scoreResumeLocally. */
export interface JobScore {
  overall: number;
  keyword: number;
  formatting: number;
  readability: number;
  impact: number;
  recruiter: number;
  matched: string[];
  missing: string[];
  suggestions: ScoreSuggestion[];
  summary: string;
  /** Only present on the `rescore` step, for before/after comparison. */
  previous_overall?: number;
}

export interface ScoreSuggestion {
  type: 'success' | 'warning' | 'primary';
  text: string;
  action: string;
}

/** `tailor` step payload — Resume*Schema assembly (tailored resume preview). */
export interface TailoredResume {
  professional_summary: string;
  skills: TailoredSkillCategory[];
  work_experience: TailoredExperience[];
  projects: TailoredProject[];
  /** Always emitted (defaults to [] from the original resume passthrough). */
  education: TailoredEducation[];
}

export interface TailoredSkillCategory {
  category: string;
  /** Skill lists may arrive as either key depending on the emitting model. */
  skills?: string[];
  items?: string[];
}

export interface TailoredExperience {
  position?: string;
  /** Older/fallback payloads may use the alternate keys below. */
  role?: string;
  company?: string;
  employer?: string;
  location?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  description?: string;
  responsibilities?: string[];
}

export interface TailoredProject {
  name: string;
  description: string | string[];
  technologies?: string[];
  url?: string | null;
}

export interface TailoredEducation {
  school?: string;
  institution?: string;
  degree?: string;
  field?: string;
  date?: string;
}
