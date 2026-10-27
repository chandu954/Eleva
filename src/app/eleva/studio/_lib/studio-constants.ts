'use client';

import type { MicroStatus } from './use-studio-pipeline';

/**
 * Studio pipeline stage definitions. Shared between the client shell and any
 * components that render stage progress. Keeping these here (instead of
 * inline in studio-client.tsx) keeps the client focused on view concerns.
 */
export const STAGES = [
  { key: 'job', label: 'Job analyzed', steps: ['extract'] },
  { key: 'analyze', label: 'Resume analysis', steps: ['score'] },
  { key: 'improve', label: 'Improve', steps: ['plan', 'tailor'] },
  { key: 'review', label: 'Review', steps: ['rescore', 'review'] },
  { key: 'apply', label: 'Ready to Apply', steps: ['letter'] },
] as const;

export const MICRO_LABELS: Record<MicroStatus, string> = {
  connecting: 'Connecting to model…',
  sending: 'Sending request…',
  waiting: 'Waiting for AI…',
  parsing: 'Parsing response…',
  complete: 'Complete',
};
