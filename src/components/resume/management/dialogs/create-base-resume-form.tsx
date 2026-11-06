'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, FileText } from 'lucide-react';
import { cn, withBasePath } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { ApiErrorDialog } from '@/components/ui/api-error-dialog';
import type { Profile } from '@/lib/types';
import { useCreateBaseResume } from './use-create-base-resume';
import { CreateBaseResumeStepTwo, type BaseResumeImportOption } from './create-base-resume-step-two';

interface CreateBaseResumeFormProps {
  children: React.ReactNode;
  profile: Profile;
}

export function CreateBaseResumeForm({ children, profile }: CreateBaseResumeFormProps) {
  const [open, setOpen] = useState(false);
  const [targetRole, setTargetRole] = useState('');
  const [importOption, setImportOption] = useState<BaseResumeImportOption>('import-profile');
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

          <CreateBaseResumeStepTwo
            profile={profile}
            currentStep={currentStep}
            targetRole={targetRole}
            resumeText={resumeText}
            setResumeText={setResumeText}
            importOption={importOption}
            setImportOption={setImportOption}
            selectedItems={selectedItems}
            isDragging={isDragging}
            getItemId={getItemId}
            handleItemSelection={handleItemSelection}
            handleSectionSelection={handleSectionSelection}
            isSectionSelected={isSectionSelected}
            isSectionPartiallySelected={isSectionPartiallySelected}
            handleDrag={handleDrag}
            handleDrop={handleDrop}
            handleFileInput={handleFileInput}
          />
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
