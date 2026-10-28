'use client';

import { CreateBaseResumeForm } from './create-base-resume-form';
import type { Profile } from '@/lib/types';

interface CreateBaseResumeDialogProps {
  children: React.ReactNode;
  profile: Profile;
}

export function CreateBaseResumeDialog({ children, profile }: CreateBaseResumeDialogProps) {
  return (
    <CreateBaseResumeForm profile={profile}>
      {children}
    </CreateBaseResumeForm>
  );
}
