'use client';

import type { KeyboardEvent } from 'react';
import type { Project } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import type { ProjectAIState } from './use-project-ai';

export interface ProjectCardActions {
  updateField: (field: keyof Project, value: Project[keyof Project]) => void;
  remove: () => void;
  move: (direction: -1 | 1) => void;
  addPoint: () => void;
  updatePoint: (pointIndex: number, value: string) => void;
  deletePoint: (pointIndex: number) => void;
  addTechnology: () => void;
  removeTechnology: (techIndex: number) => void;
  techDraft: string;
  onTechDraftChange: (value: string) => void;
  onTechKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
}

interface ProjectCardProps {
  project: Project;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  actions: ProjectCardActions;
  ai: ProjectAIState;
}

/**
 * One project entry. Purely presentational: list mutations and AI calls are
 * supplied by ProjectsForm so the card has no direct knowledge of the parent
 * state shape.
 */
export function ProjectCard({ project, index, isFirst, isLast, actions, ai }: ProjectCardProps) {
  const isProcessingPoint = (pointIndex: number) => Boolean(ai.loadingPointAI[index]?.[pointIndex]);
  const improvedPoint = (pointIndex: number) => ai.improvedPoints[index]?.[pointIndex];

  return (
    <Card
      className={cn(
        "relative group transition-all duration-300",
        "bg-gradient-to-r from-violet-500/5 via-violet-500/10 to-purple-500/5",
        "backdrop-blur-md border-2 border-violet-500/30",
        "shadow-sm"
      )}
    >
      <div className="absolute -left-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="bg-violet-100/80 rounded-lg p-1.5 cursor-move shadow-sm">
          <GripVertical className="h-4 w-4 text-violet-600" />
        </div>
      </div>

      <CardContent className="p-3 sm:p-4 space-y-3 sm:space-y-4">
        {/* Header with Delete Button */}
        <div className="space-y-2 sm:space-y-3">
          {/* Project Name - Full Width */}
          <div className="flex items-start gap-2 sm:gap-3">
            <div className="relative flex-1">
              <Input
                value={project.name}
                onChange={(e) => actions.updateField('name', e.target.value)}
                className={cn(
                  "text-sm font-semibold tracking-tight h-9",
                  "bg-white/50 border-gray-200 rounded-lg",
                  "focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/20",
                  "hover:border-violet-500/30 hover:bg-white/60 transition-colors",
                  "placeholder:text-gray-400"
                )}
                placeholder="Project Name"
              />
              <div className="absolute -top-2 left-2 px-1 bg-white/80 text-[7px] sm:text-[9px] font-medium text-violet-700">
                PROJECT NAME
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

          {/* URLs Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
            <div className="relative">
              <Input
                value={project.url || ''}
                onChange={(e) => actions.updateField('url', e.target.value)}
                className={cn(
                  "text-sm font-medium bg-white/50 border-gray-200 rounded-lg h-9",
                  "focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/20",
                  "hover:border-violet-500/30 hover:bg-white/60 transition-colors",
                  "placeholder:text-gray-400"
                )}
                placeholder="Live URL"
              />
              <div className="absolute -top-2 left-2 px-1 bg-white/80 text-[7px] sm:text-[9px] font-medium text-violet-700">
                LIVE URL
              </div>
            </div>
            <div className="relative">
              <Input
                value={project.github_url || ''}
                onChange={(e) => actions.updateField('github_url', e.target.value)}
                className={cn(
                  "h-9 bg-white/50 border-gray-200 rounded-lg",
                  "focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/20",
                  "hover:border-violet-500/30 hover:bg-white/60 transition-colors",
                  "placeholder:text-gray-400"
                )}
                placeholder="GitHub URL"
              />
              <div className="absolute -top-2 left-2 px-1 bg-white/80 text-[7px] sm:text-[9px] font-medium text-violet-700">
                GITHUB URL
              </div>
            </div>
          </div>

          {/* Date */}
          <div className="relative group">
            <Input
              type="text"
              value={project.date || ''}
              onChange={(e) => actions.updateField('date', e.target.value)}
              className={cn(
                "w-full bg-white/50 border-gray-200 rounded-lg h-9",
                "focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/20",
                "hover:border-violet-500/30 hover:bg-white/60 transition-colors"
              )}
              placeholder="e.g., &apos;Jan 2023 - Present&apos; or &apos;2020 - 2022&apos;"
            />
            <div className="absolute -top-2 left-2 px-1 bg-white/80 text-[7px] sm:text-[9px] font-medium text-violet-700">
              DATE
            </div>
          </div>

          {/* Description Section */}
          <div className="space-y-2 sm:space-y-3">
            <Label className="text-[10px] sm:text-xs font-medium text-violet-700">
              Key Features & Technical Achievements
            </Label>
            <div className="space-y-2 pl-0">
              {project.description.map((desc, descIndex) => (
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
                        "focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/20",
                        "hover:border-violet-500/30 hover:bg-white/60 transition-colors",
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
                          onClick={() => {
                            // Remove the improvement state after accepting
                            ai.clearImprovement(index, descIndex);
                          }}
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

              {project.description.length === 0 && !ai.aiSuggestions[index]?.length && (
                <div className="text-[10px] sm:text-xs text-gray-500 italic px-4 py-3 bg-gray-50/50 rounded-lg">
                  Add points to describe your project&apos;s features and achievements
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full">
              <Button
                variant="outline"
                size="sm"
                onClick={actions.addPoint}
                className={cn(
                  "flex-1 text-violet-600 hover:text-violet-700 transition-colors text-[10px] sm:text-xs",
                  "border-violet-200 hover:border-violet-300 hover:bg-violet-50/50"
                )}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Point
              </Button>

              <AIGenerationSettingsTooltip
                index={index}
                loadingAI={ai.loadingAI[index]}
                generateAIPoints={ai.generateAIPoints}
                aiConfig={ai.aiConfig[index] || { numPoints: 3, customPrompt: '' }}
                onNumPointsChange={(value) => ai.setNumPoints(index, value)}
                onCustomPromptChange={(value) => ai.setCustomPrompt(index, value)}
                colorClass={{
                  button: "text-violet-600",
                  border: "border-violet-200",
                  hoverBorder: "hover:border-violet-300",
                  hoverBg: "hover:bg-violet-50/50",
                  tooltipBg: "bg-violet-50",
                  tooltipBorder: "border-2 border-violet-300",
                  tooltipShadow: "shadow-lg shadow-violet-100/50",
                  text: "text-violet-600",
                  hoverText: "hover:text-violet-700"
                }}
              />
            </div>
          </div>

          {/* Technologies Section */}
          <div className="space-y-2 sm:space-y-3">
            <Label className="text-[10px] sm:text-xs font-medium text-violet-700">
              Technologies & Tools Used
            </Label>

            <div className="space-y-2">
              {/* Technologies Display */}
              <div className="flex flex-wrap gap-1.5">
                {(project.technologies || []).map((tech, techIndex) => (
                  <Badge
                    key={techIndex}
                    variant="secondary"
                    className={cn(
                      "bg-white/60 hover:bg-white/80 text-violet-700 border border-violet-200 py-0.5",
                      "transition-all duration-300 group/badge cursor-default text-[10px] sm:text-xs"
                    )}
                  >
                    {tech}
                    <button
                      onClick={() => actions.removeTechnology(techIndex)}
                      className="ml-1.5 hover:text-red-500 opacity-50 hover:opacity-100 transition-opacity"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>

              {/* New Technology Input */}
              <div className="relative group flex gap-2">
                <Input
                  value={actions.techDraft}
                  onChange={(e) => actions.onTechDraftChange(e.target.value)}
                  onKeyDown={actions.onTechKeyDown}
                  className={cn(
                    "h-9 bg-white/50 border-gray-200 rounded-lg",
                    "focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/20",
                    "hover:border-violet-500/30 hover:bg-white/60 transition-colors",
                    "placeholder:text-gray-400",
                    "text-[10px] sm:text-xs"
                  )}
                  placeholder="Type a technology and press Enter or click +"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={actions.addTechnology}
                  className="h-9 px-2 bg-white/50 hover:bg-white/60"
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <div className="absolute -top-2 left-2 px-1 bg-white/80 text-[7px] sm:text-[9px] font-medium text-violet-700">
                  ADD TECHNOLOGY
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => actions.move(-1)}
                disabled={isFirst}
                className={cn(
                  "h-6 w-8 text-violet-700 hover:text-violet-800",
                  "bg-white/70 hover:bg-white",
                  "border border-violet-200/70",
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
                  "h-6 w-8 text-violet-700 hover:text-violet-800",
                  "bg-white/70 hover:bg-white",
                  "border border-violet-200/70",
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
