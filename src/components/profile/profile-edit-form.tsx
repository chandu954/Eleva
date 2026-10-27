'use client';

import type { Profile } from '@/lib/types';
import type { AIConfig } from '@/lib/ai-models';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Linkedin, Loader2, Save, Trash2 } from 'lucide-react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { formatProfileWithAI } from '@/utils/actions/profiles/ai';
import { importResume, updateProfile } from '@/utils/actions/profiles/actions';
import { normalizeImportedProfile } from '@/components/profile/profile-import-normalizer';
import { ProfileImportDialog } from '@/components/profile/profile-import-dialog';
import { ProfileEditorTabs } from '@/components/profile/profile-editor-tabs';

interface ProfileEditFormProps {
  profile: Profile;
}

export function ProfileEditForm({ profile: initialProfile }: ProfileEditFormProps) {
  const [profile, setProfile] = useState(initialProfile);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isResumeDialogOpen, setIsResumeDialogOpen] = useState(false);
  const [isTextImportDialogOpen, setIsTextImportDialogOpen] = useState(false);
  const [resumeContent, setResumeContent] = useState('');
  const [textImportContent, setTextImportContent] = useState('');
  const [isProcessingResume, setIsProcessingResume] = useState(false);
  const [apiKeyError, setApiKeyError] = useState('');
  const router = useRouter();

  // Sync with server state when initialProfile changes
  useEffect(() => {
    setProfile(initialProfile);
  }, [initialProfile]);

  // Clear the import error once both dialogs are closed.
  useEffect(() => {
    if (!isResumeDialogOpen && !isTextImportDialogOpen) {
      setApiKeyError('');
    }
  }, [isResumeDialogOpen, isTextImportDialogOpen]);

  const updateField = (field: keyof Profile, value: unknown) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      await updateProfile(profile);
      toast.success('Changes saved successfully', {
        position: 'bottom-right',
        className:
          'bg-gradient-to-r from-emerald-500 to-green-500 text-white border-none',
      });
      // Force a server revalidation
      router.refresh();
    } catch (error) {
      void error;
      toast.error('Unable to save your changes. Please try again.', {
        position: 'bottom-right',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = async () => {
    try {
      setIsResetting(true);
      // Reset to empty profile locally
      const resetProfile = {
        id: profile.id,
        user_id: profile.user_id,
        first_name: '',
        last_name: '',
        email: '',
        phone_number: '',
        location: '',
        website: '',
        linkedin_url: '',
        github_url: '',
        work_experience: [],
        education: [],
        skills: [],
        projects: [],
        created_at: profile.created_at,
        updated_at: profile.updated_at,
      };

      setProfile(resetProfile);

      await updateProfile(resetProfile);

      toast.success('Profile reset successfully', {
        position: 'bottom-right',
        className:
          'bg-gradient-to-r from-blue-500 to-indigo-500 text-white border-none',
      });

      // Force a server revalidation
      router.refresh();
    } catch (error: unknown) {
      toast.error('Failed to reset profile. Please try again.', {
        position: 'bottom-right',
      });
      console.error(error);
    } finally {
      setIsResetting(false);
    }
  };

  const handleLinkedInImport = () => {
    toast.info('LinkedIn import feature coming soon!', {
      position: 'bottom-right',
      className:
        'bg-gradient-to-r from-blue-500 to-indigo-500 text-white border-none',
    });
  };

  const handleResumeUpload = async (content: string) => {
    try {
      setIsProcessingResume(true);

      const MODEL_STORAGE_KEY = 'eleva-default-model';
      const LOCAL_STORAGE_KEY = 'eleva-api-keys';

      const selectedModel = localStorage.getItem(MODEL_STORAGE_KEY) || 'gpt-5.4-nano';
      const storedKeys = localStorage.getItem(LOCAL_STORAGE_KEY);
      let apiKeys: AIConfig['apiKeys'] = [];

      try {
        apiKeys = storedKeys ? JSON.parse(storedKeys) : [];
      } catch (error) {
        console.error('Error parsing API keys:', error);
      }

      const result = await formatProfileWithAI(content, {
        model: selectedModel,
        apiKeys,
      });

      if (result) {
        // The AI result is defensively normalized to the database schema.
        const cleanedProfile = normalizeImportedProfile(result);

        await importResume(cleanedProfile);

        setProfile((prev) => ({
          ...prev,
          ...cleanedProfile,
        }));
        toast.success(
          "Content imported successfully - Don't forget to save your changes",
          {
            position: 'bottom-right',
            className:
              'bg-gradient-to-r from-emerald-500 to-green-500 text-white border-none',
          },
        );
        setIsResumeDialogOpen(false);
        setIsTextImportDialogOpen(false);
        setResumeContent('');
        setTextImportContent('');
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('Resume upload error:', error);
        if (error.message.toLowerCase().includes('api key')) {
          setApiKeyError(
            'API key required. Please add your OpenAI API key in settings or upgrade to our Pro Plan.',
          );
        } else {
          toast.error('Failed to process content: ' + error.message, {
            position: 'bottom-right',
          });
        }
      }
    } finally {
      setIsProcessingResume(false);
    }
  };

  return (
    <div className="relative mx-auto">
      {/* Action Bar */}
      <div className="z-50 mt-4">
        <div className="max-w-[2000px] mx-auto">
          <div className="mx-6 mb-6">
            <div className="bg-white/80 backdrop-blur-xl border border-white/40 shadow-lg rounded-2xl p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-gradient-to-r from-teal-500 to-cyan-600" />
                <span className="text-sm font-medium text-muted-foreground">
                  Profile Editor
                </span>
              </div>

              <div className="flex items-center gap-3">
                {/* Reset Profile Button */}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      className="relative bg-white/50 hover:bg-white/60 border-rose-500/20 hover:border-rose-500/30 text-rose-600 transition-all duration-500 h-9 px-4 shadow-sm hover:shadow-md group"
                      disabled={isResetting}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-rose-500/0 via-rose-500/5 to-rose-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                      {isResetting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Resetting...
                        </>
                      ) : (
                        <>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Reset
                        </>
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="sm:max-w-[425px]">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Reset Profile</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to reset your profile? This action cannot be
                        undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={isResetting}>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleReset}
                        disabled={isResetting}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {isResetting ? 'Resetting...' : 'Reset Profile'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                {/* Save Button */}
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  size="sm"
                  className="relative bg-gradient-to-r from-teal-500 to-cyan-600 text-white hover:from-teal-600 hover:to-cyan-700 transition-all duration-500 shadow-md hover:shadow-lg hover:shadow-teal-500/20 h-9 px-4 group"
                >
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,transparent_0%,#ffffff20_50%,transparent_100%)] translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content container with consistent styling */}
      <div className="relative px-6 md:px-8 lg:px-10 pb-10">
        {/* Import Actions Row */}
        <div className="relative mb-6">
          <div className="bg-white/40 backdrop-blur-md rounded-2xl border border-white/40 p-6 shadow-xl">
            <div className="flex flex-col gap-4">
              {/* Import Options Text */}
              <div className="flex items-center gap-2 text-sm text-purple-600/60">
                <div className="flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 shadow-sm shadow-purple-500/20" />
                  <span className="font-medium">Import Options</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* LinkedIn Import Button */}
                <Button
                  variant="outline"
                  onClick={handleLinkedInImport}
                  className="group relative bg-[#0077b5]/5 hover:bg-[#0077b5]/10 border-[#0077b5]/20 hover:border-[#0077b5]/30 text-[#0077b5] transition-all duration-500 hover:scale-[1.02] h-auto py-4"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-[#0077b5]/0 via-[#0077b5]/5 to-[#0077b5]/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="relative flex items-center gap-4">
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-[#0077b5]/10 group-hover:scale-110 transition-transform duration-500">
                      <Linkedin className="h-6 w-6" />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-[#0077b5]">LinkedIn Import</div>
                      <div className="text-sm text-[#0077b5]/70">
                        Sync with your LinkedIn profile
                      </div>
                    </div>
                  </div>
                </Button>

                <ProfileImportDialog
                  open={isResumeDialogOpen}
                  onOpenChange={setIsResumeDialogOpen}
                  triggerTitle="Resume Upload"
                  triggerSubtitle="Import from existing resume"
                  title="Upload Resume Content"
                  description={
                    <div className="space-y-2 text-base text-muted-foreground/80">
                      <span className="block">
                        Let our AI analyze your resume and enhance your profile by adding
                        new information.
                      </span>
                      <span className="block text-sm">
                        Your existing profile information will be preserved. New entries
                        will be added alongside your current data. Want to start fresh
                        instead? Use the &quot;Reset Profile&quot; option before
                        uploading.
                      </span>
                    </div>
                  }
                  dropTitle="Drop your PDF resume here"
                  pasteLabel="Or paste your resume text here"
                  placeholder="Paste your resume content here..."
                  content={resumeContent}
                  onContentChange={setResumeContent}
                  onProcess={handleResumeUpload}
                  isProcessing={isProcessingResume}
                  apiKeyError={apiKeyError}
                />

                <ProfileImportDialog
                  open={isTextImportDialogOpen}
                  onOpenChange={setIsTextImportDialogOpen}
                  triggerTitle="Import From Text"
                  triggerSubtitle="Import from any text content"
                  title="Import From Text"
                  description={
                    <div className="space-y-2 text-base text-muted-foreground/80">
                      <span className="block">
                        Paste any text content below (resume, job description,
                        achievements, etc.). Our AI will analyze it and enhance your
                        profile by adding relevant information.
                      </span>
                      <span className="block text-sm">
                        Your existing profile information will be preserved. New entries
                        will be added alongside your current data.
                      </span>
                    </div>
                  }
                  dropTitle="Drop your PDF file here"
                  pasteLabel="Or paste your text content here"
                  placeholder="Paste your text content here..."
                  content={textImportContent}
                  onContentChange={setTextImportContent}
                  onProcess={handleResumeUpload}
                  isProcessing={isProcessingResume}
                  apiKeyError={apiKeyError}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Tabs with smooth transitions and connected design */}
        <div className="relative">
          <div className="relative">
            <ProfileEditorTabs profile={profile} onFieldChange={updateField} />
          </div>
          <div className="absolute inset-x-0 -bottom-3 h-8 bg-gradient-to-t from-white/60 to-transparent pointer-events-none"></div>
        </div>
      </div>
    </div>
  );
}
