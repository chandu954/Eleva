'use client';

import { useState } from "react";
import { Plus, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { Loader2, Sparkles } from "lucide-react";
import { createJob } from "@/utils/actions/jobs/actions";
import { updateResume } from "@/utils/actions/resumes/actions";
import { useResumeContext } from "../../editor/resume-editor-context";
import { formatJobListing } from "@/utils/actions/jobs/ai";
import { readStoredAIConfig } from "@/lib/ai/client-config";
import { useRouter } from "next/navigation";

interface CreateJobDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateJobDialog({ open, onOpenChange }: CreateJobDialogProps) {
  const { dispatch, state } = useResumeContext();
  const router = useRouter();
  const [jobDescription, setJobDescription] = useState('');
  const [validationErrors, setValidationErrors] = useState<{
    jobDescription?: string;
  }>({});
  const [isFormatting, setIsFormatting] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const validateJobDescription = (value: string) => {
    const errors: { jobDescription?: string } = {};
    if (!value.trim()) {
      errors.jobDescription = "Job description is required";
    } else if (value.trim().length < 50) {
      errors.jobDescription = "Job description should be at least 50 characters";
    }
    return errors;
  };

  const handleJobDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setJobDescription(value);
    setValidationErrors(validateJobDescription(value));
  };

  const handleCreateJobWithAI = async () => {
    const errors = validateJobDescription(jobDescription);
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      toast({
        title: "Validation Error",
        description: errors.jobDescription,
        variant: "destructive",
      });
      return;
    }

    try {
      setIsFormatting(true);

      const { model, apiKeys } = readStoredAIConfig();

      const formattedJob = await formatJobListing(jobDescription, {
        model,
        apiKeys,
      });

      setIsFormatting(false);
      setIsCreating(true);

      const newJob = await createJob(formattedJob);

      dispatch({ type: 'UPDATE_FIELD', field: 'job_id', value: newJob.id });

      await updateResume(state.resume.id, {
        ...state.resume,
        job_id: newJob.id
      });

      router.refresh();
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating job:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create job",
        variant: "destructive",
      });
    } finally {
      setIsFormatting(false);
      setIsCreating(false);
      setJobDescription('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button
          className={cn(
            "relative overflow-hidden",
            "bg-gradient-to-r from-pink-500 to-rose-500",
            "text-white font-medium",
            "border border-pink-400/20",
            "shadow-lg shadow-pink-500/10",
            "hover:shadow-xl hover:shadow-pink-500/20",
            "hover:scale-105",
            "transition-all duration-500"
          )}
          aria-label="Create new job listing"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Job Listing
        </Button>
      </DialogTrigger>

      <DialogContent
        className={cn(
          "sm:max-w-[600px]",
          "bg-gradient-to-b from-white/95 to-white/90",
          "backdrop-blur-xl",
          "border-pink-200/40",
          "shadow-xl shadow-pink-500/10"
        )}
      >
        <DialogTitle className="text-xl font-semibold bg-gradient-to-r from-pink-600 to-rose-600 bg-clip-text text-transparent">
          Create New Job Listing
        </DialogTitle>
        <DialogDescription className="text-muted-foreground">
          Paste the job description below and let our AI format it automatically.
        </DialogDescription>

        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Textarea
              placeholder="Paste the job description here..."
              value={jobDescription}
              onChange={handleJobDescriptionChange}
              className={cn(
                "min-h-[200px]",
                "bg-white/80 backdrop-blur-sm",
                "border transition-all duration-300",
                "placeholder:text-gray-400",
                validationErrors.jobDescription
                  ? "border-red-300 focus:border-red-500 focus:ring-red-500/20"
                  : "border-gray-200 focus:border-pink-500 focus:ring-pink-500/20"
              )}
              aria-invalid={!!validationErrors.jobDescription}
              aria-describedby="job-description-error"
            />
            {validationErrors.jobDescription && (
              <Alert variant="destructive" className="mt-2" role="alert">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription id="job-description-error">
                  {validationErrors.jobDescription}
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className={cn(
                "border-gray-200",
                "hover:bg-gray-50",
                "transition-colors duration-300"
              )}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateJobWithAI}
              disabled={isFormatting || isCreating || !!validationErrors.jobDescription}
              className={cn(
                "relative overflow-hidden",
                "bg-gradient-to-r from-pink-500 to-rose-500",
                "hover:from-pink-600 hover:to-rose-600",
                "text-white font-medium",
                "shadow-lg hover:shadow-xl",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "disabled:hover:from-pink-500 disabled:hover:to-rose-500",
                "transition-all duration-300"
              )}
              aria-busy={isFormatting || isCreating}
            >
              {isFormatting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Formatting...
                </>
              ) : isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Create with AI
                </>
              )}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
