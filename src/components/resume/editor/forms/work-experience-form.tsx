'use client';

import { memo } from 'react';
import type { Profile, WorkExperience } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { cn, withBasePath } from '@/lib/utils';
import { ImportFromProfileDialog } from '../../management/dialogs/import-from-profile-dialog';
import { ApiErrorDialog } from '@/components/ui/api-error-dialog';
import { WorkExperienceCard } from './work-experience/work-experience-card';
import type { WorkExperienceCardActions } from './work-experience/work-experience-card';
import { useWorkExperienceAI } from './work-experience/use-work-experience-ai';

interface WorkExperienceFormProps {
  experiences: WorkExperience[];
  onChange: (experiences: WorkExperience[]) => void;
  profile: Profile;
  targetRole?: string;
}

function areWorkExperiencePropsEqual(
  prevProps: WorkExperienceFormProps,
  nextProps: WorkExperienceFormProps,
) {
  return (
    prevProps.targetRole === nextProps.targetRole &&
    JSON.stringify(prevProps.experiences) === JSON.stringify(nextProps.experiences) &&
    prevProps.profile.id === nextProps.profile.id
  );
}

export const WorkExperienceForm = memo(function WorkExperienceFormComponent({
  experiences,
  onChange,
  profile,
  targetRole = 'Software Engineer',
}: WorkExperienceFormProps) {
  const ai = useWorkExperienceAI({ experiences, onChange, targetRole });

  const addExperience = () => {
    onChange([
      {
        company: '',
        position: '',
        location: '',
        date: '',
        description: [],
        technologies: [],
      },
      ...experiences,
    ]);
  };

  const updateExperience = (
    index: number,
    field: keyof WorkExperience,
    value: string | string[],
  ) => {
    const updated = [...experiences];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const removeExperience = (index: number) => {
    onChange(experiences.filter((_, i) => i !== index));
  };

  const moveExperience = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= experiences.length) return;

    ai.reorderAIIndices(index, newIndex);

    const updated = [...experiences];
    const [item] = updated.splice(index, 1);
    updated.splice(newIndex, 0, item);

    onChange(updated);
  };

  const handleImportFromProfile = (importedExperiences: WorkExperience[]) => {
    onChange([...importedExperiences, ...experiences]);
  };

  const addPoint = (entryIndex: number) => {
    // Immutable update so the memo comparator sees the change.
    const updated = [...experiences];
    updated[entryIndex] = {
      ...updated[entryIndex],
      description: [...updated[entryIndex].description, ''],
    };
    onChange(updated);
  };

  const updatePoint = (entryIndex: number, pointIndex: number, value: string) => {
    const updated = [...experiences];
    updated[entryIndex] = {
      ...updated[entryIndex],
      description: updated[entryIndex].description.map((d, i) =>
        i === pointIndex ? value : d,
      ),
    };
    onChange(updated);
  };

  const deletePoint = (entryIndex: number, pointIndex: number) => {
    const updated = [...experiences];
    updated[entryIndex] = {
      ...updated[entryIndex],
      description: updated[entryIndex].description.filter((_, i) => i !== pointIndex),
    };
    onChange(updated);
  };

  const actionsFor = (index: number): WorkExperienceCardActions => ({
    updateField: (field, value) => updateExperience(index, field, value),
    remove: () => removeExperience(index),
    move: (direction) => moveExperience(index, direction),
    addPoint: () => addPoint(index),
    updatePoint: (pointIndex, value) => updatePoint(index, pointIndex, value),
    deletePoint: (pointIndex) => deletePoint(index, pointIndex),
  });

  return (
    <>
      <div className="space-y-2 sm:space-y-3">
        <div className="@container">
          <div
            className={cn(
              'flex flex-col @[400px]:flex-row gap-2',
              'transition-all duration-300 ease-in-out',
            )}
          >
            <Button
              variant="outline"
              onClick={addExperience}
              className={cn(
                'flex-1 h-9 min-w-[120px]',
                'bg-gradient-to-r from-cyan-500/5 via-cyan-500/10 to-blue-500/5',
                'hover:from-cyan-500/10 hover:via-cyan-500/15 hover:to-blue-500/10',
                'border-2 border-dashed border-cyan-500/30 hover:border-cyan-500/40',
                'text-cyan-700 hover:text-cyan-800',
                'transition-all duration-300',
                'rounded-xl',
                'whitespace-nowrap text-[11px] @[300px]:text-sm',
              )}
            >
              <Plus className="h-4 w-4 mr-2 shrink-0" />
              Add Work Experience
            </Button>

            <ImportFromProfileDialog<WorkExperience>
              profile={profile}
              onImport={handleImportFromProfile}
              type="work_experience"
              buttonClassName={cn(
                'flex-1 mb-0 h-9 min-w-[120px]',
                'whitespace-nowrap text-[11px] @[300px]:text-sm',
              )}
            />
          </div>
        </div>

        {experiences.map((experience, index) => (
          <WorkExperienceCard
            key={index}
            experience={experience}
            index={index}
            isFirst={index === 0}
            isLast={index === experiences.length - 1}
            actions={actionsFor(index)}
            ai={ai}
          />
        ))}
      </div>

      <ApiErrorDialog
        open={ai.showErrorDialog}
        onOpenChange={ai.setShowErrorDialog}
        errorMessage={ai.errorMessage}
        onUpgrade={() => {
          ai.setShowErrorDialog(false);
          window.location.href = withBasePath('/subscription');
        }}
        onSettings={() => {
          ai.setShowErrorDialog(false);
          window.location.href = withBasePath('/settings');
        }}
      />
    </>
  );
}, areWorkExperiencePropsEqual);
