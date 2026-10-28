"use client";

import { motion } from "framer-motion";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from '@/lib/utils';
import { RefreshCw, TrendingUp, Target, Award } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { generateResumeScore } from "@/utils/actions/resumes/actions";
import { Resume, Job as JobType } from '@/lib/types';
import type { ResumeScoreMetrics } from './resume-score-types';
import { createScoreSignature, getJobForScoring, getResumeForScoring, getStoredScores, updateStoredScores } from './resume-score-utils';
import { JobAlignmentItem, ScoreItem } from './resume-score-items';
import { useApiKeys, useDefaultModel } from "@/hooks/use-api-keys";
import { toast } from "@/hooks/use-toast";

// Add props interface
interface ResumeScorePanelProps {
  resume: Resume;
  job?: JobType | null;
}

export default function ResumeScorePanel({ resume, job }: ResumeScorePanelProps) {
  const { apiKeys } = useApiKeys();
  const { defaultModel } = useDefaultModel();
  const selectedModel = useMemo(() => defaultModel, [defaultModel]);
  const scoreSignature = useMemo(
    () => createScoreSignature(resume, job, selectedModel),
    [resume, job, selectedModel]
  );
  const [isCalculating, setIsCalculating] = useState(false);
  const [scoreData, setScoreData] = useState<ResumeScoreMetrics | null>(() => {
    return getStoredScores(resume.id, scoreSignature);
  });

  useEffect(() => {
    const storedScore = getStoredScores(resume.id, scoreSignature);
    setScoreData(storedScore);
  }, [resume.id, scoreSignature]);

  const handleRecalculate = async () => {
    if (!selectedModel) {
      toast({
        title: "Model required",
        description: "Select an AI model before generating a resume score.",
        variant: "destructive",
      });
      return;
    }

    setIsCalculating(true);
    try {
      // Call the generateResumeScore action with current resume
      const newScore = await generateResumeScore(getResumeForScoring(resume), getJobForScoring(job), {
        model: selectedModel,
        apiKeys,
      });

      // Update state and storage
      const scoreMetrics = newScore as ResumeScoreMetrics;
      setScoreData(scoreMetrics);
      updateStoredScores(resume.id, {
        score: scoreMetrics,
        signature: scoreSignature,
        generatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error generating score:", error);
      const description = error instanceof Error
        ? `${error.message} Check your model selection and API keys in Settings, then try again.`
        : "Failed to generate resume score. Check your model selection and API keys in Settings, then try again.";

      toast({
        title: "Resume score failed",
        description,
        variant: "destructive",
      });
    } finally {
      setIsCalculating(false);
    }
  };

  // If no score data is available, show the empty state
  if (!scoreData) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
            <div className="p-3 bg-muted rounded-full">
              <TrendingUp className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold mb-2">Resume Score Analysis</h3>
                             <p className="text-sm text-muted-foreground mb-4">
                 Generate a comprehensive analysis of your resume&apos;s effectiveness
               </p>
              <Button
                onClick={handleRecalculate}
                disabled={isCalculating}
                className="w-full sm:w-auto"
              >
                <RefreshCw 
                  className={cn(
                    "mr-2 h-4 w-4",
                    isCalculating && "animate-spin"
                  )} 
                />
                {isCalculating ? "Analyzing..." : "Generate Score"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const keyImprovements = scoreData.overallImprovements ?? [];

  // When we have score data, show the full analysis
  return (
    <div className="space-y-4">
      {/* Header with recalculate button */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Resume Score Analysis</h3>
        <Button
          onClick={handleRecalculate}
          disabled={isCalculating}
          variant="outline"
          size="sm"
        >
          <RefreshCw 
            className={cn(
              "mr-2 h-3 w-3",
              isCalculating && "animate-spin"
            )} 
          />
          Recalculate
        </Button>
      </div>

      {/* Overall Score Card */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 flex-shrink-0">
              <CircularProgressbar
                value={scoreData.overallScore.score}
                text={`${scoreData.overallScore.score}%`}
                styles={buildStyles({
                  pathColor: scoreData.overallScore.score >= 70 ? '#10b981' : scoreData.overallScore.score >= 50 ? '#f59e0b' : '#ef4444',
                  textColor: '#374151',
                  trailColor: '#e5e7eb',
                  pathTransitionDuration: 1,
                  textSize: '24px'
                })}
              />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium mb-1">Overall Score</h4>
              <p className="text-sm text-muted-foreground">{scoreData.overallScore.reason}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Improvements */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4" />
            Key Improvements
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2">
            {keyImprovements.slice(0, 5).map((improvement, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-start gap-2 text-sm"
              >
                <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                <p className="text-muted-foreground">{improvement}</p>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Job-Specific Improvements for Tailored Resumes */}
      {scoreData.isTailoredResume && scoreData.jobSpecificImprovements && scoreData.jobSpecificImprovements.length > 0 && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-blue-700">
              <Award className="h-4 w-4" />
              Job-Specific Improvements
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {scoreData.jobSpecificImprovements.slice(0, 5).map((improvement, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-start gap-2 text-sm"
                >
                  <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                  <p className="text-blue-700">{improvement}</p>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Job Alignment Section for Tailored Resumes */}
      {scoreData.isTailoredResume && scoreData.jobAlignment && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-blue-700">
              <Target className="h-4 w-4" />
              Job Alignment Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-4">
              {Object.entries(scoreData.jobAlignment).map(([label, data]) => (
                <JobAlignmentItem key={label} label={label} data={data} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Metrics */}
      {Object.entries({
        Completeness: { icon: Award, metrics: scoreData.completeness },
        "Impact Score": { icon: TrendingUp, metrics: scoreData.impactScore },
        "Role Match": { icon: Target, metrics: scoreData.roleMatch }
      }).map(([title, { icon: Icon, metrics }]) => (
        <Card key={title}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Icon className="h-4 w-4" />
              {title}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-4">
              {Object.entries(metrics).map(([label, data]) => (
                <ScoreItem key={label} label={label} {...data} />
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
