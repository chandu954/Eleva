import type { Resume, Job as JobType } from '@/lib/types';
import type { ResumeScoreMetrics } from './resume-score-types';

const LOCAL_STORAGE_KEY = 'eleva-resume-scores';
const MAX_SCORES = 10;

interface StoredScoreEntry {
  score: ResumeScoreMetrics;
  signature: string;
  generatedAt: string;
}

// Helper function to convert camelCase to readable labels
export function camelCaseToReadable(text: string): string {
  return text
    // Insert space before uppercase letters
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    // Capitalize first letter
    .replace(/^./, str => str.toUpperCase());
}

export function getResumeForScoring(resume: Resume) {
  return {
    ...resume,
    section_configs: undefined,
    section_order: undefined
  };
}

export function getJobForScoring(job?: JobType | null) {
  if (!job) return null;

  return {
    ...job,
    employment_type: job.employment_type || undefined
  };
}

function hashContent(content: string): string {
  let hash = 2166136261;
  for (let i = 0; i < content.length; i += 1) {
    hash ^= content.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }

  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function createScoreSignature(resume: Resume, job: JobType | null | undefined, model: string): string {
  const payload = {
    resume: getResumeForScoring(resume),
    job: getJobForScoring(job),
    model
  };

  return hashContent(JSON.stringify(payload));
}

function parseStoredScoreEntry(raw: unknown): StoredScoreEntry | null {
  if (!raw || typeof raw !== "object") return null;

  const candidate = raw as Record<string, unknown>;
  if (typeof candidate.signature !== "string") return null;
  if (!candidate.score || typeof candidate.score !== "object") return null;

  return {
    score: candidate.score as ResumeScoreMetrics,
    signature: candidate.signature,
    generatedAt: typeof candidate.generatedAt === "string" ? candidate.generatedAt : ""
  };
}

export function getStoredScores(resumeId: string, signature: string): ResumeScoreMetrics | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!stored) return null;

    const scores = new Map<string, unknown>(JSON.parse(stored));
    const storedEntry = parseStoredScoreEntry(scores.get(resumeId));

    if (!storedEntry) return null;
    if (storedEntry.signature !== signature) return null;

    return storedEntry.score;
  } catch (error) {
    console.error('Error reading stored scores:', error);
    return null;
  }
}

export function updateStoredScores(resumeId: string, entry: StoredScoreEntry) {
  if (typeof window === "undefined") return;

  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    const scores = stored ? new Map<string, StoredScoreEntry>(JSON.parse(stored)) : new Map<string, StoredScoreEntry>();

    if (scores.has(resumeId)) {
      scores.delete(resumeId);
    }

    // Maintain only MAX_SCORES entries
    if (scores.size >= MAX_SCORES) {
      const oldestKey = scores.keys().next().value;
      if (oldestKey) {
        scores.delete(oldestKey);
      }
    }

    scores.set(resumeId, entry);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(Array.from(scores)));
  } catch (error) {
    console.error('Error storing score:', error);
  }
}
