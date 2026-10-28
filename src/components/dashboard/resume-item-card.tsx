'use client';

import Link from 'next/link';
import { Trash2, Copy, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { MiniResumePreview } from '@/components/resume/shared/mini-resume-preview';
import type { OptimisticResume } from './resumes-section-types';

interface ResumeItemCardProps {
  resume: OptimisticResume;
  type: 'base' | 'tailored';
  isDeleting: boolean;
  isCopying: boolean;
  canCreateMore?: boolean;
  onCopy: (resume: OptimisticResume) => void;
  onDelete: (id: string, name: string) => void;
}

export function ResumeItemCard({ resume, type, isDeleting, isCopying, canCreateMore, onCopy, onDelete }: ResumeItemCardProps) {
  return (
      <div className={cn(
        "group relative transition-all duration-300",
        isDeleting && "opacity-50 pointer-events-none",
        resume.isOptimistic && "animate-in slide-in-from-top-1 duration-300"
      )}>
        <AlertDialog>
          <div className="relative">
            {/* Resume Preview - Conditional Link */}
            {resume.isOptimistic ? (
              // Not clickable during processing
              <div className={cn(
                "cursor-wait",
                "relative"
              )}>
                <MiniResumePreview
                  name={resume.name}
                  type={type}
                  target_role={resume.target_role}
                  createdAt={resume.created_at}
                  className={cn(
                    "transition-all duration-300 opacity-60",
                    "pointer-events-none"
                  )}
                />
                {/* Loading Overlay */}
                <div className="absolute inset-0 bg-white/90 backdrop-blur-sm rounded-lg flex items-center justify-center z-10">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                    <span className="text-xs font-medium text-blue-600">Copying...</span>
                  </div>
                </div>
              </div>
            ) : (
              // Normal clickable resume
              <Link href={`/resumes/${resume.id}`}>
                <MiniResumePreview
                  name={resume.name}
                  type={type}
                  target_role={resume.target_role}
                  createdAt={resume.created_at}
                  className="hover:-translate-y-1 transition-transform duration-300"
                />
              </Link>
            )}

            {/* Action Buttons */}
            {!resume.isOptimistic && (
              <div className="absolute bottom-2 left-2 flex gap-2">
                <AlertDialogTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    disabled={isDeleting}
                    className={cn(
                      "h-8 w-8 rounded-lg",
                      "bg-rose-50/80 hover:bg-rose-100/80",
                      "text-rose-600 hover:text-rose-700",
                      "border border-rose-200/60",
                      "shadow-sm",
                      "transition-all duration-300",
                      "hover:scale-105 hover:shadow-md",
                      "hover:-translate-y-0.5",
                      isDeleting && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>

                {/* Copy Button - Check if can create more */}
                {canCreateMore ? (
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => onCopy(resume)}
                    disabled={isDeleting || isCopying}
                    className={cn(
                      "h-8 w-8 rounded-lg",
                      "bg-teal-50/80 hover:bg-teal-100/80",
                      "text-teal-600 hover:text-teal-700",
                      "border border-teal-200/60",
                      "shadow-sm",
                      "transition-all duration-300",
                      "hover:scale-105 hover:shadow-md",
                      "hover:-translate-y-0.5",
                      (isDeleting || isCopying) && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {isCopying ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                ) : (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className={cn(
                          "h-8 w-8 rounded-lg",
                          "bg-amber-50/80 hover:bg-amber-100/80",
                          "text-amber-600 hover:text-amber-700",
                          "border border-amber-200/60",
                          "shadow-sm",
                          "transition-all duration-300",
                          "hover:scale-105 hover:shadow-md",
                          "hover:-translate-y-0.5"
                        )}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Upgrade Required</AlertDialogTitle>
                        <AlertDialogDescription>
                          You&apos;ve reached the maximum number of {type} resumes allowed on the free plan.
                          Upgrade to Pro to create unlimited resumes and unlock additional features.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction asChild>
                          <Link href="/subscription" className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white hover:from-teal-700 hover:to-cyan-700">
                            Upgrade to Pro
                          </Link>
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            )}
          </div>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Resume</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete &quot;{resume.name}&quot;? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => onDelete(resume.id, resume.name)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );

}
