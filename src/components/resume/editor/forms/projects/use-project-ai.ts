'use client';

import type { Project } from '@/lib/types';
import { generateProjectPoints, improveProject } from '@/utils/actions/resumes/ai';
import {
  useResumeAI,
  type AISuggestion,
  type ImprovedPoint,
  type ImprovementConfig,
  type ResumeAIConfig,
  type ResumeAIState,
} from '../use-resume-ai';

export type { AISuggestion, ImprovedPoint, ImprovementConfig, ResumeAIConfig };

interface UseProjectAIOptions {
  projects: Project[];
  onChange: (projects: Project[]) => void;
}

/** Project-specific adapter over the shared resume AI workflow. */
export function useProjectAI({ projects, onChange }: UseProjectAIOptions) {
  return useResumeAI<Project>({
    entries: projects,
    onChange,
    getPoints: (project) => project.description,
    setPoints: (project, description) => ({ ...project, description }),
    generate: async (project, config, ai) => {
      const result = await generateProjectPoints(
        project.name,
        project.technologies || [],
        'Software Engineer',
        config.numPoints,
        config.customPrompt,
        ai,
      );
      return result.points;
    },
    improve: improveProject,
  });
}

export type ProjectAIState = ResumeAIState;
