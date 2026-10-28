'use client';

import { useState, type Dispatch, type SetStateAction } from 'react';
import type { Profile, WorkExperience, Education, Skill, Project, Resume } from '@/lib/types';
import { createBaseResume } from '@/utils/actions/resumes/actions';
import { convertTextToResume } from '@/utils/actions/resumes/ai';
import { extractPdfText } from '@/lib/pdf/extract-text';

export type ImportOption = 'import-profile' | 'scratch' | 'import-resume';

interface UseCreateBaseResumeOptions {
  profile: Profile;
  targetRole: string;
  setTargetRole: Dispatch<SetStateAction<string>>;
  importOption: ImportOption;
  setImportOption: Dispatch<SetStateAction<ImportOption>>;
  resumeText: string;
  setResumeText: Dispatch<SetStateAction<string>>;
  isCreating: boolean;
  setIsCreating: (value: boolean) => void;
  showErrorDialog: boolean;
  setShowErrorDialog: (value: boolean) => void;
  errorMessage: { title: string; description: string };
  setErrorMessage: (value: { title: string; description: string }) => void;
  toast: (opts: {
    title: string;
    description?: string;
    variant?: 'default' | 'destructive';
  }) => void;
  router: ReturnType<typeof import('next/navigation').useRouter>;
}

interface UseCreateBaseResumeReturn {
  selectedItems: {
    work_experience: string[];
    education: string[];
    skills: string[];
    projects: string[];
  };
  setSelectedItems: (value: {
    work_experience: string[];
    education: string[];
    skills: string[];
    projects: string[];
  }) => void;
  isTargetRoleInvalid: boolean;
  setIsTargetRoleInvalid: (value: boolean) => void;
  currentStep: 1 | 2;
  setCurrentStep: (value: 1 | 2) => void;
  isDragging: boolean;
  setIsDragging: (value: boolean) => void;
  getItemId: (type: keyof { work_experience: string[]; education: string[]; skills: string[]; projects: string[] }, item: WorkExperience | Education | Skill | Project, index?: number) => string;
  handleItemSelection: (section: keyof { work_experience: string[]; education: string[]; skills: string[]; projects: string[] }, id: string) => void;
  handleSectionSelection: (section: keyof { work_experience: string[]; education: string[]; skills: string[]; projects: string[] }, checked: boolean) => void;
  isSectionSelected: (section: keyof { work_experience: string[]; education: string[]; skills: string[]; projects: string[] }) => boolean;
  isSectionPartiallySelected: (section: keyof { work_experience: string[]; education: string[]; skills: string[]; projects: string[] }) => boolean;
  handleNext: () => void;
  handleBack: () => void;
  handleCreate: () => Promise<void>;
  initializeSelectedItems: () => void;
  handleDrag: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent) => Promise<void>;
  handleFileInput: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  selectedContent: {
    work_experience: WorkExperience[];
    education: Education[];
    skills: Skill[];
    projects: Project[];
  };
}

export function useCreateBaseResume({
  profile,
  targetRole,
  importOption,
  resumeText,
  setResumeText,
  setIsCreating,
  setShowErrorDialog,
  setErrorMessage,
  toast,
  router,
}: UseCreateBaseResumeOptions): UseCreateBaseResumeReturn {
  const [selectedItems, setSelectedItemsState] = useState({
    work_experience: [] as string[],
    education: [] as string[],
    skills: [] as string[],
    projects: [] as string[],
  });
  const [isTargetRoleInvalid, setIsTargetRoleInvalid] = useState(false);
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [isDragging, setIsDragging] = useState(false);

  const getItemId = (type: keyof typeof selectedItems, item: WorkExperience | Education | Skill | Project, index?: number): string => {
    const baseId = (() => {
      switch (type) {
        case 'work_experience':
          return `${(item as WorkExperience).company}-${(item as WorkExperience).position}-${(item as WorkExperience).date}`;
        case 'projects':
          return (item as Project).name;
        case 'education':
          return `${(item as Education).school}-${(item as Education).degree}-${(item as Education).field}`;
        case 'skills':
          return (item as Skill).category;
        default:
          return '';
      }
    })();

    return index !== undefined ? `${baseId}-${index}` : baseId;
  };

  const handleItemSelection = (section: keyof typeof selectedItems, id: string) => {
    setSelectedItemsState((prev) => ({
      ...prev,
      [section]: prev[section].includes(id)
        ? prev[section].filter((x) => x !== id)
        : [...prev[section], id],
    }));
  };

  const handleSectionSelection = (section: keyof typeof selectedItems, checked: boolean) => {
    setSelectedItemsState((prev) => ({
      ...prev,
      [section]: checked
        ? profile[section].map((item, index) => getItemId(section, item, index))
        : [],
    }));
  };

  const isSectionSelected = (section: keyof typeof selectedItems): boolean => {
    const sectionItems = profile[section].map((item, index) => getItemId(section, item, index));
    return sectionItems.length > 0 && sectionItems.every((id) => selectedItems[section].includes(id));
  };

  const isSectionPartiallySelected = (section: keyof typeof selectedItems): boolean => {
    const sectionItems = profile[section].map((item, index) => getItemId(section, item, index));
    const selectedCount = sectionItems.filter((id) => selectedItems[section].includes(id)).length;
    return selectedCount > 0 && selectedCount < sectionItems.length;
  };

  const handleNext = () => {
    if (!targetRole.trim()) {
      setIsTargetRoleInvalid(true);
      setTimeout(() => setIsTargetRoleInvalid(false), 820);
      toast({
        title: 'Required Field Missing',
        description: 'Target role is a required field. Please enter your target role.',
        variant: 'destructive',
      });
      return;
    }
    setCurrentStep(2);
  };

  const handleBack = () => {
    setCurrentStep(1);
  };

  const handleCreate = async () => {
    if (!targetRole.trim()) {
      setIsTargetRoleInvalid(true);
      setTimeout(() => setIsTargetRoleInvalid(false), 820);
      toast({
        title: 'Required Field Missing',
        description: 'Target role is a required field. Please enter your target role.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsCreating(true);

      if (importOption === 'import-resume') {
        if (!resumeText.trim()) {
          return;
        }

        const emptyResume: Resume = {
          id: '',
          user_id: '',
          name: targetRole,
          target_role: targetRole,
          is_base_resume: true,
          first_name: '',
          last_name: '',
          email: '',
          work_experience: [],
          education: [],
          skills: [],
          projects: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          has_cover_letter: false,
        };

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
          const convertedResume = await convertTextToResume(resumeText, emptyResume, targetRole, {
            model: selectedModel || '',
            apiKeys,
          });

          const selectedContent = {
            first_name: convertedResume.first_name || '',
            last_name: convertedResume.last_name || '',
            email: convertedResume.email || '',
            phone_number: convertedResume.phone_number,
            location: convertedResume.location,
            website: convertedResume.website,
            linkedin_url: convertedResume.linkedin_url,
            github_url: convertedResume.github_url,
            work_experience: convertedResume.work_experience || [],
            education: convertedResume.education || [],
            skills: convertedResume.skills || [],
            projects: convertedResume.projects || [],
          };

          const resume = await createBaseResume(targetRole, 'import-resume', selectedContent as Resume);

          toast({
            title: 'Success',
            description: 'Resume created successfully',
          });

          router.push(`/resumes/${resume.id}`);
          return;
        } catch (error: Error | unknown) {
          if (error instanceof Error && error.message.includes('Free plan limit reached')) {
            setErrorMessage({
              title: 'Limit Reached',
              description: error.message,
            });
            setShowErrorDialog(true);
            setIsCreating(false);
            return;
          }

          if (
            error instanceof Error &&
            (error.message.toLowerCase().includes('api key') ||
              error.message.toLowerCase().includes('unauthorized') ||
              error.message.toLowerCase().includes('invalid key') ||
              error.message.toLowerCase().includes('invalid x-api-key'))
          ) {
            setErrorMessage({
              title: 'API Key Error',
              description: "There was an issue with your API key. Please check your settings and try again.",
            });
          } else {
            setErrorMessage({
              title: 'Error',
              description: 'Failed to convert resume text. Please try again.',
            });
          }
          setShowErrorDialog(true);
          setIsCreating(false);
          return;
        }
      }

      const selectedContent = {
        work_experience: profile.work_experience.filter((exp, index) =>
          selectedItems.work_experience.includes(getItemId('work_experience', exp, index))
        ),
        education: profile.education.filter((edu, index) =>
          selectedItems.education.includes(getItemId('education', edu, index))
        ),
        skills: profile.skills.filter((skill, index) =>
          selectedItems.skills.includes(getItemId('skills', skill, index))
        ),
        projects: profile.projects.filter((project, index) =>
          selectedItems.projects.includes(getItemId('projects', project, index))
        ),
      };

      const resume = await createBaseResume(
        targetRole,
        importOption === 'scratch' ? 'fresh' : importOption,
        selectedContent
      );

      toast({
        title: 'Success',
        description: 'Resume created successfully',
      });

      router.push(`/resumes/${resume.id}`);
      return;
    } catch (error) {
      console.error('Create resume error:', error);
      if (error instanceof Error && error.message.includes('Free plan limit reached')) {
        setErrorMessage({
          title: 'Limit Reached',
          description: error.message,
        });
        setShowErrorDialog(true);
        return;
      }

      setErrorMessage({
        title: 'Error',
        description: 'Failed to create resume. Please try again.',
      });
      setShowErrorDialog(true);
    } finally {
      setIsCreating(false);
    }
  };

  const initializeSelectedItems = () => {
    setSelectedItemsState({
      work_experience: profile.work_experience.map((exp, index) => getItemId('work_experience', exp, index)),
      education: profile.education.map((edu, index) => getItemId('education', edu, index)),
      skills: profile.skills.map((skill, index) => getItemId('skills', skill, index)),
      projects: profile.projects.map((project, index) => getItemId('projects', project, index)),
    });
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const pdfFile = files.find((file) => file.type === 'application/pdf');

    if (pdfFile) {
      try {
        const text = await extractPdfText(pdfFile);
        setResumeText((prev) => prev + (prev ? '\n\n' : '') + text);
      } catch {
        toast({
          title: 'PDF Processing Error',
          description: 'Failed to extract text from the PDF. Please try again or paste the content manually.',
          variant: 'destructive',
        });
      }
    } else {
      toast({
        title: 'Invalid File',
        description: 'Please drop a PDF file.',
        variant: 'destructive',
      });
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      try {
        const text = await extractPdfText(file);
        setResumeText((prev) => prev + (prev ? '\n\n' : '') + text);
      } catch {
        toast({
          title: 'PDF Processing Error',
          description: 'Failed to extract text from the PDF. Please try again or paste the content manually.',
          variant: 'destructive',
        });
      }
    }
  };

  const selectedContent = {
    work_experience: profile.work_experience.filter((exp, index) =>
      selectedItems.work_experience.includes(getItemId('work_experience', exp, index))
    ),
    education: profile.education.filter((edu, index) =>
      selectedItems.education.includes(getItemId('education', edu, index))
    ),
    skills: profile.skills.filter((skill, index) =>
      selectedItems.skills.includes(getItemId('skills', skill, index))
    ),
    projects: profile.projects.filter((project, index) =>
      selectedItems.projects.includes(getItemId('projects', project, index))
    ),
  };

  return {
    selectedItems,
    setSelectedItems: setSelectedItemsState,
    isTargetRoleInvalid,
    setIsTargetRoleInvalid,
    currentStep,
    setCurrentStep,
    isDragging,
    setIsDragging,
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
    selectedContent,
  };
}
