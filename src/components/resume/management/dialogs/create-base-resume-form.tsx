'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, FileText, Copy, Wand2, Upload } from 'lucide-react';
import { cn, withBasePath } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import { Textarea } from '@/components/ui/textarea';
import { ApiErrorDialog } from '@/components/ui/api-error-dialog';
import type { Profile } from '@/lib/types';
import { useCreateBaseResume } from './use-create-base-resume';

interface CreateBaseResumeFormProps {
  children: React.ReactNode;
  profile: Profile;
}

export function CreateBaseResumeForm({ children, profile }: CreateBaseResumeFormProps) {
  const [open, setOpen] = useState(false);
  const [targetRole, setTargetRole] = useState('');
  const [importOption, setImportOption] = useState<'import-profile' | 'scratch' | 'import-resume'>('import-profile');
  const [resumeText, setResumeText] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState({ title: '', description: '' });

  const router = useRouter();

  const {
    selectedItems,
    isTargetRoleInvalid,
    currentStep,
    setCurrentStep,
    isDragging,
    getItemId,
    handleItemSelection,
    handleSectionSelection,
    isSectionSelected,
    isSectionPartiallySelected,
    handleNext,
    handleBack,
    handleCreate,
    initializeSelectedItems,
    handleDrag,
    handleDrop,
    handleFileInput,
  } = useCreateBaseResume({
    profile,
    targetRole,
    setTargetRole,
    importOption,
    setImportOption,
    resumeText,
    setResumeText,
    isCreating,
    setIsCreating,
    showErrorDialog,
    setShowErrorDialog,
    errorMessage,
    setErrorMessage,
    toast,
    router,
  });

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      const trigger = document.querySelector('[data-state="open"]');
      if (trigger) {
        (trigger as HTMLElement).focus();
      }
    }
    setOpen(newOpen);
    if (newOpen) {
      setTargetRole('');
      setCurrentStep(1);
      setImportOption('import-profile');
      setResumeText('');
      initializeSelectedItems();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent
        className={cn(
          'sm:max-w-[700px] p-0 max-h-[85vh] overflow-y-auto',
          'bg-white border border-gray-200 shadow-lg rounded-lg'
        )}
      >
        <style jsx global>{`
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-2px); }
            20%, 40%, 60%, 80% { transform: translateX(2px); }
          }
          .shake {
            animation: shake 0.8s cubic-bezier(.36,.07,.19,.97) both;
          }
        `}</style>

        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-50 border border-purple-100">
              <FileText className="w-5 h-5 text-purple-600" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-lg font-semibold text-gray-900">
                Create Base Resume
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-600">
                {currentStep === 1 ? 'Start by entering your target role' : 'Configure your resume content'}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium',
                  currentStep >= 1 ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-600'
                )}
              >
                1
              </div>
              <div className={cn('w-4 h-0.5', currentStep >= 2 ? 'bg-purple-600' : 'bg-gray-200')} />
              <div
                className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium',
                  currentStep >= 2 ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-600'
                )}
              >
                2
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-6 min-h-[300px]">
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h3 className="text-xl font-semibold text-gray-900">
                  What role are you targeting?
                </h3>
                <p className="text-gray-600">
                  This helps us tailor your resume content and format
                </p>
              </div>

              <div className="space-y-4 max-w-md mx-auto">
                <div className="space-y-2">
                  <Label htmlFor="target-role" className="text-sm font-medium text-gray-900">
                    Target Role <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="target-role"
                    placeholder="e.g., Senior Software Engineer, Product Manager, Data Scientist"
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleNext();
                      }
                    }}
                    className={cn(
                      'h-12 text-base focus:border-purple-500 focus:ring-purple-500/20',
                      isTargetRoleInvalid && 'border-red-500 shake'
                    )}
                    required
                    autoFocus
                  />
                </div>

                <div className="text-xs text-gray-500 space-y-1">
                  <p>💡 <strong>Tips for better results:</strong></p>
                  <ul className="list-disc list-inside space-y-0.5 ml-4">
                    <li>Be specific (e.g., &ldquo;Frontend Developer&rdquo; vs &ldquo;Developer&rdquo;)</li>
                    <li>Include seniority level if relevant</li>
                    <li>Match the job posting language when possible</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

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
        </div>

        <ApiErrorDialog
          open={showErrorDialog}
          onOpenChange={setShowErrorDialog}
          errorMessage={errorMessage}
          onUpgrade={() => {
            setShowErrorDialog(false);
            window.location.href = withBasePath('/subscription');
          }}
          onSettings={() => {
            setShowErrorDialog(false);
            window.location.href = withBasePath('/settings');
          }}
        />

        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50">
          <div className="flex justify-between">
            <div>
              {currentStep === 2 && (
                <Button variant="outline" onClick={handleBack} size="sm">
                  Back
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setOpen(false)} size="sm">
                Cancel
              </Button>
              {currentStep === 1 && (
                <Button onClick={handleNext} size="sm" className="bg-purple-600 hover:bg-purple-700">
                  Next
                </Button>
              )}
              {currentStep === 2 && (
                <Button
                  onClick={handleCreate}
                  disabled={isCreating}
                  size="sm"
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Resume'
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
