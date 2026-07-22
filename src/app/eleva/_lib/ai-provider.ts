/**
 * Eleva AI — Backward-compatible wrapper around the centralized AIProvider.
 *
 * This file re-exports the Vercel AI SDK functions (streamText, generateText,
 * generateObject) pre-configured with OpenRouter and the correct defaults.
 *
 * All new code should import directly from '@/lib/eleva-ai-provider' instead.
 */

import { AIProvider, z } from '@/lib/eleva-ai-provider';

// Re-export the Vercel AI SDK signature functions for existing code
export const streamText = AIProvider.stream.bind(AIProvider);
export const generateText = AIProvider.generate.bind(AIProvider);
export const generateObject = AIProvider.generateObject.bind(AIProvider);

/** @deprecated Use AIProvider.getSystemPrompt() instead */
export const ELEVA_SYSTEM = AIProvider.getSystemPrompt();

/** @deprecated Use AIProvider options directly. Kept for backward compat. */
export function getModel(model?: string) {
  // Return a compat object that acts like LanguageModel for existing calls
  return model ?? 'openrouter/free';
}

/** @deprecated Moved to @/lib/eleva-ai-provider */
export const DEFAULT_MODEL = 'openrouter/free';
export const DEFAULT_MAX_TOKENS = 2048;

// Re-export schemas that are specific to Eleva
export const rewriteSchema = z.object({
  bullet: z.string().min(1),
  role: z.string().optional(),
  jobDescription: z.string().optional(),
});

export const scoreSchema = z.object({
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

export const resumeSchema = z.object({
  first_name: z.string().nullable(),
  last_name: z.string().nullable(),
  email: z.string().nullable(),
  phone_number: z.string().nullable(),
  location: z.string().nullable(),
  linkedin_url: z.string().nullable(),
  github_url: z.string().nullable(),
  website: z.string().nullable(),
  target_role: z.string().nullable(),
  professional_summary: z.string().nullable(),
  work_experience: z.array(z.object({
    company: z.string(),
    position: z.string(),
    location: z.string().nullable().optional(),
    date: z.string().nullable().optional(),
    description: z.array(z.string()).default([]),
  })).default([]),
  education: z.array(z.object({
    school: z.string(),
    degree: z.string().nullable().optional(),
    field: z.string().nullable().optional(),
    date: z.string().nullable().optional(),
    gpa: z.string().nullable().optional(),
  })).default([]),
  skills: z.array(z.object({
    category: z.string(),
    items: z.array(z.string()).default([]),
  })).default([]),
  projects: z.array(z.object({
    name: z.string(),
    description: z.array(z.string()).default([]),
    technologies: z.array(z.string()).default([]),
    url: z.string().nullable().optional(),
  })).default([]),
  certifications: z.array(z.object({
    name: z.string(),
    issuer: z.string().nullable().optional(),
    date: z.string().nullable().optional(),
  })).default([]),
});
