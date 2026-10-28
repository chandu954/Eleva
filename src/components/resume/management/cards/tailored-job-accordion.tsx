'use client';

import { useState } from 'react';
import { BriefcaseIcon, Loader2, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Job, Resume } from '@/lib/types';
import { deleteJob } from '@/utils/actions/jobs/actions';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { TailoredJobCard } from './tailored-job-card-content';

interface TailoredJobAccordionProps {
  resume: Resume;
  job: Job | null;
  isLoading?: boolean;
}

export function TailoredJobAccordion({
  resume,
  job,
  isLoading
}: TailoredJobAccordionProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  if (resume.is_base_resume) return null;

  const title = job?.position_title || "Target Job";
  const company = job?.company_name;

  const handleDelete = async () => {
    if (!resume.job_id) return;

    try {
      setIsDeleting(true);
      await deleteJob(resume.job_id);
      router.refresh();
    } catch (error) {
      console.error('Error deleting job:', error);
      toast({
        title: "Error",
        description: "Failed to delete job",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AccordionItem value="job" className="mb-4 backdrop-blur-xl rounded-lg shadow-lg bg-white border-pink-600/50 border-2">
      <div className="px-4">
        <AccordionTrigger className="hover:no-underline group">
          <div className="flex items-center gap-2">
            <div className={cn("p-1 rounded-md transition-transform duration-300 group-data-[state=open]:scale-105", "bg-pink-100/80")}>
              <BriefcaseIcon className={cn("h-3.5 w-3.5", "text-pink-600")} />
            </div>
            <div className="flex flex-col items-start">
              <span className={cn("text-sm font-medium", "text-pink-900")}>{title}</span>
              {company && (
                <span className="text-xs text-pink-600/80">{company}</span>
              )}
            </div>
          </div>
        </AccordionTrigger>
      </div>
      <AccordionContent className=" ">
        <div className="">
          <TailoredJobCard
            jobId={resume.job_id || null}
            job={job}
            isLoading={isLoading}
          />
          {job && (
            <div className="flex justify-end">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDelete}
                disabled={isDeleting}
                className={cn(
                  "text-gray-400",
                  "hover:text-red-500",
                  "hover:bg-red-50/50",
                  "transition-all duration-300",
                  "rounded-lg",
                  "gap-2"
                )}
              >
                {isDeleting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                Delete Job
              </Button>
            </div>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
