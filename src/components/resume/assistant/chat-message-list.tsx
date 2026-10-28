'use client';

import React from 'react';
import { Message, ToolInvocation } from 'ai';
import { Education, Project, Resume, Skill, WorkExperience } from '@/lib/types';
import { cn } from '@/lib/utils';
import { MemoizedMarkdown } from '@/components/ui/memoized-markdown';
import { Suggestion, WholeResumeSuggestion } from './suggestions';
import { SuggestionSkeleton } from './suggestion-skeleton';
import { LoadingDots } from '@/components/ui/loading-dots';
import { Textarea } from '@/components/ui/textarea';
import { Pencil, Trash2 } from 'lucide-react';
import type { RewriteMode } from '@/app/eleva/api/tool/rewrite/rewrite-utils';
import { QuickSuggestions } from './quick-suggestions';

interface ChatMessageListProps {
  messages: Message[];
  resume: Resume;
  onResumeChange: (field: keyof Resume, value: Resume[typeof field]) => void;
  editingMessageId: string | null;
  editContent: string;
  setEditContent: (value: string) => void;
  handleDelete: (id: string) => void;
  handleEdit: (id: string, content: string) => void;
  handleSaveEdit: (id: string) => void;
  originalResume: Resume | null;
  setOriginalResume: (resume: Resume | null) => void;
  handleModeRewrite: (toolName: string, args: unknown, mode: RewriteMode) => void;
  isInitialLoading: boolean;
  isLoading: boolean;
  onSubmit: (message: string) => void;
}

export function ChatMessageList({
  messages, resume, onResumeChange, editingMessageId, editContent, setEditContent,
  handleDelete, handleEdit, handleSaveEdit, originalResume, setOriginalResume,
  handleModeRewrite, isInitialLoading, isLoading, onSubmit,
}: ChatMessageListProps) {
  const handleSubmit = onSubmit;
  return (
    <>
                {messages.length === 0 ? (
                  <QuickSuggestions onSuggestionClick={handleSubmit} />
                ) : (
                  <>
                    {/* Messages */}
                    {messages.map((m: Message, index) => (
                      <React.Fragment key={index}>

                        {/* Regular Message Content */}
                        {m.content && (
                          <div className="my-2">
                            <div className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                              <div className={cn(
                                "rounded-2xl px-4 py-2 max-w-[90%] text-sm relative group items-center",
                                m.role === 'user' ? [
                                  "bg-gradient-to-br from-purple-500 to-indigo-500",
                                  "text-white",
                                  "shadow-md shadow-purple-500/10",
                                  "ml-auto pb-0 text-white"
                                ] : [
                                  "bg-white/60",
                                  "border border-purple-200/60",
                                  "shadow-sm",
                                  "backdrop-blur-sm pb-0"
                                ]
                              )}>

                                {/* Edit Message */}
                                {editingMessageId === m.id ? (
                                  <div className="flex flex-col gap-2">
                                    <Textarea
                                      value={editContent}
                                      onChange={(e) => setEditContent(e.target.value)}
                                      className={cn(
                                        "w-full min-h-[100px] p-2 rounded-lg",
                                        "bg-white/80 backdrop-blur-sm",
                                        m.role === 'user'
                                          ? "text-purple-900 placeholder-purple-400"
                                          : "text-gray-900 placeholder-gray-400",
                                        "border border-purple-200/60 focus:border-purple-400/60",
                                        "focus:outline-none focus:ring-1 focus:ring-purple-400/60"
                                      )}
                                    />
                                    <button
                                      onClick={() => handleSaveEdit(m.id)}
                                      className={cn(
                                        "self-end px-3 py-1 rounded-lg text-xs",
                                        "bg-purple-500 text-white",
                                        "hover:bg-purple-600",
                                        "transition-colors duration-200"
                                      )}
                                    >
                                      Save
                                    </button>
                                  </div>
                                ) : (
                                  <MemoizedMarkdown id={m.id} content={m.content} />
                                )}

                                {/* Message Actions */}
                                <div className="absolute -bottom-4 left-2 flex gap-2">
                                  <button
                                    onClick={() => handleDelete(m.id)}
                                    className={cn(
                                      "transition-colors duration-200",
                                      m.role === 'user'
                                        ? "text-purple-500/60 hover:text-purple-600"
                                        : "text-purple-400/60 hover:text-purple-500",
                                    )}
                                    aria-label="Delete message"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                  <button
                                    onClick={() => handleEdit(m.id, m.content)}
                                    className={cn(
                                      "transition-colors duration-200",
                                      m.role === 'user'
                                        ? "text-purple-500/60 hover:text-purple-600"
                                        : "text-purple-400/60 hover:text-purple-500",
                                    )}
                                    aria-label="Edit message"
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Tool Invocations as Separate Bubbles */}
                        {m.toolInvocations?.map((toolInvocation: ToolInvocation) => {
                          const { toolName, toolCallId, state, args } = toolInvocation;
                          switch (state) {
                            case 'partial-call':
                            case 'call':
                              return (
                                <div key={toolCallId} className="mt-2 max-w-[90%]">
                                  <div className="flex justify-start max-w-[90%]">
                                    {toolName === 'getResume' ? (
                                      <div className={cn(
                                        "rounded-2xl px-4 py-2 max-w-[90%] text-sm",
                                        "bg-white/60 border border-purple-200/60",
                                        "shadow-sm backdrop-blur-sm"
                                      )}>
                                        Reading Resume...
                                      </div>
                                    ) : toolName === 'modifyWholeResume' ? (
                                      <div className={cn(
                                        "w-full rounded-2xl px-4 py-2",
                                        "bg-white/60 border border-purple-200/60",
                                        "shadow-sm backdrop-blur-sm"
                                      )}>
                                        Preparing resume modifications...
                                      </div>
                                    ) : toolName.startsWith('suggest_') ? (
                                      <SuggestionSkeleton />
                                    ) : null}
                                    {toolName === 'displayWeather' ? (
                                      <div>Loading weather...</div>
                                    ) : null}
                                  </div>
                                </div>
                              );

                            case 'result':
                              // `getResume` has no entry in toolConfig, so handle its
                              // completed bubble before the config lookup below.
                              if (toolName === 'getResume') {
                                return (
                                  <div key={toolCallId} className="mt-2 w-[90%]">
                                    <div className="flex justify-start">
                                      <div className={cn(
                                        "rounded-2xl px-4 py-2 max-w-[90%] text-sm",
                                        "bg-white/60 border border-purple-200/60",
                                        "shadow-sm backdrop-blur-sm"
                                      )}>
                                        <p>Read Resume ({args.sections?.join(', ') || 'all'}) ✅</p>
                                      </div>
                                    </div>
                                  </div>
                                );
                              }

                              // Map tool names to resume sections and handle suggestions
                              const toolConfig = {
                                suggest_work_experience_improvement: {
                                  type: 'work_experience' as const,
                                  field: 'work_experience',
                                  content: 'improved_experience',
                                },
                                suggest_project_improvement: {
                                  type: 'project' as const,
                                  field: 'projects',
                                  content: 'improved_project',
                                },
                                suggest_skill_improvement: {
                                  type: 'skill' as const,
                                  field: 'skills',
                                  content: 'improved_skill',
                                },
                                suggest_education_improvement: {
                                  type: 'education' as const,
                                  field: 'education',
                                  content: 'improved_education',
                                },
                                modifyWholeResume: {
                                  type: 'whole_resume' as const,
                                  field: 'all',
                                  content: null,
                                },
                              } as const;
                              const config = toolConfig[toolName as keyof typeof toolConfig];

                              if (!config) return null;

                              if (config.type === 'whole_resume') {
                                return (
                                  <div key={toolCallId} className="mt-2 w-[90%]">
                                    <WholeResumeSuggestion
                                      onReject={() => {
                                        if (originalResume) {
                                          Object.keys(originalResume).forEach((key) => {
                                            if (key !== 'id' && key !== 'created_at' && key !== 'updated_at') {
                                              onResumeChange(key as keyof Resume, originalResume[key as keyof Resume]);
                                            }
                                          });
                                          setOriginalResume(null);
                                        }
                                      }}
                                    />
                                  </div>
                                );
                              }

                              return (
                                <div key={toolCallId} className="mt-2 w-[90%]">
                                  <div className="">
                                    <Suggestion
                                      type={config.type}
                                      content={args[config.content]}
                                      currentContent={resume[config.field][args.index]}
                                      onModeRewrite={(mode) => handleModeRewrite(toolName, args, mode as RewriteMode)}
                                      onAccept={() => onResumeChange(config.field,
                                        resume[config.field].map((item: WorkExperience | Education | Project | Skill, i: number) =>
                                          i === args.index ? args[config.content] : item
                                        )
                                      )}
                                      onReject={() => {}}
                                    />
                                  </div>
                                </div>
                              );

                            default:
                              return null;
                          }
                        })}


                        {/* Loading Dots Message - Modified condition */}
                        {((isInitialLoading && index === messages.length - 1 && m.role === 'user') ||
                          (isLoading && index === messages.length - 1 && m.role === 'assistant')) && (
                          <div className="mt-2">
                            <div className="flex justify-start">
                              <div className={cn(
                                "rounded-2xl px-4 py-2.5 min-w-[60px]",
                                "bg-white/60",
                                "border border-purple-200/60",
                                "shadow-sm",
                                "backdrop-blur-sm"
                              )}>
                                <LoadingDots className="text-purple-600" />
                              </div>
                            </div>
                          </div>
                        )}
                      </React.Fragment>
                    ))}
                  </>
                )}
    </>
  );
}
