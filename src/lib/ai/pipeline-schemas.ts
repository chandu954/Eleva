import { z } from 'zod';

/**
 * Cached pipeline contracts. Both must match the shapes the pipeline route
 * validates AI output against before writing; the cache stores the validated
 * values and re-serves them as-is.
 */
export const ExtractSchema = z.object({
  company: z.string().nullable(),
  role: z.string().nullable(),
  required_skills: z.array(z.string()).max(30),
  nice_to_have: z.array(z.string()).max(20),
  summary: z.string(),
});

export const ScoreSchema = z.object({
  overall: z.number().int().min(0).max(100),
  keyword: z.number().int().min(0).max(100),
  formatting: z.number().int().min(0).max(100),
  readability: z.number().int().min(0).max(100),
  impact: z.number().int().min(0).max(100),
  recruiter: z.number().int().min(0).max(100),
  matched: z.array(z.string()).max(30),
  missing: z.array(z.string()).max(30),
  suggestions: z
    .array(
      z.object({
        type: z.enum(['success', 'warning', 'primary']),
        text: z.string(),
        action: z.string(),
      }),
    )
    .max(8),
  summary: z.string(),
});

export type JdExtract = z.infer<typeof ExtractSchema>;
export type ResumeScore = z.infer<typeof ScoreSchema>;
