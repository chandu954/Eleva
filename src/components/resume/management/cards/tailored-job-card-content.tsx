'use client';

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Plus, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { Job } from "@/lib/types";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { CreateJobDialog } from "./create-job-dialog";
import { JobDetailsGrid } from "./job-details-grid";

interface TailoredJobCardProps {
  jobId: string | null;
  job?: Job | null;
  isLoading?: boolean;
}

export function TailoredJobCard({
  jobId,
  job: externalJob,
  isLoading: externalIsLoading
}: TailoredJobCardProps) {
  // Only use internal state if external job is not provided
  const [internalJob, setInternalJob] = useState<Job | null>(null);
  const [internalIsLoading, setInternalIsLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const effectiveJob = externalJob ?? internalJob;
  const effectiveIsLoading = externalIsLoading ?? internalIsLoading;

  // Only fetch if external job is not provided
  useEffect(() => {
    if (externalJob !== undefined) return;

    async function fetchJob() {
      if (!jobId) {
        setInternalJob(null);
        setInternalIsLoading(false);
        return;
      }

      try {
        setInternalIsLoading(true);
        const supabase = createClient();
        const { data: jobData, error } = await supabase
          .from('jobs')
          .select('*')
          .eq('id', jobId)
          .single();

        if (error) {
          if (error.code !== 'PGRST116') {
            throw error;
          }
          setInternalJob(null);
          return;
        }

        setInternalJob(jobData);
      } catch (error) {
        console.error('Error fetching job:', error);
        if (error instanceof Error && error.message !== 'No rows returned') {
          setInternalJob(null);
        }
      } finally {
        setInternalIsLoading(false);
      }
    }

    fetchJob();
  }, [jobId, externalJob]);

  if (!jobId) {
    return (
      <Card className="relative group">
        <div className="relative p-8 flex flex-col items-center justify-center space-y-6 text-center">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-pink-500/5 to-rose-500/5 border border-pink-200/20 group-hover:scale-110 transition-transform duration-500">
            <Plus className="w-8 h-8 text-pink-500" />
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-semibold bg-gradient-to-r from-pink-600 to-rose-600 bg-clip-text text-transparent">
              No Job Currently Linked
            </h3>
            <p className="text-sm text-gray-500/90 max-w-sm">
              Create a new job listing to track the position you&apos;re applying for and tailor your resume accordingly.
            </p>
          </div>

          <CreateJobDialog
            open={createDialogOpen}
            onOpenChange={setCreateDialogOpen}
          />
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn(
      "relative group border-none px-8",
    )}>

      <div className="relative">
        <AnimatePresence mode="wait">
          {effectiveIsLoading ? (
            <LoadingSkeleton />
          ) : effectiveJob ? (
            <motion.div
              key="content"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="p-4 space-y-6"
            >
              <JobDetailsGrid job={effectiveJob} />

              {/* Description */}
              {effectiveJob.description && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-700">Description</h4>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">
                    {effectiveJob.description}
                  </p>
                </div>
              )}

              {/* Keywords */}
              <div className="flex flex-wrap gap-2 ">
                {effectiveJob.keywords?.map((keyword, index) => (
                  <motion.div
                    key={keyword}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Badge
                      variant="secondary"
                      className={cn(
                        "text-xs py-0.5",
                        "bg-gradient-to-r from-pink-50/50 to-rose-50/50",
                        "hover:from-pink-100/50 hover:to-rose-100/50",
                        "text-pink-700",
                        "border border-pink-100/20",
                        "transition-all duration-300",
                        "cursor-default"
                      )}
                    >
                      {keyword}
                    </Badge>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ) : (
            <ErrorState />
          )}
        </AnimatePresence>
      </div>
    </Card>
  );
}

// Loading skeleton with proper ARIA and animations
const LoadingSkeleton = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="space-y-6"
    role="status"
    aria-label="Loading job details"
  >
    <div className="flex items-start justify-between mb-3">
      <div className="space-y-3 w-3/4">
        <div className="h-6 bg-gradient-to-r from-pink-200/50 via-rose-200/50 to-pink-200/50 rounded-xl animate-pulse" />
        <div className="h-4 bg-gradient-to-r from-pink-100/50 via-rose-100/50 to-pink-100/50 rounded-lg w-2/3 animate-pulse" />
      </div>
      <div className="h-8 w-8 bg-gradient-to-r from-pink-200/50 via-rose-200/50 to-pink-200/50 rounded-xl animate-pulse" />
    </div>
    <div className="grid grid-cols-2 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="h-4 w-4 rounded-full bg-gradient-to-r from-pink-200/50 via-rose-200/50 to-pink-200/50 animate-pulse" />
          <div className="h-4 flex-1 bg-gradient-to-r from-pink-100/50 via-rose-100/50 to-pink-100/50 rounded-lg animate-pulse" />
        </div>
      ))}
    </div>
    <div className="flex gap-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-6 w-20 bg-gradient-to-r from-pink-100/50 via-rose-100/50 to-pink-100/50 rounded-full animate-pulse" />
      ))}
    </div>
  </motion.div>
);

// Enhanced error state with proper ARIA and animations
const ErrorState = () => {
  const router = useRouter();
  return (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex flex-col items-center justify-center p-8 space-y-4"
    role="alert"
    aria-live="polite"
  >
    <div className="p-3 rounded-xl bg-red-50/80 backdrop-blur-sm border border-red-100">
      <AlertCircle className="w-6 h-6 text-red-500" />
    </div>
    <div className="text-center space-y-2">
      <h3 className="font-semibold text-red-900">Unable to Load Job</h3>
      <p className="text-sm text-red-600/90">
        This job listing is no longer available or there was an error loading it.
      </p>
      <Button
        variant="outline"
        onClick={() => router.refresh()}
        className="mt-4 bg-white/80 border-red-200 hover:bg-red-50/80 hover:border-red-300 text-red-700"
      >
        <motion.div
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 0.5 }}
        >
          Try Again
        </motion.div>
      </Button>
    </div>
  </motion.div>
  );
};
