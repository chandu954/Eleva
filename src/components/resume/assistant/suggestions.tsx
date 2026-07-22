'use client';

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, X, Sparkles } from "lucide-react";
import { WorkExperience, Project, Skill, Education } from "@/lib/types";
import { useState } from 'react';
import Tiptap from "@/components/ui/tiptap";
import { REWRITE_MODE_OPTIONS, type RewriteMode } from "@/app/eleva/api/tool/rewrite/rewrite-utils";

const DIFF_HIGHLIGHT_CLASSES = "bg-green-300 px-1  rounded-sm";

type SuggestionContent = WorkExperience | Project | Skill | Education;

interface SuggestionProps {
  type: 'work_experience' | 'project' | 'skill' | 'education';
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

interface WorkExperienceSuggestionProps {
  content: WorkExperience;
  currentContent: WorkExperience | null;
}

function prettifyActionVerb(text: string, mode: RewriteMode): string {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;

  const replacements: Partial<Record<RewriteMode, Array<[RegExp, string]>>> = {
    professional: [[/^(helped|assisted|supported)\b/i, 'Improved']],
    technical: [[/^(helped|assisted|supported)\b/i, 'Implemented']],
    recruiter: [[/^(helped|assisted|supported)\b/i, 'Delivered']],
    ats: [[/^(helped|assisted|supported)\b/i, 'Implemented']],
    executive: [[/^(helped|assisted|supported)\b/i, 'Led']],
    shorter: [],
    longer: [[/^(helped|assisted|supported)\b/i, 'Expanded']],
    'more-metrics': [[/^(helped|assisted|supported)\b/i, 'Improved']],
    'more-leadership': [[/^(helped|assisted|supported)\b/i, 'Owned']],
  };

  let next = trimmed;
  for (const [pattern, replacement] of replacements[mode] ?? []) {
    next = next.replace(pattern, replacement);
  }

  if (mode === 'shorter') {
    next = next.split(/[.;]/)[0] ?? next;
  }

  if (mode === 'more-leadership' && !/^(led|owned|spearheaded|drove|managed|coordinated)\b/i.test(next)) {
    next = `Owned ${next.charAt(0).toLowerCase()}${next.slice(1)}`;
  }

  return next.trim().replace(/\s+/g, ' ');
}

function buildModePreviewContent(content: SuggestionContent, mode: RewriteMode, type: SuggestionProps['type']): SuggestionContent {
  if (type === 'work_experience' && 'description' in content && Array.isArray(content.description)) {
    const rewrittenDescription = content.description.map((point, index) => {
      const withVerb = prettifyActionVerb(point, mode);
      if (mode === 'executive' && index === 0) {
        return withVerb.replace(/^./, (char) => char.toUpperCase()) + ' while aligning cross-functional priorities.';
      }
      if (mode === 'ats' && index === 0) {
        return `${withVerb} using role-relevant terminology.`;
      }
      if (mode === 'more-metrics' && /\d/.test(point)) {
        return withVerb;
      }
      return withVerb;
    });
    return { ...content, description: rewrittenDescription } as SuggestionContent;
  }

  if (type === 'project' && 'description' in content && Array.isArray(content.description)) {
    const rewrittenDescription = content.description.map((point, index) => {
      const base = prettifyActionVerb(point, mode);
      if (mode === 'technical' && index === 0) return `${base} with a focus on architecture and implementation details.`;
      if (mode === 'recruiter' && index === 0) return `${base} so the business impact is obvious at a glance.`;
      return base;
    });
    return { ...content, description: rewrittenDescription } as SuggestionContent;
  }

  if (type === 'skill' && 'items' in content && Array.isArray(content.items)) {
    const reordered = [...content.items];
    if (mode === 'ats' || mode === 'technical') {
      reordered.sort((a, b) => a.localeCompare(b));
    }
    if (mode === 'shorter') {
      return { ...content, items: reordered.slice(0, Math.max(1, Math.ceil(reordered.length * 0.7))) } as SuggestionContent;
    }
    return {
      ...content,
      items: reordered.map((item) => prettifyActionVerb(item, mode)),
    } as SuggestionContent;
  }

  if (type === 'education' && 'achievements' in content && Array.isArray(content.achievements)) {
    const achievements = content.achievements.map((achievement, index) => {
      const base = prettifyActionVerb(achievement, mode);
      return index === 0 && mode === 'professional' ? `${base} with strong academic performance.` : base;
    });
    return { ...content, achievements } as SuggestionContent;
  }

  if ('description' in content && Array.isArray(content.description)) {
    return { ...content, description: content.description.map((point) => prettifyActionVerb(point, mode)) } as SuggestionContent;
  }

  if ('items' in content && Array.isArray(content.items)) {
    return { ...content, items: content.items.map((item) => prettifyActionVerb(item, mode)) } as SuggestionContent;
  }

  if ('achievements' in content && Array.isArray(content.achievements)) {
    return { ...content, achievements: content.achievements.map((achievement) => prettifyActionVerb(achievement, mode)) } as SuggestionContent;
  }

  return content;
}

function getPreviewSnippets(content: SuggestionContent, type: SuggestionProps['type']): string[] {
  if (type === 'work_experience' && 'description' in content && Array.isArray(content.description)) {
    const exp = content as WorkExperience;
    return [
      `${exp.position}${exp.company ? ` · ${exp.company}` : ''}`,
      ...(exp.description.slice(0, 2) || []),
    ];
  }

  if (type === 'project' && 'description' in content && Array.isArray(content.description)) {
    const proj = content as Project;
    return [
      proj.name,
      ...(proj.description.slice(0, 2) || []),
    ];
  }

  if (type === 'skill' && 'items' in content && Array.isArray(content.items)) {
    return [content.category, content.items.slice(0, 6).join(', ')];
  }

  if (type === 'education' && 'achievements' in content && Array.isArray(content.achievements)) {
    return [
      `${content.degree} in ${content.field}`,
      content.school,
      ...(content.achievements.slice(0, 2) || []),
    ];
  }

  if ('description' in content && Array.isArray(content.description)) {
    return content.description.slice(0, 2);
  }

  if ('items' in content && Array.isArray(content.items)) {
    return [content.category, content.items.slice(0, 6).join(', ')];
  }

  if ('achievements' in content && Array.isArray(content.achievements)) {
    return [content.school, ...(content.achievements.slice(0, 2) || [])];
  }

  return [];
}

function SnippetLine({ label, lines, variant }: { label: string; lines: string[]; variant: 'before' | 'preview' }) {
  return (
    <div className={cn(
      "rounded-lg border px-3 py-2",
      variant === 'before' ? 'bg-slate-50 border-slate-200' : 'bg-purple-50 border-purple-200'
    )}>
      <div className={cn(
        "text-[10px] font-mono uppercase tracking-widest mb-1",
        variant === 'before' ? 'text-slate-500' : 'text-purple-700'
      )}>{label}</div>
      <div className="space-y-1 text-[12px] leading-relaxed">
        {lines.filter(Boolean).slice(0, 3).map((line, index) => (
          <div key={`${label}-${index}`} className={variant === 'preview' && index === 0 ? 'font-medium text-purple-950' : 'text-slate-800'}>
            {line}
          </div>
        ))}
      </div>
    </div>
  );
}

function WorkExperienceSuggestion({ content: work, currentContent: currentWork }: WorkExperienceSuggestionProps) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-start">
        <div>
          <h3 className={cn(
            "text-base font-bold text-gray-900",
            !currentWork || currentWork.position !== work.position && DIFF_HIGHLIGHT_CLASSES
          )}>
            {work.position.replace(/\*\*/g, '')}
          </h3>
          <p className={cn(
            "text-xs text-gray-700",
            !currentWork || currentWork.company !== work.company && DIFF_HIGHLIGHT_CLASSES
          )}>
            {work.company}
          </p>
        </div>
        <span className={cn(
          "text-[10px] text-gray-600",
          !currentWork || currentWork.date !== work.date && DIFF_HIGHLIGHT_CLASSES
        )}>
          {work.date}
        </span>
      </div>
      <div className="space-y-1.5">
        {work.description.map((point, index) => {
          const currentPoint = currentWork?.description?.[index];
          const comparedWords = currentPoint 
            ? compareDescriptions(currentPoint, point)
            : [{ text: point.replace(/\*\*/g, ''), isNew: true, isBold: false, isStart: true, isEnd: true }];

          return (
            <div key={index} className="flex items-start gap-1.5">
              <span className="text-gray-800 mt-0.5 text-xs">•</span>
              <p className="text-sm text-gray-800 flex-1 flex flex-wrap">
                {comparedWords.map((word, wordIndex) => (
                  <span
                    key={wordIndex}
                    className={cn(
                      "inline-flex items-center",
                      word.isStart && "rounded-l-sm pl-1",
                      word.isEnd && "rounded-r-sm pr-1",
                      wordIndex < comparedWords.length - 1 && "mr-1",
                      word.isNew && "bg-green-300 px-1 mx-0",
                    )}
                  >
                    {word.isBold ? (
                      <strong>{word.text}</strong>
                    ) : (
                      word.text
                    )}
                  </span>
                ))}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface ProjectSuggestionProps {
  content: Project;
  currentContent: Project | null;
}

function ProjectSuggestion({ content: project, currentContent: currentProject }: ProjectSuggestionProps) {
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-start">
        <h3 className={cn(
          "text-lg font-bold text-gray-900",
          !currentProject || currentProject.name !== project.name && DIFF_HIGHLIGHT_CLASSES
        )}>
          {project.name}
        </h3>
        {project.date && (
          <span className={cn(
            "text-xs text-gray-600",
            !currentProject || currentProject.date !== project.date && DIFF_HIGHLIGHT_CLASSES
          )}>
            {project.date}
          </span>
        )}
      </div>
      <div className="space-y-2">
        {project.description.map((point, index) => {
          const currentPoint = currentProject?.description?.[index];
          const comparedWords = currentPoint 
            ? compareDescriptions(currentPoint, point)
            : [{ text: point.replace(/\*\*/g, ''), isNew: true, isBold: false, isStart: true, isEnd: true }];

          return (
            <div key={index} className="flex items-start gap-1.5">
              <span className="text-gray-800 mt-0.5 text-xs">•</span>
              <p className="text-xs text-gray-800 flex-1 flex flex-wrap">
                {comparedWords.map((word, wordIndex) => (
                  <span
                    key={wordIndex}
                    className={cn(
                      "inline-flex items-center",
                      word.isNew && "bg-green-300",
                      word.isStart && "rounded-l-sm pl-1",
                      word.isEnd && "rounded-r-sm pr-1",
                      wordIndex < comparedWords.length - 1 && "mr-1",
                      word.isNew && "bg-green-300 px-1 mx-0",
                    )}
                  >
                    {word.isBold ? (
                      <strong>{word.text}</strong>
                    ) : (
                      word.text
                    )}
                  </span>
                ))}
              </p>
            </div>
          );
        })}
      </div>
      {project.technologies && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {project.technologies.map((tech, index) => (
            <span
              key={index}
              className={cn(
                "px-2 py-0.5 text-xs rounded-full border text-gray-700",
                !currentProject || isNewItem(currentProject.technologies, project.technologies, tech)
                  ? DIFF_HIGHLIGHT_CLASSES
                  : "bg-gray-100/80 border-gray-200/60"
              )}
            >
              {tech.replace(/\*\*/g, '')}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

interface SkillSuggestionProps {
  content: Skill;
  currentContent: Skill | null;
}

function SkillSuggestion({ content: skill, currentContent: currentSkill }: SkillSuggestionProps) {
  return (
    <div className="space-y-3">
      {/* Category Header */}
      <div className="flex-1">
        <Tiptap
          content={skill.category}
          onChange={() => {}}
          readOnly={true}
          variant="skill"
          className={cn(
            "text-sm font-semibold tracking-wide",
            "bg-transparent",
            "border-none shadow-none",
            !currentSkill || currentSkill.category !== skill.category && "bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-700 px-2 py-1 rounded-md"
          )}
        />
      </div>

      {/* Skills Grid */}
      <div className="flex flex-wrap gap-2">
        {skill.items.map((item, index) => {
          const isNew = !currentSkill || isNewItem(currentSkill.items, skill.items, item);
          
          return (
            <div
              key={index}
              className={cn(
                "relative group transition-all duration-500",
                "rounded-lg overflow-hidden",
                isNew ? [
                  "bg-gradient-to-br from-emerald-50 via-teal-50 to-emerald-50",
                  "border border-emerald-200",
                  "shadow-sm shadow-emerald-100",
                ] : [
                  "bg-gradient-to-br from-gray-50 via-white to-gray-50",
                  "border border-gray-200/60",
                  "shadow-sm",
                ],
                "hover:-translate-y-0.5 hover:shadow-md",
                "transition-all duration-500 ease-in-out"
              )}
            >
              {/* Animated Background Gradient */}
              <div className={cn(
                "absolute inset-0 opacity-0 transition-opacity duration-500",
                "group-hover:opacity-100",
                isNew 
                  ? "bg-gradient-to-br from-emerald-100/50 via-teal-100/50 to-emerald-100/50"
                  : "bg-gradient-to-br from-gray-100/50 via-white to-gray-100/50"
              )} />

              {/* Skill Content */}
              <div className="relative px-3 py-1.5">
                <Tiptap
                  content={item}
                  onChange={() => {}}
                  readOnly={true}
                  variant="skill"
                  className={cn(
                    "border-none shadow-none p-0",
                    "text-sm",
                    "bg-transparent",
                    isNew ? "text-emerald-700" : "text-gray-700"
                  )}
                />
              </div>

              {/* New Indicator */}
              {isNew && (
                <div className="absolute -top-1 -right-1">
                  <div className="relative flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-20"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500/10"></span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface EducationSuggestionProps {
  content: Education;
  currentContent: Education | null;
}

function EducationSuggestion({ content: education, currentContent: currentEducation }: EducationSuggestionProps) {
  return (
    <div className="space-y-2 w-full">
      <div className="flex justify-between items-start">
        <div>
          <h3 className={cn(
            "font-medium text-gray-900",
            !currentEducation || (currentEducation.degree !== education.degree || currentEducation.field !== education.field) && DIFF_HIGHLIGHT_CLASSES
          )}>
            <span>
              {education.degree.split(/(\*\*.*?\*\*)/).map((part, i) => 
                part.startsWith('**') && part.endsWith('**') ? 
                  <strong key={i}>{part.slice(2, -2)}</strong> : 
                  part
              )}
            </span>
            {' in '}
            <span>
              {education.field.split(/(\*\*.*?\*\*)/).map((part, i) => 
                part.startsWith('**') && part.endsWith('**') ? 
                  <strong key={i}>{part.slice(2, -2)}</strong> : 
                  part
              )}
            </span>
          </h3>
          <p className={cn(
            "text-sm text-gray-700",
            !currentEducation || currentEducation.school !== education.school && DIFF_HIGHLIGHT_CLASSES
          )}>
            {education.school.replace(/\*\*/g, '')}
          </p>
        </div>
        <span className={cn(
          "text-xs text-gray-600",
          !currentEducation || currentEducation.date !== education.date && DIFF_HIGHLIGHT_CLASSES
        )}>
          {education.date.replace(/\*\*/g, '')}
        </span>
      </div>
      {education.achievements && (
        <div className="space-y-1.5">
          {education.achievements.map((achievement, index) => {
            const currentAchievement = currentEducation?.achievements?.[index];
            const comparedWords = currentAchievement 
              ? compareDescriptions(currentAchievement, achievement)
              : [{ text: achievement.replace(/\*\*/g, ''), isNew: true, isBold: false, isStart: true, isEnd: true }];

            return (
              <div key={index} className="flex items-start gap-1.5">
                <span className="text-gray-800 mt-0.5 text-xs">•</span>
                <p className="text-xs text-gray-800 flex-1 flex flex-wrap">
                  {comparedWords.map((word, wordIndex) => (
                    <span
                      key={wordIndex}
                      className={cn(
                        "inline-flex items-center",
                        word.isNew && "bg-green-300",
                        word.isStart && "rounded-l-sm pl-1",
                        word.isEnd && "rounded-r-sm pr-1",
                        wordIndex < comparedWords.length - 1 && "mr-1",
                        word.isNew && "bg-green-300 px-1 mx-0",
                      )}
                    >
                      {word.isBold ? (
                        <strong>{word.text}</strong>
                      ) : (
                        word.text
                      )}
                    </span>
                  ))}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function compareDescriptions(current: string, suggested: string): {
  text: string;
  isNew: boolean;
  isBold: boolean;
  isStart: boolean;
  isEnd: boolean;
}[] {
  // Clean the text by normalizing spaces and removing extra whitespace
  const cleanText = (text: string): string => {
    return text.trim().replace(/\s+/g, ' ');
  };

  // Split text into words, preserving bold markdown
  const splitText = (text: string): string[] => {
    // First, split by bold markdown
    const parts = text.split(/(\*\*[^*]+\*\*)/).filter(Boolean);
    
    // Then split non-bold parts by spaces while preserving bold parts
    return parts.flatMap(part => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return [part];
      }
      return part.split(/\s+/).filter(Boolean);
    });
  };

  const currentText = cleanText(current);
  const suggestedText = cleanText(suggested);
  
  const currentWords = splitText(currentText);
  const suggestedWords = splitText(suggestedText);
  
  return suggestedWords.map((word, index) => {
    const isBold = word.startsWith('**') && word.endsWith('**');
    const cleanedWord = isBold ? word.slice(2, -2) : word;
    
    // Check if the word exists in current text (considering bold status)
    const isNew = !currentWords.some(currentWord => {
      const currentIsBold = currentWord.startsWith('**') && currentWord.endsWith('**');
      const currentCleaned = currentIsBold ? currentWord.slice(2, -2) : currentWord;
      return currentCleaned === cleanedWord;
    });
    
    // Check if adjacent words are new
    const prevWord = index > 0 ? suggestedWords[index - 1] : null;
    const nextWord = index < suggestedWords.length - 1 ? suggestedWords[index + 1] : null;
    
    const prevIsNew = prevWord ? !currentWords.includes(prevWord) : false;
    const nextIsNew = nextWord ? !currentWords.includes(nextWord) : false;
    
    return {
      text: cleanedWord,
      isNew,
      isBold,
      isStart: isNew && !prevIsNew,
      isEnd: isNew && !nextIsNew
    };
  });
}
  

function isNewItem<T>(current: T[] | undefined, suggested: T[] | undefined, item: T): boolean {
  if (!current) return true;
  return !current.includes(item);
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
