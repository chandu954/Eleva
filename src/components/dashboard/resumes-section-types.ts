import type { ResumeSummary } from '@/lib/types';

export interface OptimisticResume extends ResumeSummary {
  isOptimistic?: boolean;
  originalId?: string;
}
