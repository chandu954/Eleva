'use client';

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, X, Sparkles } from "lucide-react";
import { WorkExperience, Project, Skill, Education } from "@/lib/types";
import { useState } from 'react';
import { REWRITE_MODE_OPTIONS, type RewriteMode } from "@/app/eleva/api/tool/rewrite/rewrite-utils";
import {
  type SuggestionContent,
  type SuggestionType,
  buildModePreviewContent,
  getPreviewSnippets,
} from "./suggestion-utils";
import {
  EducationSuggestion,
  ProjectSuggestion,
  SkillSuggestion,
  SnippetLine,
  WorkExperienceSuggestion,
} from "./suggestion-cards";

interface SuggestionProps {
  type: SuggestionType;
  content: SuggestionContent;
  currentContent: SuggestionContent | null;
  onAccept: () => void;
  onReject: () => void;
  onModeRewrite?: (mode: RewriteMode) => void;
  meta?: {
    confidence?: number;
    reason?: string;
    fabricationRisk?: 'none' | 'low' | 'medium' | 'high';
    attempts?: Array<{ attempt: number; model: string; status: string; latencyMs: number; empty?: boolean; finishReason?: string; error?: string }>;
  };
}

interface WholeResumeSuggestionProps {
  onReject: () => void;
}

export function Suggestion({ type, content, currentContent, onAccept, onReject, onModeRewrite, meta }: SuggestionProps) {
  const [status, setStatus] = useState<'pending' | 'accepted' | 'rejected'>('pending');
  const [activeMode, setActiveMode] = useState<RewriteMode | null>(null);

  const handleAccept = () => {
    setStatus('accepted');
    onAccept();
  };

  const handleReject = () => {
    setStatus('rejected');
    onReject();
  };

  // Helper function to get status-based styles
  const getStatusStyles = () => {
    switch (status) {
      case 'accepted':
        return {
          card: "bg-gradient-to-br from-emerald-200/95 via-emerald-200/90 to-green-200/95 border-emerald-200/60",
          icon: "from-emerald-100/90 to-green-100/90",
          iconColor: "text-emerald-600",
          label: "text-emerald-600",
          text: "Accepted"
        };
      case 'rejected':
        return {
          card: "bg-gradient-to-br from-rose-200/95 via-rose-200/90 to-red-200/95 border-rose-200/60",
          icon: "from-rose-100/90 to-red-100/90",
          iconColor: "text-rose-600",
          label: "text-rose-600",
          text: "Rejected"
        };
      default:
        return {
          card: "bg-gradient-to-br from-white/95 via-purple-50/30 to-indigo-50/40 border-white/60",
          icon: "from-purple-100/90 to-indigo-100/90",
          iconColor: "text-purple-600",
          label: "text-gray-900",
          text: "AI Suggestion"
        };
    }
  };

  const statusStyles = getStatusStyles();
  const confidence = meta?.confidence ?? 0;
  const reason = meta?.reason ?? 'AI generated a grounded rewrite';
  const fabricationRisk = meta?.fabricationRisk ?? 'none';
  const previewContent = activeMode ? buildModePreviewContent(content, activeMode, type) : content;
  const beforeSnippets = getPreviewSnippets(content, type);
  const previewSnippets = getPreviewSnippets(previewContent, type);

  // Helper function to render content based on type
  const renderContent = () => {
    const visibleContent = previewContent;

    switch (type) {
      case 'work_experience':
        return <WorkExperienceSuggestion content={visibleContent as WorkExperience} currentContent={currentContent as WorkExperience | null} />;
      case 'project':
        return <ProjectSuggestion content={visibleContent as Project} currentContent={currentContent as Project | null} />;
      case 'skill':
        return <SkillSuggestion content={visibleContent as Skill} currentContent={currentContent as Skill | null} />;
      case 'education':
        return <EducationSuggestion content={visibleContent as Education} currentContent={currentContent as Education | null} />;
    }
  };

  return (
    <Card className={cn(
      "group relative overflow-hidden",
      "border ",
      statusStyles.card,
      "shadow-xl shadow-purple-500/10",
      "transition-all duration-500 ease-in-out",
      "hover:shadow-2xl hover:shadow-purple-500/20",
      "backdrop-blur-xl"
    )}>
      {/* Enhanced Background Pattern */}
      <div className="absolute inset-0  opacity-[0.15]" />
      
      {/* Improved Floating Gradient Orbs */}

      {/* Content */}
      <div className="relative ">
        {/* Header */}
        <div className="flex items-center">
          <div className="flex items-center gap-2">
            <div className={cn("p-1.5 rounded-lg  shadow-sm", statusStyles.icon)}>
              <Sparkles className={cn("h-3.5 w-3.5", statusStyles.iconColor)} />
            </div>
            <span className={cn("font-semibold text-sm", statusStyles.label)}>{statusStyles.text}</span>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white from-white/80 to-white/60 rounded-lg p-3 backdrop-blur-md border border-white/60 shadow-sm">
          {activeMode && (
            <div className="mb-3 rounded-lg border border-purple-200/70 bg-purple-50/70 px-3 py-2">
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="text-[10px] font-mono uppercase tracking-widest text-purple-700">Inline Preview</div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-purple-500">{REWRITE_MODE_OPTIONS.find((option) => option.value === activeMode)?.label ?? activeMode}</div>
              </div>
              <div className="text-[12px] text-purple-900 leading-relaxed">
                Showing a quick local preview while Eleva rewrites the suggestion in the background.
              </div>
            </div>
          )}

          {activeMode && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
              <SnippetLine label="Before" lines={beforeSnippets} variant="before" />
              <SnippetLine label="Preview" lines={previewSnippets} variant="preview" />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3 text-[11px]">
            <div className="rounded-lg px-3 py-2 bg-slate-50 border border-slate-200/80">
              <div className="font-mono uppercase tracking-widest" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Confidence</div>
              <div className="text-sm font-semibold" style={{ color: 'rgb(var(--eleva-primary))' }}>{confidence ? `${confidence}%` : '—'}</div>
            </div>
            <div className="rounded-lg px-3 py-2 bg-slate-50 border border-slate-200/80">
              <div className="font-mono uppercase tracking-widest" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Reason</div>
              <div className="text-xs leading-relaxed" style={{ color: 'rgb(var(--eleva-fg))' }}>{reason}</div>
            </div>
            <div className="rounded-lg px-3 py-2 bg-slate-50 border border-slate-200/80">
              <div className="font-mono uppercase tracking-widest" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Fabrication Risk</div>
              <div className="text-sm font-semibold capitalize" style={{ color: 'rgb(var(--eleva-fg))' }}>{fabricationRisk}</div>
            </div>
          </div>

          {meta?.attempts && meta.attempts.length > 0 && (
            <div className="rounded-lg p-3 mb-3 bg-slate-50 border border-slate-200 text-[11px] space-y-1">
              <div className="font-mono uppercase tracking-widest" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Attempts</div>
              {meta.attempts.map((attempt) => (
                <div key={`${attempt.attempt}-${attempt.model}`} className="flex items-center justify-between gap-2">
                  <span style={{ color: 'rgb(var(--eleva-fg))' }}>Attempt {attempt.attempt} · {attempt.model}</span>
                  <span style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{attempt.status}{attempt.latencyMs ? ` · ${attempt.latencyMs}ms` : ''}</span>
                </div>
              ))}
            </div>
          )}

          {renderContent()}

          <div className="flex flex-wrap gap-1.5 mt-3">
            {REWRITE_MODE_OPTIONS.map((mode) => (
              <button
                key={mode.value}
                type="button"
                onClick={() => {
                  setActiveMode(mode.value);
                  onModeRewrite?.(mode.value);
                }}
                className="text-[10px] px-2 py-1 rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors"
                title={mode.description}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        {status === 'pending' && (
          <div className="flex justify-end gap-2 pt-0.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReject}
              className={cn(
                "relative group/button overflow-hidden",
                "h-8 px-4 text-xs",
                "bg-gradient-to-br from-rose-50 to-rose-100/90",
                "text-rose-700",
                "border border-rose-200/60",
                "shadow-sm",
                "transition-all duration-500",
                "hover:shadow-md hover:shadow-rose-500/10",
                "hover:border-rose-300/80",
                "hover:-translate-y-0.5",
                "active:translate-y-0"
              )}
            >
              {/* Animated background on hover */}
              <div className="absolute inset-0 -z-10 bg-gradient-to-br from-rose-100 to-rose-200/90 
                opacity-0 group-hover/button:opacity-100 transition-opacity duration-500" />
              
              <div className="relative flex items-center justify-center gap-1.5">
                <X className="h-3.5 w-3.5 transition-transform duration-500 group-hover/button:rotate-90" />
                <span className="font-medium">Reject</span>
              </div>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleAccept}
              className={cn(
                "relative group/button overflow-hidden",
                "h-8 px-4 text-xs",
                "bg-gradient-to-br from-emerald-50 to-emerald-100/90",
                "text-emerald-700",
                "border border-emerald-200/60",
                "shadow-sm",
                "transition-all duration-500",
                "hover:shadow-md hover:shadow-emerald-500/10",
                "hover:border-emerald-300/80",
                "hover:-translate-y-0.5",
                "active:translate-y-0"
              )}
            >
              {/* Animated background on hover */}
              <div className="absolute inset-0 -z-10 bg-gradient-to-br from-emerald-100 to-emerald-200/90 
                opacity-0 group-hover/button:opacity-100 transition-opacity duration-500" />
              
              <div className="relative flex items-center justify-center gap-1.5">
                <Check className="h-3.5 w-3.5 transition-transform duration-500 group-hover/button:scale-110" />
                <span className="font-medium">Accept</span>
              </div>
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}

export function WholeResumeSuggestion({ onReject }: WholeResumeSuggestionProps) {
  const [status, setStatus] = useState<'pending' | 'accepted' | 'rejected'>('pending');

  const handleAccept = () => {
    setStatus('accepted');
    // No need to do anything as changes are already applied
  };

  const handleReject = () => {
    setStatus('rejected');
    onReject();
  };

  const statusStyles = {
    pending: {
      card: "bg-gradient-to-br from-white/95 via-purple-50/30 to-indigo-50/40 border-white/60",
      icon: "from-purple-100/90 to-indigo-100/90",
      iconColor: "text-purple-600",
      label: "text-gray-900",
      text: "Modified Resume"
    },
    accepted: {
      card: "bg-gradient-to-br from-emerald-200/95 via-emerald-200/90 to-green-200/95 border-emerald-200/60",
      icon: "from-emerald-100/90 to-green-100/90",
      iconColor: "text-emerald-600",
      label: "text-emerald-600",
      text: "Changes Accepted"
    },
    rejected: {
      card: "bg-gradient-to-br from-rose-200/95 via-rose-200/90 to-red-200/95 border-rose-200/60",
      icon: "from-rose-100/90 to-red-100/90",
      iconColor: "text-rose-600",
      label: "text-rose-600",
      text: "Changes Rejected"
    }
  }[status];

  return (
    <Card className={cn(
      "group relative overflow-hidden p-4",
      "border",
      statusStyles.card,
      "shadow-xl shadow-purple-500/10",
      "transition-all duration-500 ease-in-out",
      "hover:shadow-2xl hover:shadow-purple-500/20",
      "backdrop-blur-xl"
    )}>
      <div className="flex items-center gap-2 mb-2">
        <div className={cn("p-1.5 rounded-lg shadow-sm", statusStyles.icon)}>
          <Sparkles className={cn("h-3.5 w-3.5", statusStyles.iconColor)} />
        </div>
        <span className={cn("font-semibold text-sm", statusStyles.label)}>
          {statusStyles.text}
        </span>
      </div>

      {status === 'pending' && (
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReject}
            className={cn(
              "relative group/button overflow-hidden",
              "h-8 px-4 text-xs",
              "bg-gradient-to-br from-rose-50 to-rose-100/90",
              "text-rose-700",
              "border border-rose-200/60",
              "shadow-sm",
              "transition-all duration-500",
              "hover:shadow-md hover:shadow-rose-500/10",
              "hover:border-rose-300/80",
              "hover:-translate-y-0.5",
              "active:translate-y-0"
            )}
          >
            <div className="absolute inset-0 -z-10 bg-gradient-to-br from-rose-100 to-rose-200/90 
              opacity-0 group-hover/button:opacity-100 transition-opacity duration-500" />
            
            <div className="relative flex items-center justify-center gap-1.5">
              <X className="h-3.5 w-3.5 transition-transform duration-500 group-hover/button:rotate-90" />
              <span className="font-medium">Undo Changes</span>
            </div>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleAccept}
            className={cn(
              "relative group/button overflow-hidden",
              "h-8 px-4 text-xs",
              "bg-gradient-to-br from-emerald-50 to-emerald-100/90",
              "text-emerald-700",
              "border border-emerald-200/60",
              "shadow-sm",
              "transition-all duration-500",
              "hover:shadow-md hover:shadow-emerald-500/10",
              "hover:border-emerald-300/80",
              "hover:-translate-y-0.5",
              "active:translate-y-0"
            )}
          >
            <div className="absolute inset-0 -z-10 bg-gradient-to-br from-emerald-100 to-emerald-200/90 
              opacity-0 group-hover/button:opacity-100 transition-opacity duration-500" />
            
            <div className="relative flex items-center justify-center gap-1.5">
              <Check className="h-3.5 w-3.5 transition-transform duration-500 group-hover/button:scale-110" />
              <span className="font-medium">Keep Changes</span>
            </div>
          </Button>
        </div>
      )}
    </Card>
  );
}
