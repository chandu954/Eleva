'use client';

import { useRouter } from 'next/navigation';
import { toast } from '@/hooks/use-toast';
import type { CreationStep } from '../loading-overlay';
import { createTailoredResume, getResumeById } from '@/utils/actions/resumes/actions';
import { tailorResumeToJob, formatJobListing } from '@/utils/actions/jobs/ai';
import { createJob } from '@/utils/actions/jobs/actions';

type CreateTailoredResumeOptions = {
  selectedBaseResume: string;
  jobDescription: string;
  importOption: 'import-profile' | 'ai';
  setIsBaseResumeInvalid: (value: boolean) => void;
  setIsJobDescriptionInvalid: (value: boolean) => void;
  setIsCreating: (value: boolean) => void;
  setCurrentStep: (value: CreationStep) => void;
  setErrorMessage: (value: { title: string; description: string }) => void;
  setShowErrorDialog: (value: boolean) => void;
  setOpen: (value: boolean) => void;
  router: ReturnType<typeof useRouter>;
};

export function useCreateTailoredResume(options: CreateTailoredResumeOptions) {
  const { selectedBaseResume, jobDescription, importOption, setIsBaseResumeInvalid, setIsJobDescriptionInvalid, setIsCreating, setCurrentStep, setErrorMessage, setShowErrorDialog, setOpen, router } = options;
  function redactSecrets(text: string) {
    return text
      .replace(/Bearer\s+[^,\s]+/gi, 'Bearer ***')
      .replace(/sk-[a-zA-Z0-9]{8,}/g, 'sk-***')
      .replace(/AIza[0-9A-Za-z\-_]{20,}/g, 'AIza***');
  }

  function getErrorDetails(error: unknown) {
    if (error instanceof Error) return redactSecrets(error.message);
    if (typeof error === 'string') return redactSecrets(error);
    if (!error) return '';
    try {
      return redactSecrets(JSON.stringify(error));
    } catch {
      return '';
    }
  }

  function buildErrorDescription(summary: string, error: unknown) {
    const details = getErrorDetails(error);
    const detailsText = details ? ` Details: ${details}` : '';
    return `${summary}${detailsText}. Contact the developer at hi@alexo.ca for help.`;
  }

  const handleCreate = async () => {
    // Validate required fields
    if (!selectedBaseResume) {
      setIsBaseResumeInvalid(true);
      toast({
        title: "Error",
        description: "Please select a base resume",
        variant: "destructive",
      });
      return;
    }

    if (!jobDescription.trim() && importOption === 'ai') {
      setIsJobDescriptionInvalid(true);
      toast({
        title: "Error",
        description: "Please enter a job description",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsCreating(true);
      setCurrentStep('analyzing');

      // Reset validation states
      setIsBaseResumeInvalid(false);
      setIsJobDescriptionInvalid(false);

      if (importOption === 'import-profile') {
        // Direct copy logic
        const { resume: baseResume } = await getResumeById(selectedBaseResume);
        if (!baseResume) throw new Error("Base resume not found");

        let jobId: string | null = null;
        let jobTitle = 'Copied Resume';
        let companyName = '';

        if (jobDescription.trim()) {
          // Get model and API key from local storage
          const MODEL_STORAGE_KEY = 'eleva-default-model';
          const LOCAL_STORAGE_KEY = 'eleva-api-keys';

          const selectedModel = localStorage.getItem(MODEL_STORAGE_KEY);
          const storedKeys = localStorage.getItem(LOCAL_STORAGE_KEY);
          let apiKeys = [];

          try {
            apiKeys = storedKeys ? JSON.parse(storedKeys) : [];
          } catch (error) {
            console.error('Error parsing API keys:', error);
          }

          try {
            setCurrentStep('analyzing');
            const formattedJobListing = await formatJobListing(jobDescription, {
              model: selectedModel || '',
              apiKeys
            });

            setCurrentStep('formatting');
            const jobEntry = await createJob(formattedJobListing);
            if (!jobEntry?.id) throw new Error("Failed to create job entry");

            jobId = jobEntry.id;
            jobTitle = formattedJobListing.position_title || 'Copied Resume';
            companyName = formattedJobListing.company_name || '';
          } catch (error: Error | unknown) {
            if (error instanceof Error && (
                error.message.toLowerCase().includes('api key') ||
                error.message.toLowerCase().includes('unauthorized') ||
                error.message.toLowerCase().includes('invalid key'))
            ) {
              setErrorMessage({
                title: "API Key Error",
                description: buildErrorDescription(
                  "There was an issue with your API key. Please check your settings and try again",
                  error
                )
              });
            } else {
              setErrorMessage({
                title: "Error",
                description: buildErrorDescription("Failed to process job description. Please try again", error)
              });
            }
            setShowErrorDialog(true);
            setIsCreating(false);
            return;
          }
        }

        const resume = await createTailoredResume(
          baseResume,
          jobId,
          jobTitle,
          companyName,
          {
            work_experience: baseResume.work_experience,
            education: baseResume.education.map(edu => ({
              ...edu,
              gpa: edu.gpa?.toString()
            })),
            skills: baseResume.skills,
            projects: baseResume.projects,
            target_role: baseResume.target_role
          }
        );

        toast({
          title: "Success",
          description: "Resume created successfully",
        });

        router.push(`/resumes/${resume.id}`);
        setOpen(false);
        return;
      }

      // Get model and API key from local storage
      const MODEL_STORAGE_KEY = 'eleva-default-model';
      const LOCAL_STORAGE_KEY = 'eleva-api-keys';

      const selectedModel = localStorage.getItem(MODEL_STORAGE_KEY);
      const storedKeys = localStorage.getItem(LOCAL_STORAGE_KEY);
      let apiKeys = [];

      try {
        apiKeys = storedKeys ? JSON.parse(storedKeys) : [];
      } catch (error) {
        console.error('Error parsing API keys:', error);
      }
      // 1. Format the job listing
      let formattedJobListing;
      try {
        formattedJobListing = await formatJobListing(jobDescription, {
          model: selectedModel || '',
          apiKeys
        });
      } catch (error: Error | unknown) {
        if (error instanceof Error && (
            error.message.toLowerCase().includes('api key') ||
            error.message.toLowerCase().includes('unauthorized') ||
            error.message.toLowerCase().includes('invalid key'))
        ) {
          setErrorMessage({
            title: "API Key Error",
            description: buildErrorDescription(
              "There was an issue with your API key. Please check your settings and try again",
              error
            )
          });
        } else {
          setErrorMessage({
            title: "Error",
            description: buildErrorDescription("Failed to analyze job description. Please try again", error)
          });
        }
        setShowErrorDialog(true);
        setIsCreating(false);
        return;
      }

      setCurrentStep('formatting');

      // 2. Create job in database and get ID
      const jobEntry = await createJob(formattedJobListing);
      if (!jobEntry?.id) throw new Error("Failed to create job entry");


      // 3. Get the base resume object
      const { resume: baseResume } = await getResumeById(selectedBaseResume);
      if (!baseResume) throw new Error("Base resume not found");

      setCurrentStep('tailoring');

      // 4. Tailor the resume using the formatted job listing
      let tailoredContent;

      try {
        tailoredContent = await tailorResumeToJob(baseResume, formattedJobListing, {
          model: selectedModel || '',
          apiKeys
        });
      } catch (error: Error | unknown) {
        if (error instanceof Error && (
            error.message.toLowerCase().includes('api key') ||
            error.message.toLowerCase().includes('unauthorized') ||
            error.message.toLowerCase().includes('invalid key'))
        ) {
          setErrorMessage({
            title: "API Key Error",
            description: buildErrorDescription(
              "There was an issue with your API key. Please check your settings and try again",
              error
            )
          });
        } else {
          setErrorMessage({
            title: "Error",
            description: buildErrorDescription("Failed to tailor resume. Please try again", error)
          });
        }
        setShowErrorDialog(true);
        setIsCreating(false);
        return;
      }


      setCurrentStep('finalizing');


      // 5. Create the tailored resume with job reference
      const resume = await createTailoredResume(
        baseResume,
        jobEntry.id,
        formattedJobListing.position_title || '',
        formattedJobListing.company_name || '',
        tailoredContent,
      );

      toast({
        title: "Success",
        description: "Resume created successfully",
      });

      router.push(`/resumes/${resume.id}`);
      setOpen(false);
    } catch (error: unknown) {
      console.error('Failed to create resume:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create resume",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  return handleCreate;
}
