import type { Dispatch, SetStateAction } from 'react';
import { Copy, Upload, Wand2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { Profile } from '@/lib/types';
import type { useCreateBaseResume } from './use-create-base-resume';

type CreateBaseResumeState = ReturnType<typeof useCreateBaseResume>;
export type BaseResumeImportOption = 'import-profile' | 'scratch' | 'import-resume';

type CreateBaseResumeStepTwoProps = Pick<
  CreateBaseResumeState,
  | 'selectedItems'
  | 'currentStep'
  | 'isDragging'
  | 'getItemId'
  | 'handleItemSelection'
  | 'handleSectionSelection'
  | 'isSectionSelected'
  | 'isSectionPartiallySelected'
  | 'handleDrag'
  | 'handleDrop'
  | 'handleFileInput'
> & {
  profile: Profile;
  targetRole: string;
  resumeText: string;
  setResumeText: Dispatch<SetStateAction<string>>;
  importOption: BaseResumeImportOption;
  setImportOption: (option: BaseResumeImportOption) => void;
};

export function CreateBaseResumeStepTwo(props: CreateBaseResumeStepTwoProps) {
  const {
    profile, targetRole, currentStep, resumeText, setResumeText, importOption, setImportOption, selectedItems, isDragging,
    getItemId, handleItemSelection, handleSectionSelection, isSectionSelected,
    isSectionPartiallySelected, handleDrag, handleDrop, handleFileInput,
  } = props;

  return (
    <>
      {currentStep === 2 && (
  <div className="space-y-5">
    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
      <div className="text-sm text-purple-800">
        <span className="font-medium">Target Role:</span> {targetRole}
      </div>
    </div>

    <div className="space-y-3">
      <Label className="text-sm font-medium text-gray-900">Resume Content</Label>
      <div className="grid grid-cols-3 gap-2">
        {[
          { id: 'import-profile', icon: Copy, label: 'From Profile', desc: 'Use existing profile data' },
          { id: 'import-resume', icon: Upload, label: 'Import Resume', desc: 'Upload or paste resume' },
          { id: 'scratch', icon: Wand2, label: 'Start Fresh', desc: 'Create from scratch' },
        ].map((option) => (
          <div key={option.id}>
            <input
              type="radio"
              id={option.id}
              name="importOption"
              value={option.id}
              checked={importOption === option.id}
              onChange={(e) => setImportOption(e.target.value as 'import-profile' | 'scratch' | 'import-resume')}
              className="sr-only peer"
            />
            <Label
              htmlFor={option.id}
              className={cn(
                'flex flex-col items-center p-3 rounded-lg border cursor-pointer transition-all',
                'hover:border-purple-200 hover:bg-purple-50/50',
                'peer-checked:border-purple-500 peer-checked:bg-purple-50 peer-checked:shadow-sm'
              )}
            >
              <option.icon className="w-5 h-5 text-purple-600 mb-2" />
              <div className="text-xs font-medium text-center">
                <div className="text-gray-900">{option.label}</div>
                <div className="text-gray-500 mt-0.5">{option.desc}</div>
              </div>
            </Label>
          </div>
        ))}
      </div>

      {importOption === 'import-profile' && (
        <div className="mt-4 space-y-3">
          <div className="text-sm font-medium text-gray-900">
            Select Content to Include
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: 'work_experience', label: 'Work Experience', data: profile.work_experience },
              { key: 'projects', label: 'Projects', data: profile.projects },
              { key: 'education', label: 'Education', data: profile.education },
              { key: 'skills', label: 'Skills', data: profile.skills },
            ].map((section) => (
              <Accordion key={section.key} type="single" collapsible>
                <AccordionItem
                  value={section.key}
                  className="border border-gray-200 rounded-lg"
                >
                  <div className="flex items-center gap-2 px-3 py-2">
                    <Checkbox
                      checked={isSectionSelected(section.key as keyof typeof selectedItems)}
                      onCheckedChange={(checked) =>
                        handleSectionSelection(
                          section.key as keyof typeof selectedItems,
                          checked as boolean
                        )
                      }
                      className={cn(
                        isSectionPartiallySelected(
                          section.key as keyof typeof selectedItems
                        ) && 'data-[state=checked]:bg-purple-600/50'
                      )}
                    />
                    <AccordionTrigger className="flex-1 py-0 hover:no-underline">
                      <div className="flex items-center justify-between w-full">
                        <span className="text-sm font-medium">{section.label}</span>
                        <span className="text-xs text-gray-500">{section.data.length}</span>
                      </div>
                    </AccordionTrigger>
                  </div>
                  <AccordionContent className="px-3 pb-3">
                    <div className="space-y-1.5 max-h-32 overflow-y-auto">
                      {section.data.map(
                        (item, index) => {
                          const id = getItemId(
                            section.key as keyof typeof selectedItems,
                            item,
                            index
                          );
                          return (
                            <div
                              key={id}
                              className="flex items-center gap-2 p-2 rounded bg-gray-50 hover:bg-gray-100 transition-colors"
                            >
                              <Checkbox
                                checked={selectedItems[
                                  section.key as keyof typeof selectedItems
                                ].includes(id)}
                                onCheckedChange={() =>
                                  handleItemSelection(
                                    section.key as keyof typeof selectedItems,
                                    id
                                  )
                                }
                              />
                              <div
                                className="flex-1 min-w-0 cursor-pointer"
                                onClick={() =>
                                  handleItemSelection(
                                    section.key as keyof typeof selectedItems,
                                    id
                                  )
                                }
                              >
                                {section.key === 'work_experience' && (
                                  <div>
                                    <div className="text-xs font-medium truncate">
                                      {(item as import('@/lib/types').WorkExperience).position}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {(item as import('@/lib/types').WorkExperience).company} •{' '}
                                      {(item as import('@/lib/types').WorkExperience).date}
                                    </div>
                                  </div>
                                )}
                                {section.key === 'projects' && (
                                  <div>
                                    <div className="text-xs font-medium truncate">
                                      {(item as import('@/lib/types').Project).name}
                                    </div>
                                    {(item as import('@/lib/types').Project).technologies?.length && (
                                      <div className="text-xs text-gray-500 truncate">
                                        {(item as import('@/lib/types').Project).technologies
                                          ?.slice(0, 2)
                                          .join(', ')}
                                      </div>
                                    )}
                                  </div>
                                )}
                                {section.key === 'education' && (
                                  <div>
                                    <div className="text-xs font-medium truncate">
                                      {(item as import('@/lib/types').Education).degree} in
                                      {(item as import('@/lib/types').Education).field}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {(item as import('@/lib/types').Education).school} •
                                      {(item as import('@/lib/types').Education).date}
                                    </div>
                                  </div>
                                )}
                                {section.key === 'skills' && (
                                  <div>
                                    <div className="text-xs font-medium">
                                      {(item as import('@/lib/types').Skill).category}
                                    </div>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {(item as import('@/lib/types').Skill).items
                                        .slice(0, 3)
                                        .map((skill: string, index: number) => (
                                          <Badge
                                            key={index}
                                            variant="secondary"
                                            className="text-[10px] px-1 py-0"
                                          >
                                            {skill}
                                          </Badge>
                                        ))}
                                      {(item as import('@/lib/types').Skill).items.length > 3 && (
                                        <span className="text-[10px] text-gray-500">
                                          +{(item as import('@/lib/types').Skill).items.length - 3} more
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        }
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            ))}
          </div>
        </div>
      )}

      {importOption === 'import-resume' && (
        <div className="space-y-3">
          <label
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={cn(
              'border-2 border-dashed rounded-lg p-6 flex flex-col items-center gap-2 transition-colors cursor-pointer',
              isDragging ? 'border-purple-500 bg-purple-50' : 'border-gray-300 hover:border-purple-400'
            )}
          >
            <input type="file" className="hidden" accept="application/pdf" onChange={handleFileInput} />
            <Upload className="w-8 h-8 text-purple-500" />
            <div className="text-center">
              <p className="text-sm font-medium">Drop PDF here or click to browse</p>
              <p className="text-xs text-gray-500">Supports PDF files only</p>
            </div>
          </label>
          <Textarea
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
            placeholder="Or paste your resume text here..."
            className="min-h-[120px] text-sm"
          />
        </div>
      )}
    </div>
  </div>
)}
    </>
  );
}
