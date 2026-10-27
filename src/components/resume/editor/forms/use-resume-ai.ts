'use client';

import { useEffect, useRef, useState } from 'react';
import type { AIConfig } from '@/lib/ai-models';
import { reorderIndexMap } from './form-utils';

export interface AISuggestion {
  id: string;
  point: string;
}

export interface ImprovedPoint {
  original: string;
  improved: string;
}

export interface ImprovementConfig {
  [key: number]: { [key: number]: string }; // entryIndex -> pointIndex -> prompt
}

export interface ResumeAIConfig {
  numPoints: number;
  customPrompt: string;
}

export interface ResumeAIAdapter<T> {
  /** Bullet points owned by one entry. */
  getPoints: (entry: T) => string[];
  /** Returns a copy of the entry with the replacement points. */
  setPoints: (entry: T, points: string[]) => T;
  /** Calls the server action and returns the generated bullet points. */
  generate: (entry: T, config: ResumeAIConfig, ai: Pick<AIConfig, 'model' | 'apiKeys'>) => Promise<string[]>;
  /** Calls the server action and returns the rewritten bullet. */
  improve: (point: string, customPrompt: string | undefined, ai: Pick<AIConfig, 'model' | 'apiKeys'>) => Promise<string>;
}

interface UseResumeAIOptions<T> extends ResumeAIAdapter<T> {
  entries: T[];
  onChange: (entries: T[]) => void;
}

const MODEL_STORAGE_KEY = 'eleva-default-model';
const LOCAL_STORAGE_KEY = 'eleva-api-keys';

const DEFAULT_CONFIG: ResumeAIConfig = { numPoints: 3, customPrompt: '' };

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
 * Shared AI workflow for list-based resume forms (projects, work experience).
 *
 * Owns suggestion generation/approval, single-point rewriting, undo/review
 * state, prompt config, loading flags and the shared error dialog. The caller
 * supplies small adapters describing how to read/write bullets on its entry
 * type and which server action to call.
 */
export function useResumeAI<T>({
  entries,
  onChange,
  getPoints,
  setPoints,
  generate,
  improve,
}: UseResumeAIOptions<T>) {
  const [aiSuggestions, setAiSuggestions] = useState<{ [key: number]: AISuggestion[] }>({});
  const [loadingAI, setLoadingAI] = useState<{ [key: number]: boolean }>({});
  const [loadingPointAI, setLoadingPointAI] = useState<{ [key: number]: { [key: number]: boolean } }>({});
  const [aiConfig, setAiConfig] = useState<{ [key: number]: ResumeAIConfig }>({});
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
    const entry = entries[index];
    const config = aiConfig[index] || DEFAULT_CONFIG;
    setLoadingAI((prev) => ({ ...prev, [index]: true }));
    setPopoverOpen((prev) => ({ ...prev, [index]: false }));

    try {
      const points = await generate(entry, config, readAIConfigFromStorage());
      const suggestions = points.map((point) => ({
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

  const approveSuggestion = (entryIndex: number, suggestion: AISuggestion) => {
    const updated = [...entries];
    // Immutable update: the memo comparator JSON-compares previous props, so
    // mutating shared entry objects in place would make the change invisible.
    updated[entryIndex] = setPoints(updated[entryIndex], [
      ...getPoints(updated[entryIndex]),
      suggestion.point,
    ]);
    onChange(updated);

    // Remove the suggestion after approval
    setAiSuggestions((prev) => ({
      ...prev,
      [entryIndex]: prev[entryIndex].filter((s) => s.id !== suggestion.id),
    }));
  };

  const deleteSuggestion = (entryIndex: number, suggestionId: string) => {
    setAiSuggestions((prev) => ({
      ...prev,
      [entryIndex]: prev[entryIndex].filter((s) => s.id !== suggestionId),
    }));
  };

  const rewritePoint = async (entryIndex: number, pointIndex: number) => {
    const entry = entries[entryIndex];
    const point = getPoints(entry)[pointIndex];
    const customPrompt = improvementConfig[entryIndex]?.[pointIndex];

    setLoadingPointAI((prev) => ({
      ...prev,
      [entryIndex]: { ...(prev[entryIndex] || {}), [pointIndex]: true },
    }));

    try {
      const improvedPoint = await improve(point, customPrompt, readAIConfigFromStorage());

      setImprovedPoints((prev) => ({
        ...prev,
        [entryIndex]: {
          ...(prev[entryIndex] || {}),
          [pointIndex]: {
            original: point,
            improved: improvedPoint,
          },
        },
      }));

      const updated = [...entries];
      updated[entryIndex] = setPoints(
        updated[entryIndex],
        getPoints(updated[entryIndex]).map((d, i) => (i === pointIndex ? improvedPoint : d)),
      );
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
        [entryIndex]: { ...(prev[entryIndex] || {}), [pointIndex]: false },
      }));
    }
  };

  /** Drops the review state for one point (accept or manual edit). */
  const clearImprovement = (entryIndex: number, pointIndex: number) => {
    setImprovedPoints((prev) => {
      const newState = { ...prev };
      if (newState[entryIndex]) {
        const nextEntry = { ...newState[entryIndex] };
        delete nextEntry[pointIndex];
        if (Object.keys(nextEntry).length === 0) {
          delete newState[entryIndex];
        } else {
          newState[entryIndex] = nextEntry;
        }
      }
      return newState;
    });
  };

  const undoImprovement = (entryIndex: number, pointIndex: number) => {
    const improvedPoint = improvedPoints[entryIndex]?.[pointIndex];
    if (!improvedPoint) return;

    const updated = [...entries];
    updated[entryIndex] = setPoints(
      updated[entryIndex],
      getPoints(updated[entryIndex]).map((d, i) =>
        i === pointIndex ? improvedPoint.original : d,
      ),
    );
    onChange(updated);

    clearImprovement(entryIndex, pointIndex);
  };

  /** Keeps every index-keyed map aligned when an entry is reordered. */
  const reorderAIIndices = (from: number, to: number) => {
    const reorder = <V,>(map: Record<number, V>) => reorderIndexMap(map, from, to);

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

  const setImprovementPrompt = (entryIndex: number, pointIndex: number, value: string) => {
    setImprovementConfig((prev) => ({
      ...prev,
      [entryIndex]: {
        ...(prev[entryIndex] || {}),
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

export type ResumeAIState = ReturnType<typeof useResumeAI<never>>;
