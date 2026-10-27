'use client';

import type { WorkExperience } from '@/lib/types';
import {
  generateWorkExperiencePoints,
  improveWorkExperience,
} from '@/utils/actions/resumes/ai';
import { useResumeAI, type ResumeAIState } from '../use-resume-ai';

interface UseWorkExperienceAIOptions {
  experiences: WorkExperience[];
  onChange: (experiences: WorkExperience[]) => void;
  targetRole?: string;
}

/** Work-experience adapter over the shared resume AI workflow. */
export function useWorkExperienceAI({
  experiences,
  onChange,
  targetRole = 'Software Engineer',
}: UseWorkExperienceAIOptions) {
  return useResumeAI<WorkExperience>({
    entries: experiences,
    onChange,
    getPoints: (experience) => experience.description,
    setPoints: (experience, description) => ({ ...experience, description }),
    generate: async (experience, config, ai) => {
      const result = await generateWorkExperiencePoints(
        experience.position,
        experience.company,
        experience.technologies || [],
        targetRole,
        config.numPoints,
        config.customPrompt,
        ai,
      );
      return result.points;
    },
    improve: improveWorkExperience,
  });
}

export type WorkExperienceAIState = ResumeAIState;
