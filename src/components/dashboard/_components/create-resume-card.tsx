'use client';

import { FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CreateResumeDialog } from '@/components/resume/management/dialogs/create-resume-dialog';
import type { Profile } from '@/lib/types';

interface CreateResumeCardProps {
  type: 'base' | 'tailored';
  profile: Profile;
  baseResumes?: import('@/lib/types').ResumeSummary[];
}

export function CreateResumeCard({ type, profile, baseResumes }: CreateResumeCardProps) {
  return (
    <CreateResumeDialog
      type={type}
      profile={profile}
      {...(type === 'tailored' && { baseResumes })}
    >
      <button className={cn(
        "aspect-[8.5/11] rounded-lg",
        "relative overflow-hidden",
        "border-2 border-dashed transition-all duration-500",
        "group/new-resume flex flex-col items-center justify-center gap-4",
        type === 'base'
          ? "border-purple-300/70 hover:border-purple-400"
          : "border-pink-300/70 hover:border-pink-400",
        type === 'base'
          ? "bg-gradient-to-br from-purple-50/80 via-purple-50/40 to-purple-100/60"
          : "bg-gradient-to-br from-pink-50/80 via-pink-50/40 to-pink-100/60",
        "hover:shadow-lg hover:shadow-purple-100/50 hover:-translate-y-1",
        "after:absolute after:inset-0 after:bg-gradient-to-br",
        type === 'base'
          ? "after:from-purple-600/[0.03] after:to-indigo-600/[0.03]"
          : "after:from-pink-600/[0.03] after:to-rose-600/[0.03]",
        "after:opacity-0 hover:after:opacity-100 after:transition-opacity after:duration-500 w-full sm:w-auto mr-8 sm:mr-0"
      )}>
        <div className={cn(
          "relative z-10 flex flex-col items-center",
          "transform transition-all duration-500",
          "group-hover/new-resume:scale-105"
        )}>
          <div className={cn(
            "h-12 w-12 rounded-xl",
            "flex items-center justify-center",
            "transform transition-all duration-500",
            "shadow-sm group-hover/new-resume:shadow-md",
            type === 'base'
              ? "bg-gradient-to-br from-purple-100 to-purple-50"
              : "bg-gradient-to-br from-pink-100 to-pink-50",
            "group-hover/new-resume:scale-110"
          )}>
            <FileText className={cn(
              "h-5 w-5 transition-all duration-500",
              type === 'base' ? "text-purple-600" : "text-pink-600",
              "group-hover/new-resume:scale-110"
            )} />
          </div>

          <span className={cn(
            "mt-4 text-sm font-medium",
            "transition-all duration-500",
            type === 'base' ? "text-purple-600" : "text-pink-600",
            "group-hover/new-resume:font-semibold"
          )}>
            Create {type === 'base' ? 'Base' : 'Tailored'} Resume
          </span>

          <span className={cn(
            "mt-2 text-xs",
            "transition-all duration-500 opacity-0",
            type === 'base' ? "text-purple-500" : "text-pink-500",
            "group-hover/new-resume:opacity-70"
          )}>
            Click to start
          </span>
        </div>
      </button>
    </CreateResumeDialog>
  );
}
