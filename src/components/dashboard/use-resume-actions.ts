import { useOptimistic, useTransition, useState } from 'react';
import { deleteResume, copyResume } from '@/utils/actions/resumes/actions';
import { toast } from 'sonner';
import type { OptimisticResume } from './resumes-section-types';

export function useResumeActions(initialResumes: OptimisticResume[]) {
  // Optimistic state for deletions
  const [optimisticResumes, removeOptimisticResume] = useOptimistic(
    initialResumes,
    (state, deletedResumeId: string) =>
      state.filter((resume) => resume.id !== deletedResumeId)
  );

  // Optimistic state for copying
  const [optimisticCopiedResumes, addOptimisticCopy] = useOptimistic(
    optimisticResumes,
    (state, newResume: OptimisticResume) => {
      // Always add new resume at the beginning (leftmost position)
      return [newResume, ...state];
    }
  );

  const [, startTransition] = useTransition();
  const [deletingResumes, setDeletingResumes] = useState<Set<string>>(new Set());
  const [copyingResumes, setCopyingResumes] = useState<Set<string>>(new Set());

  async function handleDeleteResume(resumeId: string, resumeName: string) {
    // Add to deleting set for visual feedback
    setDeletingResumes((prev) => new Set(prev).add(resumeId));

    // Optimistically remove from UI immediately
    removeOptimisticResume(resumeId);

    // Show immediate feedback
    toast.loading(`Deleting "${resumeName}"...`, { id: resumeId });

    try {
      // Call server action in background
      await deleteResume(resumeId);

      // Success feedback
      toast.success(`"${resumeName}" deleted successfully`, { id: resumeId });
    } catch (error) {
      // On error, the optimistic update will automatically rollback
      console.error('Failed to delete resume:', error);
      toast.error(`Failed to delete "${resumeName}". Please try again.`, {
        id: resumeId,
      });
    } finally {
      // Remove from deleting set
      setDeletingResumes((prev) => {
        const newSet = new Set(prev);
        newSet.delete(resumeId);
        return newSet;
      });
    }
  }

  async function handleCopyResume(sourceResume: OptimisticResume) {
    // Add to copying set for visual feedback
    setCopyingResumes((prev) => new Set(prev).add(sourceResume.id));

    // Create optimistic copy
    const optimisticCopy: OptimisticResume = {
      ...sourceResume,
      id: `temp-${Date.now()}-${Math.random()}`, // Temporary unique ID
      name: `${sourceResume.name} (Copy)`,
      isOptimistic: true,
      originalId: sourceResume.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Optimistically add to UI immediately
    addOptimisticCopy(optimisticCopy);

    // Show immediate feedback
    toast.loading(`Copying "${sourceResume.name}"...`, {
      id: `copy-${sourceResume.id}`,
    });

    try {
      // Call server action in background
      await copyResume(sourceResume.id);

      // Success feedback - the real resume will appear via revalidation
      toast.success(`"${sourceResume.name}" copied successfully`, {
        id: `copy-${sourceResume.id}`,
      });
    } catch (error) {
      // On error, the optimistic update will automatically rollback
      console.error('Failed to copy resume:', error);
      toast.error(`Failed to copy "${sourceResume.name}". Please try again.`, {
        id: `copy-${sourceResume.id}`,
      });
    } finally {
      // Remove from copying set
      setCopyingResumes((prev) => {
        const newSet = new Set(prev);
        newSet.delete(sourceResume.id);
        return newSet;
      });
    }
  }

  return {
    optimisticResumes: optimisticCopiedResumes,
    deletingResumes,
    copyingResumes,
    startTransition,
    handleDeleteResume,
    handleCopyResume,
  };
}
