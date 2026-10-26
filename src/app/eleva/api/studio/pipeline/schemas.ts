import { z } from 'zod';

export const bodySchema = z.object({
  jobDescription: z.string().min(20),
  resumeId: z.string().uuid().optional(),
  company: z.string().optional(),
  role: z.string().optional(),
});

export const PlannerSchema = z.object({
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

export const RecruiterReviewSchema = z.object({
  wouldInterview: z.boolean(),
  score: z.number().int().min(0).max(100),
  strengths: z.array(z.string()).max(6),
  weaknesses: z.array(z.string()).max(6),
  genericAreas: z.array(z.string()).max(5),
  recommendation: z.string(),
  confidence: z.number().int().min(0).max(100),
});

export const SummarySchema = z.object({
  professional_summary: z.string(),
});

export const ResumeSkillsSchema = z.object({
  skills: z.array(z.object({ category: z.string(), skills: z.array(z.string()) })),
});

export const ResumeExperienceSchema = z.object({
  work_experience: z.array(z.object({
    company: z.string(), position: z.string(), location: z.string().nullable().optional(),
    start_date: z.string().nullable().optional(), end_date: z.string().nullable().optional(),
    description: z.string(), responsibilities: z.array(z.string()),
  })),
});

export const ResumeProjectsSchema = z.object({
  projects: z.array(z.object({
    name: z.string(), description: z.array(z.string()),
    technologies: z.array(z.string()), url: z.string().nullable().optional(),
  })),
});

export const QualityCheckSchema = z.object({
  passed: z.boolean(),
  issues: z.array(z.string()).max(15),
  score: z.number().int().min(0).max(100),
});

export type PipelineRequestBody = z.infer<typeof bodySchema>;
export type Planner = z.infer<typeof PlannerSchema>;
export type RecruiterReview = z.infer<typeof RecruiterReviewSchema>;
export type SummaryOutput = z.infer<typeof SummarySchema>;
export type ResumeSkillsOutput = z.infer<typeof ResumeSkillsSchema>;
export type ResumeExperienceOutput = z.infer<typeof ResumeExperienceSchema>;
export type ResumeProjectsOutput = z.infer<typeof ResumeProjectsSchema>;
export type QualityCheck = z.infer<typeof QualityCheckSchema>;
