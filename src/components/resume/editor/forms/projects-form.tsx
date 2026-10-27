'use client';

import { memo, useState } from 'react';
import type { KeyboardEvent } from 'react';
import type { Project, Profile } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { cn, withBasePath } from '@/lib/utils';
import { ImportFromProfileDialog } from '../../management/dialogs/import-from-profile-dialog';
import { ApiErrorDialog } from '@/components/ui/api-error-dialog';
import { ProjectCard } from './projects/project-card';
import type { ProjectCardActions } from './projects/project-card';
import { useProjectAI } from './projects/use-project-ai';
import { reorderIndexMap } from './form-utils';

interface ProjectsFormProps {
  projects: Project[];
  onChange: (projects: Project[]) => void;
  profile: Profile;
}

function areProjectsPropsEqual(prevProps: ProjectsFormProps, nextProps: ProjectsFormProps) {
  return (
    JSON.stringify(prevProps.projects) === JSON.stringify(nextProps.projects) &&
    prevProps.profile.id === nextProps.profile.id
  );
}

export const ProjectsForm = memo(function ProjectsFormComponent({
  projects,
  onChange,
  profile,
}: ProjectsFormProps) {
  const ai = useProjectAI({ projects, onChange });
  const [newTechnologies, setNewTechnologies] = useState<{ [key: number]: string }>({});

  const addProject = () => {
    onChange([
      {
        name: '',
        description: [],
        technologies: [],
        date: '',
        url: '',
        github_url: '',
      },
      ...projects,
    ]);
  };

  const updateProject = (
    index: number,
    field: keyof Project,
    value: Project[keyof Project],
  ) => {
    const updated = [...projects];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const removeProject = (index: number) => {
    onChange(projects.filter((_, i) => i !== index));
  };

  const moveProject = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= projects.length) return;

    ai.reorderAIIndices(index, newIndex);
    setNewTechnologies((prev) => reorderIndexMap(prev, index, newIndex));

    const updated = [...projects];
    const [item] = updated.splice(index, 1);
    updated.splice(newIndex, 0, item);

    onChange(updated);
  };

  const handleImportFromProfile = (importedProjects: Project[]) => {
    onChange([...importedProjects, ...projects]);
  };

  const addPoint = (projectIndex: number) => {
    // Immutable update so the memo comparator sees the change.
    const updated = [...projects];
    updated[projectIndex] = {
      ...updated[projectIndex],
      description: [...updated[projectIndex].description, ''],
    };
    onChange(updated);
  };

  const updatePoint = (projectIndex: number, pointIndex: number, value: string) => {
    const updated = [...projects];
    updated[projectIndex] = {
      ...updated[projectIndex],
      description: updated[projectIndex].description.map((d, i) =>
        i === pointIndex ? value : d,
      ),
    };
    onChange(updated);
  };

  const deletePoint = (projectIndex: number, pointIndex: number) => {
    const updated = [...projects];
    updated[projectIndex] = {
      ...updated[projectIndex],
      description: updated[projectIndex].description.filter((_, i) => i !== pointIndex),
    };
    onChange(updated);
  };

  const addTechnology = (projectIndex: number) => {
    const techToAdd = newTechnologies[projectIndex]?.trim();
    if (!techToAdd) return;

    const updated = [...projects];
    const currentTechnologies = updated[projectIndex].technologies || [];

    if (!currentTechnologies.includes(techToAdd)) {
      updated[projectIndex] = {
        ...updated[projectIndex],
        technologies: [...currentTechnologies, techToAdd],
      };
      onChange(updated);
    }
    setNewTechnologies((prev) => ({ ...prev, [projectIndex]: '' }));
  };

  const handleTechKeyDown = (e: KeyboardEvent<HTMLInputElement>, projectIndex: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTechnology(projectIndex);
    }
  };

  const removeTechnology = (projectIndex: number, techIndex: number) => {
    const updated = [...projects];
    // Immutable update (see approveSuggestion note in use-project-ai).
    updated[projectIndex] = {
      ...updated[projectIndex],
      technologies: (updated[projectIndex].technologies || []).filter(
        (_, i) => i !== techIndex,
      ),
    };
    onChange(updated);
  };

  const actionsFor = (index: number): ProjectCardActions => ({
    updateField: (field, value) => updateProject(index, field, value),
    remove: () => removeProject(index),
    move: (direction) => moveProject(index, direction),
    addPoint: () => addPoint(index),
    updatePoint: (pointIndex, value) => updatePoint(index, pointIndex, value),
    deletePoint: (pointIndex) => deletePoint(index, pointIndex),
    addTechnology: () => addTechnology(index),
    removeTechnology: (techIndex) => removeTechnology(index, techIndex),
    techDraft: newTechnologies[index] || '',
    onTechDraftChange: (value) =>
      setNewTechnologies((prev) => ({ ...prev, [index]: value })),
    onTechKeyDown: (event) => handleTechKeyDown(event, index),
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
              onClick={addProject}
              className={cn(
                'flex-1 h-9 min-w-[120px]',
                'bg-gradient-to-r from-violet-500/5 via-violet-500/10 to-purple-500/5',
                'hover:from-violet-500/10 hover:via-violet-500/15 hover:to-purple-500/10',
                'border-2 border-dashed border-violet-500/30 hover:border-violet-500/40',
                'text-violet-700 hover:text-violet-800',
                'transition-all duration-300',
                'rounded-xl',
                'whitespace-nowrap text-[11px] @[300px]:text-sm',
              )}
            >
              <Plus className="h-4 w-4 mr-2 shrink-0" />
              Add Project
            </Button>

            <ImportFromProfileDialog<Project>
              profile={profile}
              onImport={handleImportFromProfile}
              type="projects"
              buttonClassName={cn(
                'flex-1 mb-0 h-9 min-w-[120px]',
                'bg-gradient-to-r from-violet-500/5 via-violet-500/10 to-purple-500/5',
                'hover:from-violet-500/10 hover:via-violet-500/15 hover:to-purple-500/10',
                'border-2 border-dashed border-violet-500/30 hover:border-violet-500/40',
                'text-violet-700 hover:text-violet-800',
                'transition-all duration-300',
                'rounded-xl',
                'whitespace-nowrap text-[11px] @[300px]:text-sm',
              )}
            />
          </div>
        </div>

        {projects.map((project, index) => (
          <ProjectCard
            key={index}
            project={project}
            index={index}
            isFirst={index === 0}
            isLast={index === projects.length - 1}
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
}, areProjectsPropsEqual);
