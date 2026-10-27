'use client';

import { useEffect, useRef, useState } from 'react';
import type { Project } from '@/lib/types';
import { generateProjectPoints, improveProject } from '@/utils/actions/resumes/ai';
import type { AIConfig } from '@/lib/ai-models';
import { reorderIndexMap } from '../form-utils';

export interface AISuggestion {
  id: string;
  point: string;
}

export interface ImprovedPoint {
  original: string;
  improved: string;
}

export interface ImprovementConfig {
  [key: number]: { [key: number]: string }; // projectIndex -> pointIndex -> prompt
}

export interface ProjectAIConfig {
  numPoints: number;
  customPrompt: string;
}

interface UseProjectAIOptions {
  projects: Project[];
  onChange: (projects: Project[]) => void;
}

const MODEL_STORAGE_KEY = 'eleva-default-model';
const LOCAL_STORAGE_KEY = 'eleva-api-keys';

function readAIConfigFromStorage(): Pick<AIConfig, 'model' | 'apiKeys'> {
  const selectedModel = localStorage.getItem(MODEL_STORAGE_KEY);
  const storedKeys = localStorage.getItem(LOCAL_STORAGE_KEY);
  let apiKeys: AIConfig['apiKeys'] = [];

  try {
    apiKeys = storedKeys ? JSON.parse(storedKeys) : [];
  } catch (error) {
    console.error('Error parsing API keys:', error);
  }

  return { model: selectedModel || '', apiKeys };
}

function isApiKeyError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const message = error.message.toLowerCase();
  return (
    message.includes('api key') ||
    message.includes('unauthorized') ||
    message.includes('invalid key') ||
    message.includes('invalid x-api-key')
  );
}

/**
 * Owns every per-project AI interaction: suggestion generation/approval,
 * single-point rewriting, undo state, prompts, loading flags and the shared
 * error dialog. Extracted from ProjectsForm so the form component stays
 * focused on list CRUD and rendering.
 */
export function useProjectAI({ projects, onChange }: UseProjectAIOptions) {
  const [aiSuggestions, setAiSuggestions] = useState<{ [key: number]: AISuggestion[] }>({});
  const [loadingAI, setLoadingAI] = useState<{ [key: number]: boolean }>({});
  const [loadingPointAI, setLoadingPointAI] = useState<{ [key: number]: { [key: number]: boolean } }>({});
  const [aiConfig, setAiConfig] = useState<{ [key: number]: ProjectAIConfig }>({});
  const [popoverOpen, setPopoverOpen] = useState<{ [key: number]: boolean }>({});
  const [improvedPoints, setImprovedPoints] = useState<{ [key: number]: { [key: number]: ImprovedPoint } }>({});
  const [improvementConfig, setImprovementConfig] = useState<ImprovementConfig>({});
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState({ title: '', description: '' });
  const textareaRefs = useRef<{ [key: number]: HTMLTextAreaElement }>({});

  // Focus the prompt textarea once its popover has been rendered.
  useEffect(() => {
    Object.entries(popoverOpen).forEach(([index, isOpen]) => {
      if (isOpen && textareaRefs.current[Number(index)]) {
        // Small delay to ensure the popover is fully rendered
        setTimeout(() => {
          textareaRefs.current[Number(index)]?.focus();
        }, 100);
      }
    });
  }, [popoverOpen]);

  const showError = (description: string) => {
    setErrorMessage({ title: 'Error', description });
    setShowErrorDialog(true);
  };

  const showApiKeyError = () => {
    setErrorMessage({
      title: 'API Key Error',
      description:
        'There was an issue with your API key. Please check your settings and try again.',
    });
    setShowErrorDialog(true);
  };

  const generateAIPoints = async (index: number) => {
    const project = projects[index];
    const config = aiConfig[index] || { numPoints: 3, customPrompt: '' };
    setLoadingAI((prev) => ({ ...prev, [index]: true }));
    setPopoverOpen((prev) => ({ ...prev, [index]: false }));

    try {
      const result = await generateProjectPoints(
        project.name,
        project.technologies || [],
        'Software Engineer',
        config.numPoints,
        config.customPrompt,
        readAIConfigFromStorage(),
      );

      const suggestions = result.points.map((point: string) => ({
        id: Math.random().toString(36).substr(2, 9),
        point,
      }));

      setAiSuggestions((prev) => ({
        ...prev,
        [index]: suggestions,
      }));
    } catch (error: Error | unknown) {
      if (isApiKeyError(error)) {
        showApiKeyError();
      } else {
        showError('Failed to generate AI points. Please try again.');
      }
    } finally {
      setLoadingAI((prev) => ({ ...prev, [index]: false }));
    }
  };

  const approveSuggestion = (projectIndex: number, suggestion: AISuggestion) => {
    const updated = [...projects];
    // Immutable update: the memo comparator JSON-compares previous props, so
    // mutating shared project objects in place would make the change invisible.
    updated[projectIndex] = {
      ...updated[projectIndex],
      description: [...updated[projectIndex].description, suggestion.point],
    };
    onChange(updated);

    // Remove the suggestion after approval
    setAiSuggestions((prev) => ({
      ...prev,
      [projectIndex]: prev[projectIndex].filter((s) => s.id !== suggestion.id),
    }));
  };

  const deleteSuggestion = (projectIndex: number, suggestionId: string) => {
    setAiSuggestions((prev) => ({
      ...prev,
      [projectIndex]: prev[projectIndex].filter((s) => s.id !== suggestionId),
    }));
  };

  const rewritePoint = async (projectIndex: number, pointIndex: number) => {
    const project = projects[projectIndex];
    const point = project.description[pointIndex];
    const customPrompt = improvementConfig[projectIndex]?.[pointIndex];

    setLoadingPointAI((prev) => ({
      ...prev,
      [projectIndex]: { ...(prev[projectIndex] || {}), [pointIndex]: true },
    }));

    try {
      const improvedPoint = await improveProject(point, customPrompt, readAIConfigFromStorage());

      setImprovedPoints((prev) => ({
        ...prev,
        [projectIndex]: {
          ...(prev[projectIndex] || {}),
          [pointIndex]: {
            original: point,
            improved: improvedPoint,
          },
        },
      }));

      const updated = [...projects];
      updated[projectIndex] = {
        ...updated[projectIndex],
        description: updated[projectIndex].description.map((d, i) =>
          i === pointIndex ? improvedPoint : d,
        ),
      };
      onChange(updated);
    } catch (error: unknown) {
      if (isApiKeyError(error)) {
        showApiKeyError();
      } else {
        showError('Failed to improve point. Please try again.');
      }
    } finally {
      setLoadingPointAI((prev) => ({
        ...prev,
        [projectIndex]: { ...(prev[projectIndex] || {}), [pointIndex]: false },
      }));
    }
  };

  /** Drops the review state for one point (accept or manual edit). */
  const clearImprovement = (projectIndex: number, pointIndex: number) => {
    setImprovedPoints((prev) => {
      const newState = { ...prev };
      if (newState[projectIndex]) {
        const nextProject = { ...newState[projectIndex] };
        delete nextProject[pointIndex];
        if (Object.keys(nextProject).length === 0) {
          delete newState[projectIndex];
        } else {
          newState[projectIndex] = nextProject;
        }
      }
      return newState;
    });
  };

  const undoImprovement = (projectIndex: number, pointIndex: number) => {
    const improvedPoint = improvedPoints[projectIndex]?.[pointIndex];
    if (!improvedPoint) return;

    const updated = [...projects];
    updated[projectIndex] = {
      ...updated[projectIndex],
      description: updated[projectIndex].description.map((d, i) =>
        i === pointIndex ? improvedPoint.original : d,
      ),
    };
    onChange(updated);

    clearImprovement(projectIndex, pointIndex);
  };

  /** Keeps every index-keyed map aligned when a project is reordered. */
  const reorderAIIndices = (from: number, to: number) => {
    const reorder = <T,>(map: Record<number, T>) => reorderIndexMap(map, from, to);

    setAiSuggestions(reorder);
    setLoadingAI(reorder);
    setLoadingPointAI(reorder);
    setAiConfig(reorder);
    setPopoverOpen(reorder);
    setImprovedPoints(reorder);
    setImprovementConfig(reorder);
    textareaRefs.current = reorder(textareaRefs.current);
  };

  const setNumPoints = (index: number, value: number) => {
    setAiConfig((prev) => ({
      ...prev,
      [index]: { ...prev[index], numPoints: value },
    }));
  };

  const setCustomPrompt = (index: number, value: string) => {
    setAiConfig((prev) => ({
      ...prev,
      [index]: { ...prev[index], customPrompt: value },
    }));
  };

  const setImprovementPrompt = (projectIndex: number, pointIndex: number, value: string) => {
    setImprovementConfig((prev) => ({
      ...prev,
      [projectIndex]: {
        ...(prev[projectIndex] || {}),
        [pointIndex]: value,
      },
    }));
  };

  return {
    aiSuggestions,
    loadingAI,
    loadingPointAI,
    aiConfig,
    improvedPoints,
    improvementConfig,
    showErrorDialog,
    setShowErrorDialog,
    errorMessage,
    generateAIPoints,
    approveSuggestion,
    deleteSuggestion,
    rewritePoint,
    clearImprovement,
    undoImprovement,
    reorderAIIndices,
    setNumPoints,
    setCustomPrompt,
    setImprovementPrompt,
  };
}

export type ProjectAIState = ReturnType<typeof useProjectAI>;
