'use client';

import type { WorkExperience } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import Tiptap from '@/components/ui/tiptap';
import { cn } from '@/lib/utils';
import {
  Check,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';
import { AISuggestions } from '../../../shared/ai-suggestions';
import { AIImprovementPrompt } from '../../../shared/ai-improvement-prompt';
import { AIGenerationSettingsTooltip } from '../../components/ai-generation-tooltip';
import type { WorkExperienceAIState } from './use-work-experience-ai';

export interface WorkExperienceCardActions {
  updateField: (field: keyof WorkExperience, value: string | string[]) => void;
  remove: () => void;
  move: (direction: -1 | 1) => void;
  addPoint: () => void;
  updatePoint: (pointIndex: number, value: string) => void;
  deletePoint: (pointIndex: number) => void;
}

interface WorkExperienceCardProps {
  experience: WorkExperience;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  actions: WorkExperienceCardActions;
  ai: WorkExperienceAIState;
}

/**
 * One work-experience entry. Purely presentational: list mutations and AI
 * calls are supplied by WorkExperienceForm.
 */
export function WorkExperienceCard({
  experience,
  index,
  isFirst,
  isLast,
  actions,
  ai,
}: WorkExperienceCardProps) {
  const isProcessingPoint = (pointIndex: number) =>
    Boolean(ai.loadingPointAI[index]?.[pointIndex]);
  const improvedPoint = (pointIndex: number) => ai.improvedPoints[index]?.[pointIndex];

  return (
    <Card
      className={cn(
        "relative group transition-all duration-300",
        "bg-gradient-to-r from-cyan-500/5 via-cyan-500/10 to-blue-500/5",
        "backdrop-blur-md border-2 border-cyan-500/30",
        "shadow-sm"
      )}
    >
      <div className="absolute -left-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="bg-cyan-100/80 rounded-lg p-1.5 cursor-move shadow-sm">
          <GripVertical className="h-4 w-4 text-cyan-600" />
        </div>
      </div>

      <CardContent className="p-3 sm:p-4 space-y-3 sm:space-y-4">
        {/* Header with Delete Button */}
        <div className="space-y-2 sm:space-y-3">
          {/* Position Title - Full Width */}
          <div className="flex items-start gap-2 sm:gap-3">
            <div className="relative flex-1">
              <Input
                value={experience.position}
                onChange={(e) => actions.updateField('position', e.target.value)}
                className={cn(
                  "text-sm font-semibold tracking-tight h-9",
                  "bg-white/50 border-gray-200 rounded-lg",
                  "focus:border-cyan-500/40 focus:ring-2 focus:ring-cyan-500/20",
                  "hover:border-cyan-500/30 hover:bg-white/60 transition-colors",
                  "placeholder:text-gray-400"
                )}
                placeholder="Position Title"
              />
              <div className="absolute -top-2 left-2 px-1 bg-white/80 text-[7px] sm:text-[9px] font-medium text-gray-500">
                POSITION
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={actions.remove}
              className="text-gray-400 hover:text-red-500 transition-colors duration-300"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          {/* Company and Location Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
            <div className="relative">
              <Input
                value={experience.company}
                onChange={(e) => actions.updateField('company', e.target.value)}
                className={cn(
                  "text-sm font-medium bg-white/50 border-gray-200 rounded-lg h-9",
                  "focus:border-cyan-500/40 focus:ring-2 focus:ring-cyan-500/20",
                  "hover:border-cyan-500/30 hover:bg-white/60 transition-colors",
                  "placeholder:text-gray-400"
                )}
                placeholder="Company Name"
              />
              <div className="absolute -top-2 left-2 px-1 bg-white/80 text-[7px] sm:text-[9px] font-medium text-gray-500">
                COMPANY
              </div>
            </div>
            <div className="relative">
              <Input
                value={experience.location}
                onChange={(e) => actions.updateField('location', e.target.value)}
                className={cn(
                  "bg-white/50 border-gray-200 rounded-lg h-9",
                  "focus:border-cyan-500/40 focus:ring-2 focus:ring-cyan-500/20",
                  "hover:border-cyan-500/30 hover:bg-white/60 transition-colors",
                  "placeholder:text-gray-400"
                )}
                placeholder="Location"
              />
              <div className="absolute -top-2 left-2 px-1 bg-white/80 text-[7px] sm:text-[9px] font-medium text-gray-500">
                LOCATION
              </div>
            </div>
          </div>

          {/* Dates Row */}
          <div className="relative group">
            <Input
              type="text"
              value={experience.date}
              onChange={(e) => actions.updateField('date', e.target.value)}
              className={cn(
                "w-full bg-white/50 border-gray-200 rounded-lg h-9",
                "focus:border-cyan-500/40 focus:ring-2 focus:ring-cyan-500/20",
                "hover:border-cyan-500/30 hover:bg-white/60 transition-colors"
              )}
              placeholder="e.g., &apos;Jan 2023 - Present&apos; or &apos;2020 - 2022&apos;"
            />
            <div className="absolute -top-2 left-2 px-1 bg-white/80 text-[7px] sm:text-[9px] font-medium text-gray-500">
              DATE
            </div>
            <span className="ml-2 text-[8px] sm:text-[10px] text-gray-500">
              Use &apos;Present&apos; in the date field for current positions
            </span>
          </div>

          {/* Description Section */}
          <div className="space-y-3">
            <Label className="text-[11px] md:text-xs font-medium text-gray-600">
              Key Responsibilities & Achievements
            </Label>
            <div className="space-y-2 pl-0">
              {experience.description.map((desc, descIndex) => (
                <div key={descIndex} className="flex gap-1 items-start group/item">
                  <div className="flex-1">
                    <Tiptap
                      content={desc}
                      onChange={(newContent) => {
                        actions.updatePoint(descIndex, newContent);

                        if (improvedPoint(descIndex)) {
                          ai.clearImprovement(index, descIndex);
                        }
                      }}
                      className={cn(
                        "min-h-[60px] text-xs md:text-sm bg-white/50 border-gray-200 rounded-lg",
                        "focus:border-cyan-500/40 focus:ring-2 focus:ring-cyan-500/20",
                        "hover:border-cyan-500/30 hover:bg-white/60 transition-colors",
                        "placeholder:text-gray-400",
                        improvedPoint(descIndex) && [
                          "border-purple-400",
                          "bg-gradient-to-r from-purple-50/80 to-indigo-50/80",
                          "shadow-[0_0_15px_-3px_rgba(168,85,247,0.2)]",
                          "hover:bg-gradient-to-r hover:from-purple-50/90 hover:to-indigo-50/90"
                        ]
                      )}
                    />

                    {improvedPoint(descIndex) && (
                      <div className="absolute -top-2.5 right-12 px-2 py-0.5 bg-purple-100 rounded-full">
                        <span className="text-[10px] font-medium text-purple-600 flex items-center gap-1">
                          <Sparkles className="h-3 w-3" />
                          AI Suggestion
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    {improvedPoint(descIndex) ? (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => ai.clearImprovement(index, descIndex)}
                          className={cn(
                            "p-0 group-hover/item:opacity-100",
                            "h-8 w-8 rounded-lg",
                            "bg-green-50/80 hover:bg-green-100/80",
                            "text-green-600 hover:text-green-700",
                            "border border-green-200/60",
                            "shadow-sm",
                            "transition-all duration-300",
                            "hover:scale-105 hover:shadow-md",
                            "hover:-translate-y-0.5"
                          )}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => ai.undoImprovement(index, descIndex)}
                          className={cn(
                            "p-0 group-hover/item:opacity-100",
                            "h-8 w-8 rounded-lg",
                            "bg-rose-50/80 hover:bg-rose-100/80",
                            "text-rose-600 hover:text-rose-700",
                            "border border-rose-200/60",
                            "shadow-sm",
                            "transition-all duration-300",
                            "hover:scale-105 hover:shadow-md",
                            "hover:-translate-y-0.5"
                          )}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => actions.deletePoint(descIndex)}
                          className="p-0 group-hover/item:opacity-100 text-gray-400 hover:text-red-500 transition-all duration-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>

                        {/* AI IMPROVEMENT */}
                        <TooltipProvider delayDuration={0}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => ai.rewritePoint(index, descIndex)}
                                disabled={isProcessingPoint(descIndex)}
                                className={cn(
                                  "p-0 group-hover/item:opacity-100",
                                  "h-8 w-8 rounded-lg",
                                  "bg-purple-50/80 hover:bg-purple-100/80",
                                  "text-purple-600 hover:text-purple-700",
                                  "border border-purple-200/60",
                                  "shadow-sm",
                                  "transition-all duration-300",
                                  "hover:scale-105 hover:shadow-md",
                                  "hover:-translate-y-0.5"
                                )}
                              >
                                {isProcessingPoint(descIndex) ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Sparkles className="h-4 w-4" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent
                              side="bottom"
                              align="start"
                              sideOffset={2}
                              className={cn(
                                "w-72 p-3.5",
                                "bg-purple-50",
                                "border-2 border-purple-300",
                                "shadow-lg shadow-purple-100/50",
                                "rounded-lg"
                              )}
                            >
                              <AIImprovementPrompt
                                value={ai.improvementConfig[index]?.[descIndex] || ''}
                                onChange={(value) => ai.setImprovementPrompt(index, descIndex, value)}
                                onSubmit={() => ai.rewritePoint(index, descIndex)}
                                isLoading={isProcessingPoint(descIndex)}
                              />
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </>
                    )}
                  </div>
                </div>
              ))}

              {/* AI Suggestions */}
              <AISuggestions
                suggestions={ai.aiSuggestions[index] || []}
                onApprove={(suggestion) => ai.approveSuggestion(index, suggestion)}
                onDelete={(suggestionId) => ai.deleteSuggestion(index, suggestionId)}
              />

              {experience.description.length === 0 && !ai.aiSuggestions[index]?.length && (
                <div className="text-[11px] md:text-xs text-gray-500 italic px-4 py-3 bg-gray-50/50 rounded-lg">
                  Add points to describe your responsibilities and achievements
                </div>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full">
              <Button
                variant="outline"
                size="sm"
                onClick={actions.addPoint}
                className={cn(
                  "flex-1 text-cyan-600 hover:text-cyan-700 transition-colors text-[10px] sm:text-xs",
                  "border-cyan-200 hover:border-cyan-300 hover:bg-cyan-50/50"
                )}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Point
              </Button>

              {/* AI GENERATION SETTINGS */}
              <AIGenerationSettingsTooltip
                index={index}
                loadingAI={ai.loadingAI[index]}
                generateAIPoints={ai.generateAIPoints}
                aiConfig={ai.aiConfig[index] || { numPoints: 3, customPrompt: '' }}
                onNumPointsChange={(value) => ai.setNumPoints(index, value)}
                onCustomPromptChange={(value) => ai.setCustomPrompt(index, value)}
                colorClass={{
                  button: "text-purple-600",
                  border: "border-purple-200",
                  hoverBorder: "hover:border-purple-300",
                  hoverBg: "hover:bg-purple-50/50",
                  tooltipBg: "bg-purple-50",
                  tooltipBorder: "border-2 border-purple-300",
                  tooltipShadow: "shadow-lg shadow-purple-100/50",
                  text: "text-purple-600",
                  hoverText: "hover:text-purple-700"
                }}
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => actions.move(-1)}
                disabled={isFirst}
                className={cn(
                  "h-6 w-8 text-cyan-700 hover:text-cyan-800",
                  "bg-white/70 hover:bg-white",
                  "border border-cyan-200/70",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => actions.move(1)}
                disabled={isLast}
                className={cn(
                  "h-6 w-8 text-cyan-700 hover:text-cyan-800",
                  "bg-white/70 hover:bg-white",
                  "border border-cyan-200/70",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
